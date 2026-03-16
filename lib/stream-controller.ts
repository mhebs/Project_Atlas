export type StreamChannelKind = "content" | "reasoning"
export type ChunkingMode = "smooth" | "catch_up"

export interface QueueSnapshot {
  queuedUnits: number
  oldestAgeMs: number | null
}

export interface ChannelStepResult {
  committedDelta: string
  liveTail: string
  didUpdate: boolean
}

export interface ActiveItemStepResult {
  content: ChannelStepResult
  reasoning: ChannelStepResult
  hasUpdates: boolean
  isIdle: boolean
}

export interface ActiveItemFinalizeResult {
  contentDelta: string
  reasoningDelta: string
}

export const STREAM_TICK_MS = 8

const SMOOTH_BATCH_UNITS = 1
const START_BUFFER_UNITS = 12
const START_BUFFER_HOLD_MS = 40
const ENTER_QUEUE_UNITS = 32
const ENTER_OLDEST_AGE_MS = 100
const EXIT_QUEUE_UNITS = 10
const EXIT_OLDEST_AGE_MS = 40
const EXIT_HOLD_MS = 200
const REENTER_HOLD_MS = 200
const SEVERE_QUEUE_UNITS = 240
const SEVERE_OLDEST_AGE_MS = 300

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null

interface QueueEntry {
  segments: string[]
  offset: number
  enqueuedAt: number
}

function splitGraphemes(text: string): string[] {
  if (!text) return []
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), (part) => part.segment)
  }
  return Array.from(text)
}

function catchUpBatchSize(queuedUnits: number): number {
  if (queuedUnits >= 240) return 8
  if (queuedUnits >= 120) return 6
  if (queuedUnits >= 60) return 4
  return 2
}

function shouldEnterCatchUp(snapshot: QueueSnapshot): boolean {
  return (
    snapshot.queuedUnits >= ENTER_QUEUE_UNITS ||
    (snapshot.oldestAgeMs ?? 0) >= ENTER_OLDEST_AGE_MS
  )
}

function shouldExitCatchUp(snapshot: QueueSnapshot): boolean {
  return (
    snapshot.queuedUnits <= EXIT_QUEUE_UNITS &&
    (snapshot.oldestAgeMs ?? 0) <= EXIT_OLDEST_AGE_MS
  )
}

function isSevereBacklog(snapshot: QueueSnapshot): boolean {
  return (
    snapshot.queuedUnits >= SEVERE_QUEUE_UNITS ||
    (snapshot.oldestAgeMs ?? 0) >= SEVERE_OLDEST_AGE_MS
  )
}

class AdaptiveChunkingPolicy {
  private mode: ChunkingMode = "smooth"
  private belowExitThresholdSince: number | null = null
  private lastCatchUpExitAt: number | null = null

  reset() {
    this.mode = "smooth"
    this.belowExitThresholdSince = null
    this.lastCatchUpExitAt = null
  }

  decide(snapshot: QueueSnapshot, now: number): { mode: ChunkingMode; batchSize: number } {
    if (snapshot.queuedUnits === 0) {
      if (this.mode === "catch_up") {
        this.lastCatchUpExitAt = now
      }
      this.mode = "smooth"
      this.belowExitThresholdSince = null
      return { mode: this.mode, batchSize: SMOOTH_BATCH_UNITS }
    }

    if (this.mode === "smooth") {
      const reentryHoldActive =
        this.lastCatchUpExitAt !== null && now - this.lastCatchUpExitAt < REENTER_HOLD_MS
      if (shouldEnterCatchUp(snapshot) && (!reentryHoldActive || isSevereBacklog(snapshot))) {
        this.mode = "catch_up"
        this.belowExitThresholdSince = null
        this.lastCatchUpExitAt = null
      }
    } else if (shouldExitCatchUp(snapshot)) {
      if (this.belowExitThresholdSince === null) {
        this.belowExitThresholdSince = now
      } else if (now - this.belowExitThresholdSince >= EXIT_HOLD_MS) {
        this.mode = "smooth"
        this.belowExitThresholdSince = null
        this.lastCatchUpExitAt = now
      }
    } else {
      this.belowExitThresholdSince = null
    }

    return {
      mode: this.mode,
      batchSize:
        this.mode === "smooth"
          ? SMOOTH_BATCH_UNITS
          : catchUpBatchSize(snapshot.queuedUnits),
    }
  }
}

class MarkdownStreamCollector {
  private buffer = ""
  private committedUpTo = 0

  pushDelta(delta: string) {
    if (!delta) return
    this.buffer += delta
  }

  commitCompleteLines(): string {
    const lastNewlineIndex = this.buffer.lastIndexOf("\n")
    if (lastNewlineIndex === -1) return ""

    const end = lastNewlineIndex + 1
    if (end <= this.committedUpTo) return ""

    const committed = this.buffer.slice(this.committedUpTo, end)
    this.committedUpTo = end
    return committed
  }

  liveTail(): string {
    return this.buffer.slice(this.committedUpTo)
  }

  finalizeAndDrain(): string {
    if (this.committedUpTo >= this.buffer.length) return ""
    const remainder = this.buffer.slice(this.committedUpTo)
    this.committedUpTo = this.buffer.length
    return remainder
  }
}

class StreamChannelController {
  private queue: QueueEntry[] = []
  private collector = new MarkdownStreamCollector()
  private readonly policy = new AdaptiveChunkingPolicy()
  private primed = false
  private startDeadlineMs: number | null = null

  enqueue(delta: string, now: number) {
    const segments = splitGraphemes(delta)
    if (segments.length === 0) return
    if (!this.primed && this.startDeadlineMs === null) {
      this.startDeadlineMs = now + START_BUFFER_HOLD_MS
    }
    this.queue.push({ segments, offset: 0, enqueuedAt: now })
  }

  isIdle(): boolean {
    return this.queuedUnits() === 0
  }

  liveTail(): string {
    return this.collector.liveTail()
  }

  step(now: number): ChannelStepResult {
    const snapshot = this.snapshot(now)
    if (snapshot.queuedUnits === 0) {
      this.policy.reset()
      return {
        committedDelta: "",
        liveTail: this.collector.liveTail(),
        didUpdate: false,
      }
    }

    if (
      !this.primed &&
      snapshot.queuedUnits < START_BUFFER_UNITS &&
      this.startDeadlineMs !== null &&
      now < this.startDeadlineMs
    ) {
      return {
        committedDelta: "",
        liveTail: this.collector.liveTail(),
        didUpdate: false,
      }
    }

    this.primed = true
    this.startDeadlineMs = null

    const decision = this.policy.decide(snapshot, now)
    const drained = this.dequeue(decision.batchSize)
    if (!drained) {
      return {
        committedDelta: "",
        liveTail: this.collector.liveTail(),
        didUpdate: false,
      }
    }

    this.collector.pushDelta(drained)
    const committedDelta = this.collector.commitCompleteLines()
    return {
      committedDelta,
      liveTail: this.collector.liveTail(),
      didUpdate: true,
    }
  }

  finalize(now: number): { flushedDelta: string; liveTail: string } {
    let drained = ""
    while (this.queuedUnits() > 0) {
      drained += this.dequeue(this.queuedUnits())
    }
    if (drained) {
      this.collector.pushDelta(drained)
    }
    const committedDelta = this.collector.commitCompleteLines()
    const remainder = this.collector.finalizeAndDrain()
    this.queue = []
    this.policy.reset()
    this.primed = false
    this.startDeadlineMs = null
    return {
      flushedDelta: `${committedDelta}${remainder}`,
      liveTail: this.collector.liveTail(),
    }
  }

  private snapshot(now: number): QueueSnapshot {
    const queuedUnits = this.queuedUnits()
    const oldestAgeMs = this.queue.length > 0 ? Math.max(0, now - this.queue[0].enqueuedAt) : null
    return { queuedUnits, oldestAgeMs }
  }

  private queuedUnits(): number {
    return this.queue.reduce((total, entry) => total + (entry.segments.length - entry.offset), 0)
  }

  private dequeue(maxUnits: number): string {
    let remaining = Math.max(1, maxUnits)
    let drained = ""

    while (remaining > 0 && this.queue.length > 0) {
      const entry = this.queue[0]
      const available = entry.segments.length - entry.offset
      const take = Math.min(remaining, available)
      drained += entry.segments.slice(entry.offset, entry.offset + take).join("")
      entry.offset += take
      remaining -= take

      if (entry.offset >= entry.segments.length) {
        this.queue.shift()
      }
    }

    return drained
  }
}

export class ActiveItemStreamController {
  private readonly channels: Record<StreamChannelKind, StreamChannelController> = {
    content: new StreamChannelController(),
    reasoning: new StreamChannelController(),
  }

  enqueue(kind: StreamChannelKind, delta: string, now = Date.now()) {
    this.channels[kind].enqueue(delta, now)
  }

  step(now = Date.now()): ActiveItemStepResult {
    const content = this.channels.content.step(now)
    const reasoning = this.channels.reasoning.step(now)
    return {
      content,
      reasoning,
      hasUpdates: content.didUpdate || reasoning.didUpdate,
      isIdle: this.isIdle(),
    }
  }

  finalize(now = Date.now()): ActiveItemFinalizeResult {
    const content = this.channels.content.finalize(now)
    const reasoning = this.channels.reasoning.finalize(now)
    return {
      contentDelta: content.flushedDelta,
      reasoningDelta: reasoning.flushedDelta,
    }
  }

  liveState(): { content: string; reasoning: string } {
    return {
      content: this.channels.content.liveTail(),
      reasoning: this.channels.reasoning.liveTail(),
    }
  }

  isIdle(): boolean {
    return this.channels.content.isIdle() && this.channels.reasoning.isIdle()
  }
}
