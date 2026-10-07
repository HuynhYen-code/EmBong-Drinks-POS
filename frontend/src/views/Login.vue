<template>
  <div class="min-h-screen flex items-center justify-center bg-surface p-4">
    <div class="bg-white rounded-3xl shadow-xl max-w-sm w-full p-8 text-center border border-gray-100">
      <div class="w-16 h-16 bg-brand-500/10 rounded-2xl mx-auto flex items-center justify-center mb-6">
        <svg class="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-textmain mb-2">Trang Quản Trị</h2>
      <p class="text-gray-500 text-sm mb-6">Vui lòng nhập mật khẩu để truy cập</p>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <input 
            type="password" 
            v-model="password" 
            class="w-full text-center border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:border-brand-500 transition-colors bg-gray-50 focus:bg-white" 
            placeholder="••••••••" 
            autofocus 
          />
        </div>
        <div v-if="errorMsg" class="text-red-500 text-sm font-bold">{{ errorMsg }}</div>
        
        <button type="submit" class="w-full bg-brand-500 text-white font-bold rounded-xl py-3 hover:opacity-90 transition-opacity">
          Đăng Nhập
        </button>
      </form>
      <div class="mt-6">
        <router-link to="/pos" class="text-brand-500 text-sm font-bold hover:underline">Quay về Màn hình Bán Hàng</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const errorMsg = ref('')

const handleLogin = () => {
  // Lấy mật khẩu từ biến môi trường, hoặc dùng mặc định là embong123
  const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'embong123'
  
  if (password.value === correctPassword) {
    localStorage.setItem('adminAuth', 'true')
    router.push('/admin/dashboard')
  } else {
    errorMsg.value = 'Mật khẩu không đúng!'
    password.value = ''
  }
}
</script>
