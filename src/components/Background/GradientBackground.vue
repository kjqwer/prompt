<template>
  <canvas ref="canvas" class="bg-gradient"></canvas>
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
  const primary = parseColor(cs.getPropertyValue('--color-bg-primary').trim())
  
  return { accent, primary }
}

function resize() {
  if (!canvas.value) return
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = width
  canvas.value.height = height
}

// Mesh points
interface Point {
  x: number
  y: number
  originX: number
  originY: number
  noiseOffsetX: number
  noiseOffsetY: number
}

const points: Point[] = []
const gridSize = 100 // Size of mesh cells

function initMesh() {
  points.length = 0
  const cols = Math.ceil(width / gridSize) + 2
  const rows = Math.ceil(height / gridSize) + 2
  
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = (i - 1) * gridSize
      const y = (j - 1) * gridSize
      points.push({
        x,
        y,
        originX: x,
        originY: y,
        noiseOffsetX: Math.random() * 1000,
        noiseOffsetY: Math.random() * 1000
      })
    }
  }
}

function draw() {
  if (!ctx) return
  
  ctx.clearRect(0, 0, width, height)
  
  // Smooth mouse
  mouse.x += (mouse.tx - mouse.x) * 0.05
  mouse.y += (mouse.ty - mouse.y) * 0.05
  
  const time = performance.now() / 2000
  const { accent, primary } = getThemeColors()
  
  // Update points
  points.forEach(p => {
    // Simplex-like noise movement (simplified with sine/cos)
    const noiseX = Math.sin(time + p.noiseOffsetX) * 30
    const noiseY = Math.cos(time + p.noiseOffsetY) * 30
    
    // Mouse influence (gentle push)
    const dx = mouse.x - p.originX
    const dy = mouse.y - p.originY
    const dist = Math.sqrt(dx*dx + dy*dy)
    const maxDist = 400
    let mouseX = 0
    let mouseY = 0
    
    if (dist < maxDist) {
      const force = Math.pow(1 - dist / maxDist, 2) * 40
      const angle = Math.atan2(dy, dx)
      mouseX = Math.cos(angle) * force
      mouseY = Math.sin(angle) * force
    }
    
    p.x = p.originX + noiseX - mouseX
    p.y = p.originY + noiseY - mouseY
  })
  
  // Draw mesh
  ctx.lineWidth = 1
  // Create gradient for lines
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.05)`)
  gradient.addColorStop(0.5, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.1)`)
  gradient.addColorStop(1, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.05)`)
  
  ctx.strokeStyle = gradient
  
  const cols = Math.ceil(width / gridSize) + 2
  const rows = Math.ceil(height / gridSize) + 2
  
  // Draw connections
  ctx.beginPath()
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const index = i * rows + j
      const p = points[index]
      
      if (i < cols - 1) {
        const right = points[(i + 1) * rows + j]
        if (p) ctx.moveTo(p.x, p.y)
        if (right) ctx.lineTo(right.x, right.y)
      }
      
      if (j < rows - 1) {
        const bottom = points[i * rows + (j + 1)]
        if (p) ctx.moveTo(p.x, p.y)
        if (bottom) ctx.lineTo(bottom.x, bottom.y)
      }
    }
  }
  ctx.stroke()
  
  // Fill subtle gradient background
  const bgGradient = ctx.createRadialGradient(
    mouse.x, mouse.y, 0,
    mouse.x, mouse.y, Math.max(width, height)
  )
  bgGradient.addColorStop(0, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.03)`)
  bgGradient.addColorStop(1, 'rgba(0,0,0,0)')
  
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)
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

function onResize() {
  resize()
  initMesh()
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  resize()
  initMesh()
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  draw() // Initial draw
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<style scoped>
.bg-gradient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
