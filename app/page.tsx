"use client"

import { useState } from "react"
import ParticleSystem from "@/components/rainbow-stars"
import type { ParticleEffect } from "@/components/rainbow-stars"
import GithubLink from "@/components/github-link"
import DrawingCanvas from "@/components/drawing-canvas"

export default function Page() {
  const [starsEnabled, setStarsEnabled] = useState(true)
  const [starIntensity, setStarIntensity] = useState(50)
  const [particleEffect, setParticleEffect] = useState<ParticleEffect>("stars")
  const [particleColors, setParticleColors] = useState<string[]>([])
  const [cursor, setCursor] = useState<string>("crosshair")

  return (
    <main className="min-h-screen bg-black overflow-hidden relative select-none" onContextMenu={e => e.preventDefault()}>
      {/* deer watermark */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/deer.png"
          alt=""
          width={500}
          height={500}
          className="opacity-[0.12] select-none mix-blend-lighten"
          draggable={false}
        />
      </div>
      <DrawingCanvas
        starsEnabled={starsEnabled}
        onToggleStars={() => setStarsEnabled((prev) => !prev)}
        starIntensity={starIntensity}
        onStarIntensityChange={setStarIntensity}
        particleEffect={particleEffect}
        onParticleEffectChange={setParticleEffect}
        particleColors={particleColors}
        onParticleColorsChange={setParticleColors}
        cursor={cursor}
        onCursorChange={setCursor}
      />
      <ParticleSystem enabled={starsEnabled} intensity={starIntensity} effect={particleEffect} customColors={particleColors} />
      <GithubLink />
    </main>
  )
}
