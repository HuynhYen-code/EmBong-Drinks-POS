<template>
  <div class="flex h-screen w-full bg-surface text-textmain font-sans overflow-hidden">
    
    <!-- Mobile Sidebar Overlay -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>

    <!-- Sidebar -->
    <div :class="[
        'fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200 flex flex-col z-50 shadow-sm transition-transform duration-300 ease-in-out',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]">
      <div class="p-8 border-b border-gray-100 flex items-center justify-center gap-3">
        <img src="/logo.jpg" class="h-16 w-auto object-contain" />
      </div>
      <nav class="flex-1 p-6 space-y-3 overflow-y-auto">
        <router-link @click="isSidebarOpen = false" to="/admin/dashboard" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">Thống Kê</router-link>
        <router-link @click="isSidebarOpen = false" to="/admin/materials" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">1. Nguyên Liệu Thô</router-link>
        <router-link @click="isSidebarOpen = false" to="/admin/preps" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">2. Bán Thành Phẩm</router-link>
        <router-link @click="isSidebarOpen = false" to="/admin/menu" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">3. Quản Lý Menu</router-link>
        <router-link @click="isSidebarOpen = false" to="/admin/toppings" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">4. Quản Lý Topping</router-link>
        <router-link @click="isSidebarOpen = false" to="/admin/stocktake" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">5. Kiểm Kê Kho</router-link>
        
        <div class="pt-8 mt-8 border-t border-gray-100">
           <router-link to="/pos" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 hover:text-textmain font-bold transition-all">⬅ Về Màn Hình POS</router-link>
        </div>
      </nav>
    </div>
    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-full overflow-hidden relative">
      <header class="h-16 lg:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-10 shadow-sm shrink-0">
         <div class="flex items-center gap-3">
           <button @click="isSidebarOpen = true" class="p-2 lg:hidden text-gray-500 hover:bg-gray-100 rounded-lg">
             <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
           </button>
           <h1 class="text-xl lg:text-2xl font-extrabold text-textmain truncate">Trang Quản Trị</h1>
         </div>
         <button @click="logout" class="bg-red-50 text-red-500 font-bold px-3 py-2 lg:px-4 lg:py-2 text-sm lg:text-base rounded-xl hover:bg-red-100 transition shrink-0">Đăng Xuất</button>
      </header>
      <main class="flex-1 overflow-auto p-4 lg:p-10 relative bg-surface">
         <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isSidebarOpen = ref(false)

const logout = () => {
  localStorage.removeItem('adminAuth')
  router.push('/login')
}
</script>
