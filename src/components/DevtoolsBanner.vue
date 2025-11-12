<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

let running = false
let watcher: number | null = null
let anim: number | null = null
let frame = 0

const repoUrl = 'https://github.com/kjqwer/prompt'

function waveFrame(f: number, width: number) {
  const chars = ['▁','▂','▃','▄','▅','▆','▇','█']
  let fmt = ''
  const styles: string[] = []
  for (let i = 0; i < width; i++) {
    const t = (f * 0.35) + (i * 0.25)
    const y = Math.sin(t)
    const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(((y + 1) / 2) * (chars.length - 1))))
    const hue = (i * 12 + f * 9) % 360
    fmt += '%c' + chars[idx]
    styles.push(`color:hsl(${hue} 90% 60%); font-weight:900; font-size:16px;`)
  }
  console.log(fmt, ...styles)
}

function renderFrame() {
  console.clear()
  waveFrame(frame, 36)
  const title = '%c✦ Prompt · 提示词编辑器'
  const titleStyle = 'padding:12px 18px; font-size:16px; font-weight:800; color:#fff; background:linear-gradient(90deg,#0ea5e9,#22d3ee,#a78bfa,#f472b6,#fb7185); border-radius:10px; text-shadow:0 1px 1px rgba(0,0,0,.2);'
  console.log(title, titleStyle)
  const linkLabel = '%cGitHub ↗ ' + repoUrl
  const linkStyle = 'color:#93c5fd; font-size:13px; font-weight:700;'
  console.log(linkLabel, linkStyle)
  const badge = '%c Inspire · Create · Play '
  const badgeStyle = 'padding:6px 12px; font-size:12px; color:#111827; background:linear-gradient(90deg,#fde68a,#86efac,#93c5fd,#c4b5fd,#fbcfe8); border-radius:999px;'
  console.log(badge, badgeStyle)
  frame++
}

function startAnim() {
  if (running) return
  running = true
  if (anim) clearInterval(anim)
  anim = window.setInterval(renderFrame, 300)
}

function stopAnim() {
  if (!running) return
  running = false
  if (anim) {
    clearInterval(anim)
    anim = null
  }
  console.clear()
}

function isDevtoolsOpen() {
  const threshold = 160
  const w = Math.abs(window.outerWidth - window.innerWidth)
  const h = Math.abs(window.outerHeight - window.innerHeight)
  return w > threshold || h > threshold
}

onMounted(() => {
  watcher = window.setInterval(() => {
    if (isDevtoolsOpen()) startAnim()
    else stopAnim()
  }, 600)
})

onBeforeUnmount(() => {
  if (watcher) {
    clearInterval(watcher)
    watcher = null
  }
  stopAnim()
})
</script>

<template></template>