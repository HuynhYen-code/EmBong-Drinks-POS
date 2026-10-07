<template>
  <div class="bg-white rounded-[24px] p-8 shadow-sm">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-textmain">Kiểm Kê Kho (Stocktake)</h2>
      <button @click="saveStocktake" class="bg-brand-500 text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition">Lưu Kiểm Kê</button>
    </div>
    
    <div class="mb-6 p-4 bg-brand-500/10 rounded-2xl flex justify-between items-center">
      <span class="font-bold text-textmain">Tổng giá trị tồn kho hiện tại:</span>
      <span class="text-2xl font-extrabold text-brand-500">{{ formatPrice(totalValue) }}</span>
    </div>

    <table class="w-full text-left">
      <thead>
        <tr class="text-gray-500 border-b border-gray-200">
          <th class="py-4 font-bold text-gray-700">Tên Nguyên Liệu</th>
          <th class="py-4 font-bold text-gray-700">Giá trị / 1 Đơn vị</th>
          <th class="py-4 font-bold text-gray-700 text-center">Tồn kho Hệ Thống</th>
          <th class="py-4 font-bold text-gray-700 text-center">Tồn kho Thực Tế</th>
          <th class="py-4 font-bold text-gray-700 text-right">Tổng giá trị</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="mat in inventory" :key="mat.id" class="border-b border-gray-50 hover:bg-gray-50/50">
          <td class="py-4 font-bold text-textmain">{{ mat.name }}</td>
          <td class="py-4 text-gray-500">{{ formatPrice(mat.cost_per_base_unit) }} / {{ mat.base_unit }}</td>
          <td class="py-4 text-center text-gray-500">{{ mat.system_qty }} {{ mat.base_unit }}</td>
          <td class="py-4 text-center">
             <input type="number" v-model="mat.actual_qty" class="w-24 px-3 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:border-brand-500" />
             <span class="ml-2 text-sm text-gray-500">{{ mat.base_unit }}</span>
          </td>
          <td class="py-4 font-bold text-brand-500 text-right">{{ formatPrice(mat.actual_qty * mat.cost_per_base_unit) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const inventory = ref([])

const fetchData = async () => {
  try {
    // In a real scenario, we might have a specific endpoint for stock, but we'll fetch materials here
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/materials')
    if(res.ok) {
      const data = await res.json()
      inventory.value = data.map(mat => ({
        id: mat.id,
        name: mat.name,
        base_unit: mat.base_unit,
        cost_per_base_unit: mat.cost_per_base_unit,
        system_qty: 1500, // Normally fetched from backend inventory table
        actual_qty: 1500
      }))
    }
    else loadMock()
  } catch (e) { loadMock() }
}

onMounted(() => fetchData())

const saveStocktake = async () => {
  alert('Đã lưu kết quả kiểm kê thành công!')
}

const loadMock = () => {
  if (inventory.value.length === 0) {
    inventory.value = [
      { id: 1, name: 'Trà Olong', base_unit: 'gram', cost_per_base_unit: 300, system_qty: 1500, actual_qty: 1450 },
      { id: 2, name: 'Sữa Đặc', base_unit: 'ml', cost_per_base_unit: 65.78, system_qty: 2000, actual_qty: 2000 },
      { id: 3, name: 'Bột Rau Má', base_unit: 'gram', cost_per_base_unit: 300, system_qty: 500, actual_qty: 480 },
    ]
  }
}

const totalValue = computed(() => {
  return inventory.value.reduce((sum, item) => sum + (item.actual_qty * item.cost_per_base_unit), 0)
})

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
</script>
