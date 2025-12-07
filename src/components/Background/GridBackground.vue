<template>
  <canvas ref="canvas" class="bg-grid"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let raf = 0
let running = true

// Mouse interaction
const mouse = { x: 0, y: 0, tx: 0, ty: 0 }

// Grid properties
const gridSize = 50 // Increased grid size for cleaner look
let offset = 0

function parseColor(c: string): [number, number, number] {
  if (!c) return [0, 0, 0]
  if (c.startsWith('#')) {
    const v = c.slice(1)
    const n = v.length === 3 ? v.split('').map(ch => ch + ch).join('') : v
    const r = parseInt(n.slice(0, 2), 16)
    const g = parseInt(n.slice(2, 4), 16)
    const b = parseInt(n.slice(4, 6), 16)
    return [r, g, b]
  }
  return [255, 255, 255]
}

function getThemeColors() {
  const cs = getComputedStyle(document.documentElement)
  const accent = parseColor(cs.getPropertyValue('--color-accent').trim())
  const text = parseColor(cs.getPropertyValue('--color-text-primary').trim())
  
  return { accent, text }
}

function resize() {
  if (!canvas.value) return
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = width
  canvas.value.height = height
}

function draw() {
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  // Smooth mouse
  mouse.x += (mouse.tx - mouse.x) * 0.1
  mouse.y += (mouse.ty - mouse.y) * 0.1
  
  const { accent, text } = getThemeColors()
  const time = performance.now() / 1000
  
  // Moving grid effect
  offset = (time * 20) % gridSize // Slower movement
  
  ctx.lineWidth = 1
  
  // Draw vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    const dx = x - mouse.x
    const dist = Math.abs(dx)
    const maxDist = 400
    
    let drawX = x
    let alpha = 0.03 // Very subtle base opacity
    
    if (dist < maxDist) {
      const force = Math.cos((dist / maxDist) * Math.PI / 2)
      drawX += (dx > 0 ? 1 : -1) * force * 15
      alpha += force * 0.08 // Subtle highlight
    }
    
    const [r, g, b] = x % (gridSize * 4) === 0 ? accent : text
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    
    ctx.beginPath()
    ctx.moveTo(drawX, 0)
    ctx.lineTo(drawX, height)
    ctx.stroke()
  }
  
  // Draw horizontal lines
  for (let y = offset; y <= height; y += gridSize) {
    const dy = y - mouse.y
    const dist = Math.abs(dy)
    const maxDist = 400
    
    let drawY = y
    let alpha = 0.03
    
    if (dist < maxDist) {
      const force = Math.cos((dist / maxDist) * Math.PI / 2)
      drawY += (dy > 0 ? 1 : -1) * force * 15
      alpha += force * 0.08
    }
    
    const [r, g, b] = Math.abs(y - offset) % (gridSize * 4) < 1 ? accent : text
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    
    ctx.beginPath()
    ctx.moveTo(0, drawY)
    ctx.lineTo(width, drawY)
    ctx.stroke()
  }
}

function loop() {
  if (!running) return
  draw()
  raf = requestAnimationFrame(loop)
}

function onMouseMove(e: MouseEvent) {
  mouse.tx = e.clientX
  mouse.ty = e.clientY
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouseMove)
  draw() // Initial draw
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<style scoped>
.bg-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
