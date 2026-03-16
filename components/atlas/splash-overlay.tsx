"use client"

import { useState, useEffect, useRef } from "react"
import { Starfield, type Star } from "./starfield"

const STARS: Star[] = [
  { top: "8%", left: "12%", size: 2, opacity: 0.35, type: "dot" },
  { top: "14%", left: "32%", size: 3, opacity: 0.5, type: "dot" },
  { top: "22%", left: "72%", size: 2, opacity: 0.4, type: "dot" },
  { top: "35%", left: "88%", size: 2, opacity: 0.3, type: "dot" },
  { top: "55%", left: "8%", size: 3, opacity: 0.45, type: "dot" },
  { top: "68%", left: "52%", size: 2, opacity: 0.35, type: "dot" },
  { top: "78%", left: "85%", size: 2, opacity: 0.3, type: "dot" },
  { top: "45%", left: "18%", size: 2, opacity: 0.4, type: "dot" },
  { top: "82%", left: "28%", size: 3, opacity: 0.45, type: "dot" },
  { top: "12%", left: "20%", size: 6, opacity: 0.55, type: "diamond" },
  { top: "28%", left: "80%", size: 5, opacity: 0.4, type: "diamond" },
  { top: "65%", left: "10%", size: 5, opacity: 0.35, type: "diamond" },
  { top: "75%", left: "90%", size: 6, opacity: 0.45, type: "diamond" },
  { top: "5%", left: "50%", size: 5, opacity: 0.3, type: "diamond" },
]

function AtomCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = 260, H = 260
    const cx = W / 2, cy = H / 2

    const orbits = [
      { rx: 98, ry: 29, tiltZ: 0, speed: 0.72, phase: 0, eSize: 4.5 },
      { rx: 90, ry: 32, tiltZ: 60, speed: -0.55, phase: Math.PI * 0.6, eSize: 4 },
      { rx: 84, ry: 27, tiltZ: 120, speed: 0.88, phase: Math.PI * 1.2, eSize: 3.5 },
      { rx: 78, ry: 24, tiltZ: -50, speed: -0.65, phase: Math.PI * 1.7, eSize: 3.5 },
    ]

    const nucleusParticles = Array.from({ length: 14 }, (_, i) => ({
      angle: (i / 14) * Math.PI * 2,
      r: 4 + Math.random() * 9,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      size: 1.2 + Math.random() * 2,
    }))

    const dust = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 1.1,
      a: 0.07 + Math.random() * 0.16,
      speed: 0.004 + Math.random() * 0.007,
      phase: Math.random() * Math.PI * 2,
    }))

    const TRAIL_LEN = 30
    const trails: { x: number; y: number }[][] = orbits.map(() => [])

    function toRad(d: number) { return d * Math.PI / 180 }

    function electronPos(orbit: typeof orbits[0], t: number) {
      const a = t * orbit.speed + orbit.phase
      const cosZ = Math.cos(toRad(orbit.tiltZ))
      const sinZ = Math.sin(toRad(orbit.tiltZ))
      const ex = orbit.rx * Math.cos(a)
      const ey = orbit.ry * Math.sin(a)
      return {
        x: cx + ex * cosZ - ey * sinZ,
        y: cy + ex * sinZ + ey * cosZ,
        depth: Math.sin(a),
      }
    }

    function drawRing(orbit: typeof orbits[0], alpha: number) {
      ctx!.save()
      ctx!.translate(cx, cy)
      ctx!.rotate(toRad(orbit.tiltZ))
      ctx!.beginPath()
      ctx!.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(201,168,76,${alpha})`
      ctx!.lineWidth = 0.75
      ctx!.stroke()
      ctx!.restore()
    }

    function drawTrail(trail: { x: number; y: number }[], maxSize: number) {
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i]
        const progress = i / trail.length
        const alpha = progress * 0.32
        const size = maxSize * progress * 0.65
        if (size < 0.25) continue
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201,168,76,${alpha})`
        ctx!.fill()
      }
    }

    function drawElectron(pos: { x: number; y: number }, size: number, alpha: number) {
      const grd = ctx!.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 5)
      grd.addColorStop(0, `rgba(232,201,122,${alpha * 0.55})`)
      grd.addColorStop(1, "rgba(201,168,76,0)")
      ctx!.beginPath()
      ctx!.arc(pos.x, pos.y, size * 5, 0, Math.PI * 2)
      ctx!.fillStyle = grd
      ctx!.fill()
      ctx!.beginPath()
      ctx!.arc(pos.x, pos.y, size, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(240,216,120,${alpha})`
      ctx!.fill()
    }

    function drawNucleus(t: number) {
      [
        { r: 50, a: 0.04 },
        { r: 36, a: 0.07 },
        { r: 24, a: 0.12 },
        { r: 16, a: 0.20 },
      ].forEach(({ r, a }) => {
        const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, `rgba(201,168,76,${a})`)
        g.addColorStop(1, "rgba(201,168,76,0)")
        ctx!.beginPath()
        ctx!.arc(cx, cy, r, 0, Math.PI * 2)
        ctx!.fillStyle = g
        ctx!.fill()
      })

      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2)
      ctx!.beginPath()
      ctx!.arc(cx, cy, 14 + pulse * 4, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(201,168,76,${0.11 + pulse * 0.09})`
      ctx!.lineWidth = 1
      ctx!.stroke()

      const grad = ctx!.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11)
      grad.addColorStop(0, "#f5e080")
      grad.addColorStop(0.4, "#c9a84c")
      grad.addColorStop(1, "rgba(130,85,18,0.6)")
      ctx!.beginPath()
      ctx!.arc(cx, cy, 11, 0, Math.PI * 2)
      ctx!.fillStyle = grad
      ctx!.fill()

      nucleusParticles.forEach(p => {
        const a = p.angle + t * p.speed
        const px = cx + Math.cos(a) * (p.r * (0.7 + 0.3 * Math.sin(t * 0.4 + p.phase)))
        const py = cy + Math.sin(a) * (p.r * (0.7 + 0.3 * Math.cos(t * 0.4 + p.phase)))
        ctx!.beginPath()
        ctx!.arc(px, py, p.size * (0.7 + 0.3 * Math.sin(t + p.phase)), 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(232,201,122,${0.22 + 0.32 * Math.sin(t * 1.1 + p.phase)})`
        ctx!.fill()
      })
    }

    function drawDust(t: number) {
      dust.forEach(d => {
        const a = d.a * (0.5 + 0.5 * Math.sin(t * d.speed + d.phase))
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201,168,76,${a})`
        ctx!.fill()
      })
    }

    let t0: number | null = null
    let animId: number

    function frame(ts: number) {
      if (!t0) t0 = ts
      const t = (ts - t0) / 1000

      ctx!.clearRect(0, 0, W, H)

      const bg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 155)
      bg.addColorStop(0, "rgba(201,168,76,0.052)")
      bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, W, H)

      drawDust(t)

      const data = orbits.map((orbit, i) => ({ orbit, i, pos: electronPos(orbit, t) }))

      data.forEach(({ orbit, i, pos }) => {
        if (pos.depth >= 0) return
        const d = (pos.depth + 1) / 2
        drawRing(orbit, 0.09)
        drawTrail(trails[i], orbit.eSize)
        drawElectron(pos, orbit.eSize * (0.72 + 0.28 * d), 0.5 + 0.22 * d)
      })

      drawNucleus(t)

      data.forEach(({ orbit, i, pos }) => {
        if (pos.depth < 0) return
        const d = (pos.depth + 1) / 2
        drawRing(orbit, 0.17)
        drawTrail(trails[i], orbit.eSize)
        drawElectron(pos, orbit.eSize * (0.72 + 0.28 * d), 0.7 + 0.25 * d)
      })

      orbits.forEach((orbit, i) => {
        const pos = electronPos(orbit, t)
        trails[i].push({ x: pos.x, y: pos.y })
        if (trails[i].length > TRAIL_LEN) trails[i].shift()
      })

      animId = requestAnimationFrame(frame)
    }

    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [])

  return <canvas ref={canvasRef} width={260} height={260} style={{ width: 260, height: 260 }} />
}

export function SplashOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060606]"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.04) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* Starfield */}
      <Starfield stars={STARS} />

      {/* ATLAS logo */}
      <div
        className="relative z-10 flex flex-col items-center gap-1.5"
        style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
      >
        <svg width="18" height="16" viewBox="0 0 16 14" fill="none">
          <path d="M8 0.5L15.5 13.5H0.5L8 0.5Z" stroke="#d4af37" strokeWidth="1" fill="none" />
        </svg>
        <span className="font-mono text-[11px] tracking-[0.35em] text-[#d4af37]/75">ATLAS</span>
      </div>

      {/* Atom animation */}
      <div
        className="relative z-10 mt-8"
        style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
      >
        <AtomCanvas />
      </div>

      {/* Tagline */}
      <p
        className="relative z-10 mt-9 max-w-[380px] text-center font-serif text-[22px] leading-relaxed text-[#d9d1c3]/55"
        style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 600ms both" }}
      >
        Your portfolio, guided by conviction — not noise.
      </p>

      {/* Begin CTA */}
      <button
        autoFocus
        onClick={handleDismiss}
        className="relative z-10 mt-12 cursor-pointer rounded-2xl bg-[#d4af37] px-14 py-4 text-[17px] font-semibold text-[#1a1507] shadow-[0_8px_30px_rgba(212,175,55,0.25)] transition-all hover:bg-[#e0bf4a] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)] active:scale-[0.99]"
        style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
      >
        Begin
      </button>
    </div>
  )
}
