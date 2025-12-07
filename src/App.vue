<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import PromptEditor from './components/PromptEditor.vue'
import PromptManager from './components/PromptManager.vue'
import PresetManager from './components/PresetManager.vue'
import BackgroundCanvas from './components/Background/BackgroundCanvas.vue'
import GradientBackground from './components/Background/GradientBackground.vue'
import GridBackground from './components/Background/GridBackground.vue'
import DevtoolsBanner from './components/DevtoolsBanner.vue'
import { usePromptStore } from './stores/promptStore'

// Icons
import IconEditor from './components/icons/IconEditor.vue'
import IconPresets from './components/icons/IconPresets.vue'
import IconManager from './components/icons/IconManager.vue'
import IconTheme from './components/icons/IconTheme.vue'
import IconBackground from './components/icons/IconBackground.vue'
import IconGithub from './components/icons/IconGithub.vue'

const currentView = ref<'editor' | 'manager' | 'presets'>('editor')
const isDark = ref(false)
const bgModes = ['particles', 'grid', 'gradient', 'off'] as const
type BgMode = typeof bgModes[number]
const currentBgMode = ref<BgMode>('particles')

const store = usePromptStore()

onMounted(() => {
  // 检测系统主题偏好
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = localStorage.getItem('theme') === 'dark' || (localStorage.getItem('theme') === null && prefersDark)
  updateTheme()
  // 初始化词库与编辑器状态（仅一次）
  store.initialize()
  
  // Initialize background mode
  const savedMode = localStorage.getItem('bg.mode') as BgMode | null
  const legacyBg = localStorage.getItem('bg.enabled')
  
  if (savedMode && bgModes.includes(savedMode)) {
    currentBgMode.value = savedMode
  } else if (legacyBg !== null) {
    // Migrate legacy setting
    currentBgMode.value = legacyBg === 'on' ? 'particles' : 'off'
  } else {
    currentBgMode.value = 'particles'
  }
})

function toggleTheme(event: MouseEvent) {
  const isAppearanceTransition = 'startViewTransition' in document
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isAppearanceTransition) {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    updateTheme()
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  )

  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    updateTheme()
    await nextTick()
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`
    ]
    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 400,
        easing: 'ease-out',
        pseudoElement: '::view-transition-new(root)',
      }
    )
  })
}

function updateTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function switchView(view: 'editor' | 'manager' | 'presets') {
  currentView.value = view
}

function cycleBackground() {
  const currentIndex = bgModes.indexOf(currentBgMode.value)
  const nextIndex = (currentIndex + 1) % bgModes.length
  const nextMode = bgModes[nextIndex]
  if (nextMode) {
    currentBgMode.value = nextMode
    localStorage.setItem('bg.mode', currentBgMode.value)
  }
}

const bgModeLabel = computed(() => {
  switch (currentBgMode.value) {
    case 'particles': return '粒子特效'
    case 'grid': return '网格特效'
    case 'gradient': return '渐变特效'
    case 'off': return '关闭背景'
    default: return ''
  }
})
</script>

<template>
  <div class="app-container" :class="{ dark: isDark }">
    <BackgroundCanvas v-if="currentBgMode === 'particles'" />
    <GridBackground v-else-if="currentBgMode === 'grid'" />
    <GradientBackground v-else-if="currentBgMode === 'gradient'" />
    <DevtoolsBanner />
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">  
        <div class="header-left">
          <a
            class="app-logo"
            href="https://github.com/kjqwer/prompt"
            target="_blank"
            rel="noopener noreferrer"
            title="打开 GitHub 仓库"
          >
            <!-- GitHub 标志 -->
            <IconGithub />
            <span class="app-title">提示词编辑器</span>
          </a>
        </div>
        
        <nav class="header-nav">
          <button 
            class="nav-btn" 
            :class="{ active: currentView === 'editor' }"
            @click="switchView('editor')"
          >
            <IconEditor width="16" height="16" />
            <span>编辑器</span>
          </button>
          <button 
            class="nav-btn" 
            :class="{ active: currentView === 'presets' }"
            @click="switchView('presets')"
          >
            <IconPresets width="16" height="16" />
            <span>预设管理</span>
          </button>
          <button 
            class="nav-btn" 
            :class="{ active: currentView === 'manager' }"
            @click="switchView('manager')"
          >
            <IconManager width="16" height="16" />
            <span>词库管理</span>
          </button>
        </nav>

        <div class="header-right">
          <button class="theme-toggle" @click="toggleTheme" title="切换主题">
            <IconTheme :is-dark="isDark" />
          </button>
          <button class="bg-toggle" :class="{ active: currentBgMode !== 'off' }" @click="cycleBackground" :title="bgModeLabel">
            <IconBackground :mode="currentBgMode" />
          </button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <Transition name="view-transition" mode="out-in">
        <PromptEditor v-if="currentView === 'editor'" key="editor" />
        <PromptManager v-else-if="currentView === 'manager'" key="manager" />
        <PresetManager v-else-if="currentView === 'presets'" key="presets" />
      </Transition>
    </main>
  </div>
</template>

<style>
/* View Transitions API styles */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 9999;
}

:root {
  /* 亮色主题 */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-border: #e2e8f0;
  --color-border-hover: #cbd5e1;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #64748b;
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-light: #dbeafe;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --color-github: #181717;
}

.dark {
  /* 暗色主题 */
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  --color-border: #475569;
  --color-border-hover: #64748b;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-tertiary: #94a3b8;
  --color-accent: #60a5fa;
  --color-accent-hover: #3b82f6;
  --color-accent-light: #1e3a8a;
  --color-github: #f8fafc;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  transition: color 0.3s ease, background-color 0.3s ease;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
}

/* 顶部导航栏样式 */
.app-header {
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-github);
  font-weight: 600;
  text-decoration: none;
}

.app-title {
  font-size: 1.125rem;
  color: var(--color-text-primary);
}

.header-nav {
  display: flex;
  gap: 0.25rem;
  background-color: var(--color-bg-secondary);
  padding: 0.25rem;
  border-radius: var(--radius-lg);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
}

.nav-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.nav-btn.active {
  background-color: var(--color-accent);
  color: white;
  box-shadow: var(--shadow-sm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.bg-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.bg-toggle:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.bg-toggle.active {
  background-color: var(--color-accent);
  color: white;
}

/* 主要内容区域 */
.app-main {
  flex: 1;
  overflow: hidden;
}

/* 视图切换动画 */
.view-transition-enter-active,
.view-transition-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.view-transition-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.view-transition-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 0.75rem;
  }
  
  .app-logo .app-title {
    display: none;
  }
  
  .nav-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .nav-btn svg {
    width: 14px;
    height: 14px;
  }
}

@media (max-width: 640px) {
  .header-nav {
    gap: 0.125rem;
    padding: 0.125rem;
  }
  
  .nav-btn {
    padding: 0.375rem 0.5rem;
  }
  
  .nav-btn span {
    display: none;
  }
}
</style>
