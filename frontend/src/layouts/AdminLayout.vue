<template>
  <div class="flex h-screen w-full bg-surface text-textmain font-sans overflow-hidden">
    <!-- Mobile Sidebar Overlay -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"></div>

    <!-- Sidebar -->
    <aside :class="[
        'fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200 flex flex-col z-50 shadow-lg lg:shadow-xs transition-transform duration-300 ease-in-out',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]">
      <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Em Bông" class="h-12 w-auto object-contain rounded-xl" />
          <div>
            <div class="font-extrabold text-brand-600 text-base leading-tight">Em Bông</div>
            <div class="text-[11px] font-bold text-gray-400">Quản lý vận hành</div>
          </div>
        </div>
        <button @click="isSidebarOpen = false" class="lg:hidden w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold">✕</button>
      </div>

      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <router-link
          v-for="nav in navItems"
          :key="nav.to"
          @click="isSidebarOpen = false"
          :to="nav.to"
          class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-gray-600 hover:bg-brand-50 hover:text-brand-600 font-bold text-sm transition-all"
          active-class="bg-brand-50 text-brand-600 border border-brand-200/80 shadow-2xs"
        >
          <span class="text-lg w-6 text-center">{{ nav.icon }}</span>
          <span>{{ nav.label }}</span>
        </router-link>

        <div class="pt-4 mt-4 border-t border-gray-100">
          <router-link
            to="/pos"
            class="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-brand-500 text-white hover:bg-brand-600 font-bold text-sm shadow-sm transition-all"
          >
            <span>🍹</span>
            <span>Màn Hình Bán Hàng (POS)</span>
          </router-link>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shadow-2xs shrink-0 gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <button @click="isSidebarOpen = true" class="p-2 lg:hidden text-gray-600 hover:bg-gray-100 rounded-xl shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 class="text-base sm:text-xl font-extrabold text-textmain truncate">{{ currentPageTitle }}</h1>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <router-link to="/pos" class="lg:hidden bg-brand-50 text-brand-600 border border-brand-200 font-bold px-3 py-1.5 text-xs rounded-xl hover:bg-brand-100 transition">
            🍹 POS
          </router-link>
          <button @click="logout" class="bg-red-50 text-red-600 font-bold px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-xl hover:bg-red-100 transition">
            Đăng xuất
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 relative bg-surface">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const isSidebarOpen = ref(false)

const navItems = [
  { to: '/admin/dashboard', icon: '📊', label: 'Tổng Quan & Thống Kê' },
  { to: '/admin/menu', icon: '🧋', label: '1. Thực Đơn & Công Thức' },
  { to: '/admin/toppings', icon: '🍮', label: '2. Quản Lý Topping' },
  { to: '/admin/preps', icon: '🧪', label: '3. Bán Thành Phẩm (Prep)' },
  { to: '/admin/materials', icon: '📦', label: '4. Nguyên Liệu Thô' },
  { to: '/admin/stocktake', icon: '📋', label: '5. Kiểm Kê Tồn Kho' },
  { to: '/admin/expenses', icon: '💰', label: '6. Sổ Thu Chi & Két Tiền' }
]

const currentPageTitle = computed(() => {
  const found = navItems.find(n => route.path.startsWith(n.to))
  return found ? found.label : 'Trang Quản Trị'
})

const logout = () => {
  localStorage.removeItem('adminAuth')
  router.push('/login')
}
</script>
