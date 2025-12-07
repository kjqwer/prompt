<template>
  <canvas ref="canvas" class="bg-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let dpr = 1
let raf = 0
let running = true

type Particle = {
  baseX: number
  baseY: number
  r: number
  vx: number
  vy: number
  speed: number
  phase: number
  depth: number
  alpha: number
}

let particles: Particle[] = []
let mouseX = 0
let mouseY = 0
let lastThemeKey = ''

function parseColor(c: string): [number, number, number] {
  const s = c.trim()
  if (s.startsWith('#')) {
    const v = s.slice(1)
    const n = v.length === 3 ? v.split('').map(ch => ch + ch).join('') : v
    const r = parseInt(n.slice(0, 2), 16)
    const g = parseInt(n.slice(2, 4), 16)
    const b = parseInt(n.slice(4, 6), 16)
    return [r, g, b]
  }
  const m = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return [219, 234, 254]
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t)
  ]
}

function luminance([r, g, b]: [number, number, number]) {
  const sr = r / 255
  const sg = g / 255
  const sb = b / 255
  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
}

function getPalette() {
  const cs = getComputedStyle(document.documentElement)
  const accent = cs.getPropertyValue('--color-accent-light') || '#dbeafe'
  const bg = cs.getPropertyValue('--color-bg-primary') || '#ffffff'
  const a = parseColor(accent)
  const b = parseColor(bg)
  const mixed = mix(b, a, 3)
  const key = `${mixed.join(',')}`
  const lum = luminance(b)
  const alpha = lum > 0.7 ? 0.42 : 0.28
  return { rgb: mixed, key, alpha }
}

function resize() {
  if (!canvas.value) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = Math.floor(width * dpr)
  canvas.value.height = Math.floor(height * dpr)
  canvas.value.style.width = `${width}px`
  canvas.value.style.height = `${height}px`
}

function initParticles() {
  const area = width * height
  const count = Math.max(80, Math.floor(area / (60 * 60)))
  particles = Array.from({ length: count }).map(() => {
    const depth = 0.35 + Math.random() * 0.65
    const r = 0.9 + Math.random() * 1.6
    const speed = 0.4 + Math.random() * 0.8
    const vx = (Math.random() - 0.5) * 0.6
    const vy = (Math.random() - 0.5) * 0.6
    return {
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      r,
      vx,
      vy,
      speed,
      phase: Math.random() * Math.PI * 2,
      depth,
      alpha: 0.7 + Math.random() * 0.3
    }
  })
}

function draw() {
  if (!ctx) return
  const pal = getPalette()
  if (pal.key !== lastThemeKey) lastThemeKey = pal.key
  ctx.clearRect(0, 0, width * dpr, height * dpr)
  ctx.globalCompositeOperation = 'source-over'
  const [r, g, b] = pal.rgb
  const t = performance.now() / 1000
  const mx = (mouseX / width - 0.5)
  const my = (mouseY / height - 0.5)
  const offsetX = mx * 160
  const offsetY = my * 100
  for (const p of particles) {
    const x = (p.baseX + Math.sin(t * p.speed + p.phase) * p.vx * 50 + offsetX * p.depth) * dpr
    const y = (p.baseY + Math.cos(t * p.speed + p.phase) * p.vy * 50 + offsetY * p.depth) * dpr
    const a = pal.alpha * p.alpha * (0.85 + 0.15 * Math.sin(t * (p.speed * 0.6) + p.phase))
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0.5, p.r * dpr), 0, Math.PI * 2)
    ctx.fill()
  }
}

let lastFrame = 0

function loop(ts: number) {
  if (!running) return
  if (ts - lastFrame > 33) {
    lastFrame = ts
    draw()
  }
  raf = requestAnimationFrame(loop)
}

function onMouseMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY
}

function onVisibilityChange() {
  running = !document.hidden
  if (running) {
    lastFrame = 0
    raf = requestAnimationFrame(loop)
  } else {
    cancelAnimationFrame(raf)
  }
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  resize()
  initParticles()
  window.addEventListener('resize', () => {
    resize()
    initParticles()
  })
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  draw() // Initial draw to ensure no flicker
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(raf)
  window.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style>
.bg-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>