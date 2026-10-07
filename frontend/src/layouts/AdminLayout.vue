<template>
  <div class="flex h-screen w-full bg-surface text-textmain font-sans">
    <!-- Sidebar -->
    <div class="w-72 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
      <div class="p-8 border-b border-gray-100 flex items-center justify-center gap-3">
        <img src="/logo.jpg" class="h-16 w-auto object-contain" />
      </div>
      <nav class="flex-1 p-6 space-y-3 overflow-y-auto">
        <router-link to="/admin/dashboard" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">Thống Kê</router-link>
        <router-link to="/admin/materials" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">1. Nguyên Liệu Thô</router-link>
        <router-link to="/admin/preps" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">2. Bán Thành Phẩm</router-link>
        <router-link to="/admin/menu" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">3. Quản Lý Menu</router-link>
        <router-link to="/admin/toppings" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">4. Quản Lý Topping</router-link>
        <router-link to="/admin/stocktake" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-brand-500/10 hover:text-brand-500 font-bold transition-all" active-class="bg-brand-500/10 text-brand-500 border border-brand-500/20">5. Kiểm Kê Kho</router-link>
        
        <div class="pt-8 mt-8 border-t border-gray-100">
           <router-link to="/pos" class="block px-5 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 hover:text-textmain font-bold transition-all">⬅ Về Màn Hình POS</router-link>
        </div>
      </nav>
    </div>
    <!-- Main Content -->
    <div class="flex-1 flex flex-col h-full overflow-hidden relative">
      <header class="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-10 shadow-sm shrink-0">
         <h1 class="text-2xl font-extrabold text-textmain">Trang Quản Trị Hệ Thống</h1>
         <button @click="logout" class="bg-red-50 text-red-500 font-bold px-4 py-2 rounded-xl hover:bg-red-100 transition">Đăng Xuất</button>
      </header>
      <main class="flex-1 overflow-auto p-10 relative bg-surface">
         <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('adminAuth')
  router.push('/login')
}
</script>
