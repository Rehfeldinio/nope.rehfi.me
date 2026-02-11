"use client"

import { useEffect, useRef, useCallback } from "react"

export type ParticleEffect = "stars" | "snow" | "firework" | "confetti"

// single particle state
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  rotation: number
  rotationSpeed: number
  color: string
  life: number
  maxLife: number
  shape: "star" | "flake" | "spark" | "rect"
  gravity: number
  friction: number
}

const RAINBOW_COLORS = [
  "#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#FFFF00",
  "#ADFF2F", "#00FF00", "#00CED1", "#00BFFF", "#1E90FF",
  "#6A5ACD", "#8A2BE2", "#FF00FF", "#FF1493",
]

const SNOW_COLORS = ["#FFFFFF", "#E8E8E8", "#D0D0D0", "#C8D8E8", "#B0C4DE"]

const CONFETTI_COLORS = [
  "#FF0000", "#FF8C00", "#FFD700", "#00FF00", "#00BFFF",
  "#8A2BE2", "#FF1493", "#FF4500", "#1E90FF", "#ADFF2F",
]

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spikes: number, outerRadius: number, innerRadius: number
) {
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerRadius)
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius
    let y = cy + Math.sin(rot) * outerRadius
    ctx.lineTo(x, y)
    rot += step
    x = cx + Math.cos(rot) * innerRadius
    y = cy + Math.sin(rot) * innerRadius
    ctx.lineTo(x, y)
    rot += step
  }
  ctx.lineTo(cx, cy - outerRadius)
  ctx.closePath()
}

function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number
) {
  const arms = 6
  ctx.beginPath()
  for (let i = 0; i < arms; i++) {
    const angle = (Math.PI * 2 * i) / arms
    const ex = cx + Math.cos(angle) * size
    const ey = cy + Math.sin(angle) * size
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    // small branches
    const branchLen = size * 0.4
    const branchAngle1 = angle + 0.5
    const branchAngle2 = angle - 0.5
    const midX = cx + Math.cos(angle) * size * 0.6
    const midY = cy + Math.sin(angle) * size * 0.6
    ctx.moveTo(midX, midY)
    ctx.lineTo(midX + Math.cos(branchAngle1) * branchLen, midY + Math.sin(branchAngle1) * branchLen)
    ctx.moveTo(midX, midY)
    ctx.lineTo(midX + Math.cos(branchAngle2) * branchLen, midY + Math.sin(branchAngle2) * branchLen)
  }
  ctx.stroke()
}

interface ParticleSystemProps {
  enabled: boolean
  intensity: number
  effect: ParticleEffect
  customColors?: string[]
}

export default function ParticleSystem({ enabled = true, intensity = 50, effect = "stars", customColors }: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>(0)
  const colorIndexRef = useRef(0)
  const lastSpawnRef = useRef(0)

  const createParticle = useCallback((x: number, y: number, effectType: ParticleEffect): Particle => {
    const colors = customColors && customColors.length > 0 ? customColors : RAINBOW_COLORS
    const ci = colorIndexRef.current++ % colors.length

    switch (effectType) {
      case "snow": {
        const snowPalette = customColors && customColors.length > 0 ? customColors : SNOW_COLORS
        return {
          x, y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 1.5 + 0.5,
          size: Math.random() * 8 + 4,
          opacity: Math.random() * 0.5 + 0.5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.03,
          color: snowPalette[Math.floor(Math.random() * snowPalette.length)],
          life: 0,
          maxLife: Math.random() * 80 + 60,
          shape: "flake",
          gravity: 0.01,
          friction: 0.999,
        }
      }
      case "firework": {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 6 + 2
        return {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 1,
          opacity: 1,
          rotation: 0,
          rotationSpeed: 0,
          color: colors[ci],
          life: 0,
          maxLife: Math.random() * 30 + 20,
          shape: "spark",
          gravity: 0.12,
          friction: 0.97,
        }
      }
      case "confetti": {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 4 + 1
        return {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: Math.random() * 8 + 4,
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: Math.random() * 50 + 40,
          shape: "rect",
          gravity: 0.06,
          friction: 0.99,
        }
      }
      default: { // stars
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 3 + 1
        return {
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: Math.random() * 10 + 5,
          opacity: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          color: colors[ci],
          life: 0,
          maxLife: Math.random() * 40 + 30,
          shape: "star",
          gravity: 0.04,
          friction: 1,
        }
      }
    }
  }, [customColors])

  const spawnParticles = useCallback((x: number, y: number, count: number, effectType: ParticleEffect) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle(x, y, effectType))
    }
  }, [createParticle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const enabledRef = { current: enabled }
    const intensityRef = { current: intensity }
    const effectRef = { current: effect }

    const getSpawnDelay = () => Math.max(10, 200 - intensityRef.current * 1.9)
    const getSpawnCount = () => {
      const base = Math.max(1, Math.round((intensityRef.current / 100) * 6))
      // fireworks spawn more at once
      return effectRef.current === "firework" ? base * 3 : base
    }
    const getClickCount = () => {
      const base = Math.max(2, Math.round((intensityRef.current / 100) * 20))
      return effectRef.current === "firework" ? base * 2 : base
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      if (!enabledRef.current || intensityRef.current === 0) return
      const now = Date.now()
      if (now - lastSpawnRef.current > getSpawnDelay()) {
        spawnParticles(e.clientX, e.clientY, getSpawnCount(), effectRef.current)
        lastSpawnRef.current = now
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      mouseRef.current = { x: touch.clientX, y: touch.clientY }
      if (!enabledRef.current || intensityRef.current === 0) return
      const now = Date.now()
      if (now - lastSpawnRef.current > getSpawnDelay()) {
        spawnParticles(touch.clientX, touch.clientY, getSpawnCount(), effectRef.current)
        lastSpawnRef.current = now
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current || intensityRef.current === 0) return
      spawnParticles(e.clientX, e.clientY, getClickCount(), effectRef.current)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("click", handleClick)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++
        p.vx *= p.friction
        p.vy *= p.friction
        p.vy += p.gravity
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.opacity = 1 - p.life / p.maxLife

        if (p.shape === "star") p.size *= 0.995
        if (p.shape === "spark") p.size *= 0.97

        if (p.life >= p.maxLife || p.opacity <= 0) return false

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.opacity

        if (p.shape === "star") {
          ctx.shadowColor = p.color
          ctx.shadowBlur = 12
          ctx.fillStyle = p.color
          drawStar(ctx, 0, 0, 5, p.size, p.size * 0.4)
          ctx.fill()
        } else if (p.shape === "flake") {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 1.5
          ctx.shadowColor = p.color
          ctx.shadowBlur = 6
          drawSnowflake(ctx, 0, 0, p.size)
        } else if (p.shape === "spark") {
          ctx.shadowColor = p.color
          ctx.shadowBlur = 10
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
          // tail
          ctx.globalAlpha = p.opacity * 0.4
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(-p.vx * 3, -p.vy * 3)
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.size * 0.8
          ctx.lineCap = "round"
          ctx.stroke()
        } else if (p.shape === "rect") {
          ctx.shadowColor = p.color
          ctx.shadowBlur = 4
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }

        ctx.restore()
        return true
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("click", handleClick)
      cancelAnimationFrame(animationRef.current)
    }
  }, [spawnParticles, enabled, intensity, effect])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  )
}
