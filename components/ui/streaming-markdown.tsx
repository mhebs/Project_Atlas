import { memo } from "react"
import type { Components } from "react-markdown"
import { Markdown } from "@/components/ui/markdown"

interface StreamingMarkdownProps {
  id: string
  committed: string
  liveTail: string
  className?: string
  components?: Partial<Components>
  tailClassName?: string
}

function StreamingMarkdownComponent({
  id,
  committed,
  liveTail,
  className,
  components,
  tailClassName,
}: StreamingMarkdownProps) {
  return (
    <div className={className}>
      {committed ? (
        <Markdown id={`${id}-committed`} className={className} components={components}>
          {committed}
        </Markdown>
      ) : null}
      {liveTail ? (
        <div className={tailClassName ?? "whitespace-pre-wrap break-words text-sm leading-relaxed text-[#2C2617]"}>
          {liveTail}
        </div>
      ) : null}
    </div>
  )
}

export const StreamingMarkdown = memo(
  StreamingMarkdownComponent,
  (prev, next) =>
    prev.id === next.id &&
    prev.committed === next.committed &&
    prev.liveTail === next.liveTail &&
    prev.className === next.className &&
    prev.components === next.components &&
    prev.tailClassName === next.tailClassName,
)
