export type Star = {
  top: string
  left: string
  size: number
  opacity: number
  type: "dot" | "diamond"
}

export function Starfield({ stars }: { stars: Star[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      {stars.map((star, i) =>
        star.type === "diamond" ? (
          <span
            key={i}
            className="absolute bg-[#e8c862]"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              transform: "rotate(45deg)",
              boxShadow: "0 0 10px rgba(212,175,55,0.4)",
              animation: `starDrift 25s ease-in-out infinite`,
              animationDelay: `${i * 1.7}s`,
            }}
          />
        ) : (
          <span
            key={i}
            className="absolute rounded-full bg-[#e8c862]"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              boxShadow:
                star.size > 2
                  ? "0 0 12px rgba(212,175,55,0.35)"
                  : "0 0 6px rgba(212,175,55,0.18)",
              animation: `starDrift 25s ease-in-out infinite`,
              animationDelay: `${i * 1.7}s`,
            }}
          />
        ),
      )}
    </div>
  )
}
