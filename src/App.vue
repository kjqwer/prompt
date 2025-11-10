<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PromptEditor from './components/PromptEditor.vue'
import PromptManager from './components/PromptManager.vue'

const currentView = ref<'editor' | 'manager'>('editor')
const isDark = ref(false)

onMounted(() => {
  // 检测系统主题偏好
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = localStorage.getItem('theme') === 'dark' || (localStorage.getItem('theme') === null && prefersDark)
  updateTheme()
})

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  updateTheme()
}

function updateTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function switchView(view: 'editor' | 'manager') {
  currentView.value = view
}
</script>

<template>
  <div class="app-container" :class="{ dark: isDark }">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <div class="app-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span class="app-title">提示词编辑器</span>
          </div>
        </div>
        
        <nav class="header-nav">
          <button 
            class="nav-btn" 
            :class="{ active: currentView === 'editor' }"
            @click="switchView('editor')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            编辑器
          </button>
          <button 
            class="nav-btn" 
            :class="{ active: currentView === 'manager' }"
            @click="switchView('manager')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3h18v18H3zM9 9h6v6H9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            词库管理
          </button>
        </nav>

        <div class="header-right">
          <button class="theme-toggle" @click="toggleTheme" title="切换主题">
            <svg v-if="!isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
              <path d="m12 1 0 2m0 18 0 2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12l2 0m18 0 2 0M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <Transition name="view-transition" mode="out-in">
        <PromptEditor v-if="currentView === 'editor'" key="editor" />
        <PromptManager v-else key="manager" />
      </Transition>
    </main>
  </div>
</template>

<style>
/* 全局样式重置和变量定义 */
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
  color: var(--color-accent);
  font-weight: 600;
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

/* 主要内容区域 */
.app-main {
  flex: 1;
  overflow: hidden;
}

/* 视图切换动画 */
.view-transition-enter-active,
.view-transition-leave-active {
  transition: all 0.3s ease;
}

.view-transition-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.view-transition-leave-to {
  opacity: 0;
  transform: translateX(-20px);
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
