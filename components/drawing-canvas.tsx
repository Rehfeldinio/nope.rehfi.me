"use client"

import { useEffect, useRef, useCallback, useState } from "react"

import type { ParticleEffect } from "@/components/rainbow-stars"

type Tool = "brush" | "eraser" | "line" | "rect" | "circle" | "triangle" | "text" | "stamp"

const STAMP_EMOJIS = [
  "\u2B50", "\u2764\uFE0F", "\uD83D\uDD25", "\u26A1", "\uD83C\uDF19",
  "\uD83D\uDE80", "\uD83C\uDF1F", "\uD83C\uDF08", "\uD83C\uDF3A", "\uD83C\uDF3B",
  "\uD83C\uDF40", "\uD83C\uDF4E", "\uD83E\uDD8B", "\uD83D\uDC3E", "\uD83D\uDC8E",
  "\uD83C\uDFA8", "\uD83C\uDFB5", "\uD83D\uDCA5", "\uD83D\uDCAB", "\u2744\uFE0F",
  "\uD83D\uDE0E", "\uD83D\uDC7B", "\uD83D\uDC7E", "\uD83E\uDD16", "\uD83C\uDF89",
  "\uD83C\uDF1E", "\uD83C\uDF0D", "\uD83D\uDC51", "\uD83D\uDC40", "\uD83C\uDF55",
]
const BUILTIN_CURSORS = [
  { label: "Kreuz", value: "crosshair" },
  { label: "Normal", value: "default" },
  { label: "Hand", value: "pointer" },
  { label: "Zelle", value: "cell" },
  { label: "Unsichtbar", value: "none" },
]

const EMOJI_CURSORS = [
  { label: "Stern", emoji: "\u2B50", value: "star" },
  { label: "Herz", emoji: "\u2764\uFE0F", value: "heart" },
  { label: "Feuer", emoji: "\uD83D\uDD25", value: "fire" },
  { label: "Blitz", emoji: "\u26A1", value: "bolt" },
  { label: "Mond", emoji: "\uD83C\uDF19", value: "moon" },
  { label: "Rakete", emoji: "\uD83D\uDE80", value: "rocket" },
]

const EFFECTS: { label: string; value: ParticleEffect }[] = [
  { label: "Sterne", value: "stars" },
  { label: "Schnee", value: "snow" },
  { label: "Feuerwerk", value: "firework" },
  { label: "Konfetti", value: "confetti" },
]

const PARTICLE_COLOR_PRESETS = [
  { label: "Standard", colors: [] as string[] },
  { label: "Feuer", colors: ["#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#FFFF00"] },
  { label: "Ozean", colors: ["#001F54", "#0A7E8C", "#00BFFF", "#1E90FF", "#00CED1", "#40E0D0"] },
  { label: "Wald", colors: ["#006400", "#228B22", "#32CD32", "#ADFF2F", "#00FF00", "#7CFC00"] },
  { label: "Neon", colors: ["#FF00FF", "#00FFFF", "#00FF00", "#FFFF00", "#FF0080"] },
  { label: "Pastell", colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E8BAFF"] },
  { label: "Eis", colors: ["#E0F7FA", "#B2EBF2", "#80DEEA", "#4DD0E1", "#00BCD4"] },
  { label: "Blut", colors: ["#8B0000", "#B22222", "#DC143C", "#FF0000", "#FF4444"] },
]

interface DrawingCanvasProps {
  starsEnabled: boolean
  onToggleStars: () => void
  starIntensity: number
  onStarIntensityChange: (v: number) => void
  particleEffect: ParticleEffect
  onParticleEffectChange: (e: ParticleEffect) => void
  particleColors: string[]
  onParticleColorsChange: (c: string[]) => void
  cursor: string
  onCursorChange: (c: string) => void
}

const RAINBOW_COLORS = [
  "#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#FFFF00",
  "#ADFF2F", "#00FF00", "#00CED1", "#00BFFF", "#1E90FF",
  "#6A5ACD", "#8A2BE2", "#FF00FF", "#FF1493",
]

const PALETTE = [
  { label: "Regenbogen", value: "rainbow" },
  { label: "Rot", value: "#FF0000" },
  { label: "Orange", value: "#FF8C00" },
  { label: "Gelb", value: "#FFD700" },
  { label: "Grün", value: "#00FF00" },
  { label: "Cyan", value: "#00CED1" },
  { label: "Blau", value: "#1E90FF" },
  { label: "Lila", value: "#8A2BE2" },
  { label: "Pink", value: "#FF1493" },
  { label: "Weiß", value: "#FFFFFF" },
]

const MAX_HISTORY = 50

export default function DrawingCanvas({ starsEnabled, onToggleStars, starIntensity, onStarIntensityChange, particleEffect, onParticleEffectChange, particleColors, onParticleColorsChange, cursor, onCursorChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const hueIndexRef = useRef(0)
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef(-1)

  const [brushSize, setBrushSize] = useState(4)
  const [opacity, setOpacity] = useState(100)
  const [selectedColor, setSelectedColor] = useState("rainbow")
  const [activeTool, setActiveTool] = useState<Tool>("brush")
  const [toolboxVisible, setToolboxVisible] = useState(true)
  const [fillShapes, setFillShapes] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [fontSize, setFontSize] = useState(24)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [cursorCSS, setCursorCSS] = useState("crosshair")
  const [colorsOpen, setColorsOpen] = useState(false)
  const [cursorOpen, setCursorOpen] = useState(false)
  const [selectedStamp, setSelectedStamp] = useState(STAMP_EMOJIS[0])
  const [stampSize, setStampSize] = useState(40)
  const [showStampPicker, setShowStampPicker] = useState(false)

  // emoji -> css cursor url
  useEffect(() => {
    const emojiCursor = EMOJI_CURSORS.find((e) => e.value === cursor)
    if (emojiCursor) {
      const canvas = document.createElement("canvas")
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.font = "24px serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(emojiCursor.emoji, 16, 16)
        const url = canvas.toDataURL("image/png")
        setCursorCSS(`url(${url}) 16 16, auto`)
      }
    } else {
      setCursorCSS(cursor)
    }
  }, [cursor])

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d") ?? null, [])
  const getOverlayCtx = useCallback(() => overlayRef.current?.getContext("2d") ?? null, [])

  // undo/redo history
  const saveHistory = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const idx = historyIndexRef.current
    historyRef.current = historyRef.current.slice(0, idx + 1)
    historyRef.current.push(data)
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift()
    } else {
      historyIndexRef.current++
    }
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(false)
  }, [getCtx])

  const undo = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas || historyIndexRef.current <= 0) return
    historyIndexRef.current--
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0)
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(true)
  }, [getCtx])

  const redo = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas || historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0)
    setCanUndo(true)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [getCtx])

  // color helpers
  const getColor = useCallback(() => {
    if (selectedColor === "rainbow") {
      const color = RAINBOW_COLORS[hueIndexRef.current % RAINBOW_COLORS.length]
      hueIndexRef.current++
      return color
    }
    return selectedColor
  }, [selectedColor])

  const createRainbowGradient = useCallback(
    (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
      const gradient = c.createLinearGradient(x1, y1, x2, y2)
      for (let i = 0; i < RAINBOW_COLORS.length; i++) {
        gradient.addColorStop(i / (RAINBOW_COLORS.length - 1), RAINBOW_COLORS[i])
      }
      return gradient
    },
    []
  )

  // drawing
  const drawBrushLine = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const c = getCtx()
      if (!c) return
      const color = getColor()
      c.globalCompositeOperation = "source-over"
      c.globalAlpha = opacity / 100
      c.beginPath()
      c.moveTo(fromX, fromY)
      c.lineTo(toX, toY)
      c.strokeStyle = color
      c.lineWidth = brushSize
      c.lineCap = "round"
      c.lineJoin = "round"
      c.shadowColor = color
      c.shadowBlur = 8
      c.stroke()
      c.shadowBlur = 0
      c.globalAlpha = 1
    },
    [getCtx, getColor, brushSize, opacity]
  )

  const eraseLine = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const c = getCtx()
      if (!c) return
      c.globalCompositeOperation = "destination-out"
      c.beginPath()
      c.moveTo(fromX, fromY)
      c.lineTo(toX, toY)
      c.lineWidth = brushSize * 2
      c.lineCap = "round"
      c.lineJoin = "round"
      c.stroke()
      c.globalCompositeOperation = "source-over"
    },
    [getCtx, brushSize]
  )

  const drawShape = useCallback(
    (startX: number, startY: number, endX: number, endY: number, ctx?: CanvasRenderingContext2D | null, isPreview = false) => {
      const c = ctx || getCtx()
      if (!c) return

      const isRainbow = selectedColor === "rainbow"
      const solidColor = isRainbow ? "#FFFFFF" : selectedColor

      c.globalCompositeOperation = "source-over"
      c.globalAlpha = opacity / 100
      c.lineWidth = brushSize
      c.lineCap = "round"
      c.lineJoin = "round"

      if (isRainbow) {
        const gradient = createRainbowGradient(c, startX, startY, endX, endY)
        c.strokeStyle = gradient
        if (fillShapes) c.fillStyle = gradient
        c.shadowColor = RAINBOW_COLORS[hueIndexRef.current % RAINBOW_COLORS.length]
      } else {
        c.strokeStyle = solidColor
        if (fillShapes) c.fillStyle = solidColor + "66"
        c.shadowColor = solidColor
      }
      c.shadowBlur = isPreview ? 4 : 8

      c.beginPath()
      const tool = activeTool
      if (tool === "line") {
        c.moveTo(startX, startY)
        c.lineTo(endX, endY)
      } else if (tool === "rect") {
        c.rect(startX, startY, endX - startX, endY - startY)
      } else if (tool === "circle") {
        const rx = (endX - startX) / 2
        const ry = (endY - startY) / 2
        const cx = startX + rx
        const cy = startY + ry
        c.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
      } else if (tool === "triangle") {
        const midX = startX + (endX - startX) / 2
        c.moveTo(midX, startY)
        c.lineTo(endX, endY)
        c.lineTo(startX, endY)
        c.closePath()
      }

      if (fillShapes && tool !== "line") c.fill()
      c.stroke()
      c.shadowBlur = 0
      c.globalAlpha = 1

      if (!isPreview) hueIndexRef.current++
    },
    [getCtx, selectedColor, brushSize, activeTool, createRainbowGradient, fillShapes, opacity]
  )

  // text commit
  const commitText = useCallback(() => {
    if (!textPos || !textInput.trim()) {
      setTextPos(null)
      setTextInput("")
      return
    }
    const c = getCtx()
    if (!c) return

    const isRainbow = selectedColor === "rainbow"
    c.globalAlpha = opacity / 100
    c.font = `${fontSize}px sans-serif`
    c.textBaseline = "top"

    if (isRainbow) {
      const metrics = c.measureText(textInput)
      const gradient = createRainbowGradient(c, textPos.x, textPos.y, textPos.x + metrics.width, textPos.y)
      c.fillStyle = gradient
      c.shadowColor = RAINBOW_COLORS[hueIndexRef.current % RAINBOW_COLORS.length]
      hueIndexRef.current++
    } else {
      c.fillStyle = selectedColor
      c.shadowColor = selectedColor
    }
    c.shadowBlur = 8
    c.fillText(textInput, textPos.x, textPos.y)
    c.shadowBlur = 0
    c.globalAlpha = 1

    saveHistory()
    setTextPos(null)
    setTextInput("")
  }, [textPos, textInput, getCtx, selectedColor, fontSize, createRainbowGradient, saveHistory])

  // stamp
  const placeStamp = useCallback((x: number, y: number) => {
    const c = getCtx()
    if (!c) return
    c.globalAlpha = opacity / 100
    c.font = `${stampSize}px serif`
    c.textAlign = "center"
    c.textBaseline = "middle"
    c.shadowColor = selectedColor === "rainbow"
      ? RAINBOW_COLORS[hueIndexRef.current++ % RAINBOW_COLORS.length]
      : selectedColor === "#FFFFFF" ? "#FFFFFF" : selectedColor
    c.shadowBlur = 10
    c.fillText(selectedStamp, x, y)
    c.shadowBlur = 0
    c.globalAlpha = 1
    c.textAlign = "start"
    c.textBaseline = "alphabetic"
    saveHistory()
  }, [getCtx, opacity, stampSize, selectedStamp, selectedColor, saveHistory])

  // canvas resize + initial blank state
  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay) return

    const resize = () => {
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext("2d")
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0)

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      overlay.width = window.innerWidth
      overlay.height = window.innerHeight

      const ctx = canvas.getContext("2d")
      if (ctx && tempCtx) ctx.drawImage(tempCanvas, 0, 0)
    }
    resize()

    // erster history eintrag (leer)
    const ctx = canvas.getContext("2d")
    if (ctx) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      historyRef.current = [data]
      historyIndexRef.current = 0
    }

    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // mouse + touch events
  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay) return

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const pos = { x: e.clientX, y: e.clientY }

      if (activeTool === "text") {
        if (textPos) {
          commitText()
        }
        setTextPos(pos)
        return
      }

      if (activeTool === "stamp") {
        placeStamp(pos.x, pos.y)
        return
      }

      isDrawingRef.current = true
      lastPosRef.current = pos
      startPosRef.current = pos
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !lastPosRef.current || !startPosRef.current) return

      if (activeTool === "brush") {
        drawBrushLine(lastPosRef.current.x, lastPosRef.current.y, e.clientX, e.clientY)
        lastPosRef.current = { x: e.clientX, y: e.clientY }
      } else if (activeTool === "eraser") {
        eraseLine(lastPosRef.current.x, lastPosRef.current.y, e.clientX, e.clientY)
        lastPosRef.current = { x: e.clientX, y: e.clientY }
      } else {
        const overlayCtx = getOverlayCtx()
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
          drawShape(startPosRef.current.x, startPosRef.current.y, e.clientX, e.clientY, overlayCtx, true)
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDrawingRef.current || !startPosRef.current) return

      if (activeTool !== "brush" && activeTool !== "eraser") {
        const overlayCtx = getOverlayCtx()
        if (overlayCtx) overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
        drawShape(startPosRef.current.x, startPosRef.current.y, e.clientX, e.clientY)
      }

      saveHistory()
      isDrawingRef.current = false
      lastPosRef.current = null
      startPosRef.current = null
    }

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      const pos = { x: touch.clientX, y: touch.clientY }

      if (activeTool === "text") {
        if (textPos) commitText()
        setTextPos(pos)
        return
      }

      if (activeTool === "stamp") {
        placeStamp(pos.x, pos.y)
        return
      }

      isDrawingRef.current = true
      lastPosRef.current = pos
      startPosRef.current = pos
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current || !lastPosRef.current || !startPosRef.current) return
      const touch = e.touches[0]

      if (activeTool === "brush") {
        drawBrushLine(lastPosRef.current.x, lastPosRef.current.y, touch.clientX, touch.clientY)
        lastPosRef.current = { x: touch.clientX, y: touch.clientY }
      } else if (activeTool === "eraser") {
        eraseLine(lastPosRef.current.x, lastPosRef.current.y, touch.clientX, touch.clientY)
        lastPosRef.current = { x: touch.clientX, y: touch.clientY }
      } else {
        const overlayCtx = getOverlayCtx()
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
          drawShape(startPosRef.current.x, startPosRef.current.y, touch.clientX, touch.clientY, overlayCtx, true)
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDrawingRef.current || !startPosRef.current) return

      if (activeTool !== "brush" && activeTool !== "eraser") {
        const overlayCtx = getOverlayCtx()
        if (overlayCtx) overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
        const touch = e.changedTouches[0]
        if (touch) drawShape(startPosRef.current.x, startPosRef.current.y, touch.clientX, touch.clientY)
      }

      saveHistory()
      isDrawingRef.current = false
      lastPosRef.current = null
      startPosRef.current = null
    }

    // shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault()
        redo()
      }
      if (e.key === "Tab") {
        e.preventDefault()
        setToolboxVisible((p) => !p)
      }
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove)
    window.addEventListener("touchend", handleTouchEnd)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [activeTool, drawBrushLine, eraseLine, drawShape, getOverlayCtx, saveHistory, undo, redo, textPos, commitText, placeStamp])

  const clearCanvas = useCallback(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      saveHistory()
    }
  }, [getCtx, saveHistory])

  const downloadImage = useCallback((withBackground: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const tmp = document.createElement("canvas")
    tmp.width = canvas.width
    tmp.height = canvas.height
    const tmpCtx = tmp.getContext("2d")
    if (!tmpCtx) return

    if (withBackground) {
      // Black background
      tmpCtx.fillStyle = "#000000"
      tmpCtx.fillRect(0, 0, tmp.width, tmp.height)
      // Draw deer image
      const deerImg = document.querySelector('img[src*="deer"]') as HTMLImageElement | null
      if (deerImg && deerImg.complete) {
        const dx = (tmp.width - 500) / 2
        const dy = (tmp.height - 500) / 2
        tmpCtx.globalAlpha = 0.08
        tmpCtx.drawImage(deerImg, dx, dy, 500, 500)
        tmpCtx.globalAlpha = 1
      }
    }

    tmpCtx.drawImage(canvas, 0, 0)
    const link = document.createElement("a")
    link.download = withBackground ? "zeichnung-mit-hintergrund.png" : "zeichnung-transparent.png"
    link.href = tmp.toDataURL("image/png")
    link.click()
    setShowDownloadMenu(false)
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0"
        style={{ zIndex: 10, cursor: activeTool === "eraser" ? "cell" : cursorCSS }}
      />
      <canvas
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 11 }}
      />

      {/* text input wenn text-tool aktiv */}
      {activeTool === "text" && textPos && (
        <div
          className="fixed z-[55]"
          style={{ left: textPos.x, top: textPos.y }}
        >
          <input
            type="text"
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText()
              if (e.key === "Escape") { setTextPos(null); setTextInput("") }
            }}
            placeholder="Text eingeben..."
            className="bg-transparent border border-neutral-600 rounded px-2 py-1 text-white outline-none min-w-[150px]"
            style={{ fontSize: `${fontSize}px`, fontFamily: "sans-serif" }}
          />
        </div>
      )}

      {/* toolbar links oben */}
      <div className="fixed top-4 left-4 flex flex-col gap-2 z-[60]">
        {/* auf/zuklappen */}
        <button
          onClick={() => setToolboxVisible((p) => !p)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm text-neutral-400 hover:text-white transition-all duration-200"
          title={toolboxVisible ? "Toolbox ausblenden (Tab)" : "Toolbox einblenden (Tab)"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${toolboxVisible ? "" : "rotate-180"}`}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* toolbox */}
        <div className={`flex flex-col gap-2 transition-all duration-300 origin-top ${toolboxVisible ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none h-0"}`}>

        {/* werkzeuge */}
        <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
          {/* pinsel */}
          <button
            onClick={() => setActiveTool("brush")}
            title="Pinsel"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "brush" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          {/* radierer */}
          <button
            onClick={() => setActiveTool("eraser")}
            title="Radierer"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "eraser" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l4 4c.8.8.8 2 0 2.8L12 18" />
              <path d="M6 11l4 4" />
            </svg>
          </button>
          <div className="w-px h-5 bg-neutral-700 mx-0.5" />
          {/* formen */}
          <button
            onClick={() => setActiveTool("line")}
            title="Linie"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "line" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4" /></svg>
          </button>

          <button
            onClick={() => setActiveTool("rect")}
            title="Rechteck"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "rect" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="1" /></svg>
          </button>

          <button
            onClick={() => setActiveTool("circle")}
            title="Kreis"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "circle" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
          </button>

          <button
            onClick={() => setActiveTool("triangle")}
            title="Dreieck"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "triangle" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L22 21H2L12 3z" /></svg>
          </button>
          <div className="w-px h-5 bg-neutral-700 mx-0.5" />
          <button
            onClick={() => setActiveTool("text")}
            title="Text"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${activeTool === "text" ? "bg-white/15 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>

          <button
            onClick={() => setActiveTool("stamp")}
            title="Stempel"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 text-sm ${activeTool === "stamp" ? "bg-white/15" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"}`}
          >
            {selectedStamp}
          </button>
        </div>

        {/* füllung an/aus bei formen */}
        {(activeTool === "rect" || activeTool === "circle" || activeTool === "triangle") && (
          <button
            onClick={() => setFillShapes((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm text-xs font-medium transition-all duration-200 ${fillShapes ? "text-white" : "text-neutral-500"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={fillShapes ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            {fillShapes ? "Gefuellt" : "Nur Umriss"}
          </button>
        )}

        {/* schriftgröße slider */}
        {activeTool === "text" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
            <span className="text-neutral-400 text-xs">Schrift</span>
            <input
              type="range"
              min={12}
              max={72}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 h-1 accent-white"
            />
            <span className="text-neutral-400 text-xs w-6 text-right">{fontSize}</span>
          </div>
        )}

        {/* stempel auswahl */}
        {activeTool === "stamp" && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm overflow-hidden max-w-[220px]">
            <button
              onClick={() => setShowStampPicker((p) => !p)}
              className="flex items-center justify-between w-full px-3 py-2 text-neutral-400 hover:text-white transition-colors duration-200"
            >
              <span className="text-xs font-medium">Stempel: {selectedStamp}</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`transition-transform duration-200 ${showStampPicker ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={`transition-all duration-200 ${showStampPicker ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
              <div className="grid grid-cols-6 gap-1 px-3 pb-2">
                {STAMP_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { setSelectedStamp(emoji); setShowStampPicker(false) }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all duration-200 ${
                      selectedStamp === emoji
                        ? "bg-white/15 ring-1 ring-white"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 pb-2">
                <span className="text-neutral-500 text-xs">Größe</span>
                <input
                  type="range"
                  min={16}
                  max={120}
                  value={stampSize}
                  onChange={(e) => setStampSize(Number(e.target.value))}
                  className="w-20 h-1 accent-white"
                />
                <span className="text-neutral-400 text-xs w-6 text-right">{stampSize}</span>
              </div>
            </div>
          </div>
        )}

        {/* farbpalette */}
        <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm flex-wrap max-w-[200px]">
          {PALETTE.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              title={color.label}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                selectedColor === color.value
                  ? "border-white scale-110"
                  : "border-neutral-700 hover:border-neutral-500"
              }`}
              style={{
                background: color.value === "rainbow"
                  ? "conic-gradient(#FF0000, #FF8C00, #FFD700, #00FF00, #00BFFF, #8A2BE2, #FF1493, #FF0000)"
                  : color.value,
              }}
            />
          ))}
        </div>

        {/* größe, deckkraft, undo/redo */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm flex-wrap">
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <input
              type="range"
              min={1}
              max={30}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16 h-1 accent-white"
              title="Pinselgröße"
            />
            <span className="text-neutral-400 text-xs w-5 text-center">{brushSize}</span>
          </div>
          <div className="w-px h-4 bg-neutral-700" />
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500 flex-shrink-0">
              <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
            </svg>
            <input
              type="range"
              min={5}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-16 h-1 accent-white"
              title="Deckkraft"
            />
            <span className="text-neutral-400 text-xs w-7 text-center">{opacity}%</span>
          </div>
          <div className="w-px h-4 bg-neutral-700" />

          <button
            onClick={undo}
            disabled={!canUndo}
            title="Rückgängig (Ctrl+Z)"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200 ${canUndo ? "text-neutral-300 hover:text-white hover:bg-white/10" : "text-neutral-700 cursor-not-allowed"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 105.64-11.36L1 10" />
            </svg>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            title="Wiederholen (Ctrl+Shift+Z)"
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all duration-200 ${canRedo ? "text-neutral-300 hover:text-white hover:bg-white/10" : "text-neutral-700 cursor-not-allowed"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-5.64-11.36L23 10" />
            </svg>
          </button>
          <div className="w-px h-4 bg-neutral-700" />
          <button
            onClick={clearCanvas}
            className="text-neutral-400 hover:text-white transition-colors duration-200 text-xs font-medium"
            title="Alles löschen"
          >
            Löschen
          </button>
        </div>

        {/* download dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu((p) => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm text-xs font-medium text-neutral-400 hover:text-white transition-all duration-200 w-full"
            title="Zeichnung als PNG speichern"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Bild speichern
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="ml-auto">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showDownloadMenu && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/95 backdrop-blur-sm overflow-hidden z-[100]">
              <button
                onClick={() => downloadImage(false)}
                className="w-full px-3 py-2 text-xs text-left text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Nur Zeichnung
              </button>
              <button
                onClick={() => downloadImage(true)}
                className="w-full px-3 py-2 text-xs text-left text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200 border-t border-neutral-800"
              >
                Mit Hintergrund
              </button>
            </div>
          )}
        </div>

        {/* effekt auswahl */}
        <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm flex-wrap">
          <span className="text-neutral-500 text-xs font-medium mr-1">Effekt</span>
          {EFFECTS.map((e) => (
            <button
              key={e.value}
              onClick={() => onParticleEffectChange(e.value)}
              title={e.label}
              className={`px-2 py-1 rounded-md text-xs transition-all duration-200 ${
                particleEffect === e.value
                  ? "bg-white/15 text-white"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* partikel an/aus + intensität */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
          <button
            onClick={onToggleStars}
            className={`flex items-center gap-1.5 transition-all duration-200 ${starsEnabled ? "text-white" : "text-neutral-500"}`}
            title={starsEnabled ? "Partikel ausschalten" : "Partikel einschalten"}
          >
            {particleEffect === "stars" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={starsEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
            )}
            {particleEffect === "snow" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
                <line x1="12" y1="2" x2="14" y2="5" />
                <line x1="12" y1="2" x2="10" y2="5" />
                <line x1="12" y1="22" x2="14" y2="19" />
                <line x1="12" y1="22" x2="10" y2="19" />
              </svg>
            )}
            {particleEffect === "firework" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="12" x2="12" y2="3" />
                <line x1="12" y1="12" x2="19" y2="5" />
                <line x1="12" y1="12" x2="21" y2="12" />
                <line x1="12" y1="12" x2="19" y2="19" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <line x1="12" y1="12" x2="5" y2="19" />
                <line x1="12" y1="12" x2="3" y2="12" />
                <line x1="12" y1="12" x2="5" y2="5" />
                {starsEnabled && <circle cx="12" cy="12" r="2" fill="currentColor" />}
              </svg>
            )}
            {particleEffect === "confetti" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={starsEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="5" height="3" rx="0.5" transform="rotate(-15 5 4)" />
                <rect x="14" y="2" width="5" height="3" rx="0.5" transform="rotate(20 16 3)" />
                <rect x="8" y="10" width="5" height="3" rx="0.5" transform="rotate(-30 10 11)" />
                <rect x="15" y="12" width="5" height="3" rx="0.5" transform="rotate(10 17 13)" />
                <rect x="4" y="18" width="5" height="3" rx="0.5" transform="rotate(25 6 19)" />
                <rect x="14" y="19" width="5" height="3" rx="0.5" transform="rotate(-20 16 20)" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={starsEnabled ? starIntensity : 0}
            onChange={(e) => {
              const val = Number(e.target.value)
              if (val > 0 && !starsEnabled) onToggleStars()
              if (val === 0 && starsEnabled) onToggleStars()
              onStarIntensityChange(val)
            }}
            className="w-20 h-1 accent-white"
            title="Partikel-Intensität"
          />
          <span className="text-neutral-400 text-xs w-6 text-right">{starsEnabled ? starIntensity : 0}</span>
        </div>

        {/* partikelfarben */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm overflow-hidden max-w-[220px]">
          <button
            onClick={() => setColorsOpen((p) => !p)}
            className="flex items-center justify-between w-full px-3 py-2 text-neutral-400 hover:text-white transition-colors duration-200"
          >
            <span className="text-xs font-medium">Partikelfarben</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className={`transition-transform duration-200 ${colorsOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div className={`transition-all duration-200 ${colorsOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
            <div className="flex items-center gap-1 px-3 pb-2 flex-wrap">
              {PARTICLE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onParticleColorsChange(preset.colors)}
                  title={preset.label}
                  className={`h-6 rounded-md text-xs transition-all duration-200 flex items-center overflow-hidden border ${
                    JSON.stringify(particleColors) === JSON.stringify(preset.colors)
                      ? "border-white"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {preset.colors.length === 0 ? (
                    <span className="px-2 text-neutral-400" style={{
                      background: "linear-gradient(90deg, #FF0000, #FF8C00, #FFD700, #00FF00, #00BFFF, #8A2BE2, #FF1493)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}>STD</span>
                  ) : (
                    preset.colors.map((color, i) => (
                      <span
                        key={i}
                        className="h-full"
                        style={{ backgroundColor: color, width: `${Math.max(14, 60 / preset.colors.length)}px` }}
                      />
                    ))
                  )}
                </button>
              ))}
              <div className="flex items-center gap-1 w-full mt-1">
                <label className="text-neutral-500 text-xs">Eigene:</label>
                <input
                  type="color"
                  className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                  onChange={(e) => {
                    const newColor = e.target.value
                    if (!particleColors.includes(newColor)) {
                      onParticleColorsChange([...particleColors, newColor])
                    }
                  }}
                  title="Farbe hinzufuegen"
                />
                {particleColors.length > 0 && (
                  <button
                    onClick={() => onParticleColorsChange([])}
                    className="text-neutral-500 hover:text-white text-xs ml-auto transition-colors"
                    title="Zuruecksetzen"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* cursor auswahl */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm overflow-hidden">
          <button
            onClick={() => setCursorOpen((p) => !p)}
            className="flex items-center justify-between w-full px-3 py-2 text-neutral-400 hover:text-white transition-colors duration-200"
          >
            <span className="text-xs font-medium">Cursor</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className={`transition-transform duration-200 ${cursorOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div className={`transition-all duration-200 ${cursorOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
            <div className="flex flex-col gap-1.5 px-3 pb-2">
              <div className="flex items-center gap-1 flex-wrap">
                {BUILTIN_CURSORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onCursorChange(c.value)}
                    title={c.label}
                    className={`px-2 py-1 rounded-md text-xs transition-all duration-200 ${
                      cursor === c.value
                        ? "bg-white/15 text-white"
                        : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {EMOJI_CURSORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onCursorChange(c.value)}
                    title={c.label}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-all duration-200 ${
                      cursor === c.value
                        ? "bg-white/15 ring-1 ring-white"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {c.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </>
  )
}
