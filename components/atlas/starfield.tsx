export type Star = {
  top: string
  left: string
  size: number
  opacity: number
  type: "dot" | "diamond"
}

export function Starfield({ stars }: { stars: Star[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-40">
      {stars.map((star, i) =>
        star.type === "diamond" ? (
          <span
            key={i}
            className="absolute bg-[#C8A43A]"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              transform: "rotate(45deg)",
              boxShadow: "0 0 10px rgba(200,164,58,0.15)",
              animation: `starDrift 25s ease-in-out infinite`,
              animationDelay: `${i * 1.7}s`,
            }}
          />
        ) : (
          <span
            key={i}
            className="absolute rounded-full bg-[#C8A43A]"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              boxShadow:
                star.size > 2
                  ? "0 0 12px rgba(200,164,58,0.12)"
                  : "0 0 6px rgba(200,164,58,0.08)",
              animation: `starDrift 25s ease-in-out infinite`,
              animationDelay: `${i * 1.7}s`,
            }}
          />
        ),
      )}
    </div>
  )
}
