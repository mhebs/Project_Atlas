"use client"

import { useEffect, useRef } from "react"

export function AtomCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = 240, H = 240
    const cx = W / 2, cy = H / 2

    const orbits = [
      { rx: 90, ry: 26, tiltZ: 0, speed: 0.72, phase: 0, eSize: 4 },
      { rx: 84, ry: 28, tiltZ: 60, speed: -0.55, phase: Math.PI * 0.6, eSize: 3.5 },
      { rx: 78, ry: 24, tiltZ: 120, speed: 0.88, phase: Math.PI * 1.2, eSize: 3 },
    ]

    const nucleusParticles = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      r: 4 + Math.random() * 8,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 1.8,
    }))

    const dust = Array.from({ length: 30 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.4 + Math.random() * 0.9,
      a: 0.06 + Math.random() * 0.12,
      speed: 0.004 + Math.random() * 0.007,
      phase: Math.random() * Math.PI * 2,
    }))

    const TRAIL_LEN = 24
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
      ctx!.lineWidth = 0.7
      ctx!.stroke()
      ctx!.restore()
    }

    function drawTrail(trail: { x: number; y: number }[], maxSize: number) {
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i]
        const progress = i / trail.length
        const alpha = progress * 0.28
        const size = maxSize * progress * 0.6
        if (size < 0.2) continue
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201,168,76,${alpha})`
        ctx!.fill()
      }
    }

    function drawElectron(pos: { x: number; y: number }, size: number, alpha: number) {
      const grd = ctx!.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 5)
      grd.addColorStop(0, `rgba(201,168,76,${alpha * 0.5})`)
      grd.addColorStop(1, "rgba(201,168,76,0)")
      ctx!.beginPath()
      ctx!.arc(pos.x, pos.y, size * 5, 0, Math.PI * 2)
      ctx!.fillStyle = grd
      ctx!.fill()
      ctx!.beginPath()
      ctx!.arc(pos.x, pos.y, size, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(220,196,100,${alpha})`
      ctx!.fill()
    }

    function drawNucleus(t: number) {
      // Gold glow layers
      ;[
        { r: 44, a: 0.04 },
        { r: 30, a: 0.07 },
        { r: 20, a: 0.13 },
        { r: 13, a: 0.22 },
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
      ctx!.arc(cx, cy, 12 + pulse * 3, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(201,168,76,${0.12 + pulse * 0.1})`
      ctx!.lineWidth = 1
      ctx!.stroke()

      // Gold core
      const grad = ctx!.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 9)
      grad.addColorStop(0, "#dcc464")
      grad.addColorStop(0.4, "#c9a84c")
      grad.addColorStop(1, "rgba(160,130,60,0.7)")
      ctx!.beginPath()
      ctx!.arc(cx, cy, 9, 0, Math.PI * 2)
      ctx!.fillStyle = grad
      ctx!.fill()

      nucleusParticles.forEach(p => {
        const a = p.angle + t * p.speed
        const px = cx + Math.cos(a) * (p.r * (0.7 + 0.3 * Math.sin(t * 0.4 + p.phase)))
        const py = cy + Math.sin(a) * (p.r * (0.7 + 0.3 * Math.cos(t * 0.4 + p.phase)))
        ctx!.beginPath()
        ctx!.arc(px, py, p.size * (0.7 + 0.3 * Math.sin(t + p.phase)), 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201,168,76,${0.18 + 0.28 * Math.sin(t * 1.1 + p.phase)})`
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

      // Navy background glow
      const bg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 140)
      bg.addColorStop(0, "rgba(201,168,76,0.04)")
      bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, W, H)

      drawDust(t)

      const data = orbits.map((orbit, i) => ({ orbit, i, pos: electronPos(orbit, t) }))

      data.forEach(({ orbit, i, pos }) => {
        if (pos.depth >= 0) return
        const d = (pos.depth + 1) / 2
        drawRing(orbit, 0.08)
        drawTrail(trails[i], orbit.eSize)
        drawElectron(pos, orbit.eSize * (0.72 + 0.28 * d), 0.45 + 0.2 * d)
      })

      drawNucleus(t)

      data.forEach(({ orbit, i, pos }) => {
        if (pos.depth < 0) return
        const d = (pos.depth + 1) / 2
        drawRing(orbit, 0.15)
        drawTrail(trails[i], orbit.eSize)
        drawElectron(pos, orbit.eSize * (0.72 + 0.28 * d), 0.65 + 0.25 * d)
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

  return <canvas ref={canvasRef} width={240} height={240} style={{ width: 120, height: 120 }} />
}
