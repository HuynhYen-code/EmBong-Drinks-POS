<template>
  <div class="bg-white rounded-[24px] p-8 shadow-sm">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-textmain">Quản Lý Nguyên Liệu Thô</h2>
      <button @click="showAddModal = true" class="bg-brand-500 text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition">Thêm Mới</button>
    </div>
    
    <table class="w-full text-left">
      <thead>
        <tr class="text-gray-500 border-b border-gray-200">
          <th class="py-4 font-bold text-gray-700">Tên Nguyên Liệu</th>
          <th class="py-4 font-bold text-gray-700">Đơn vị nhập</th>
          <th class="py-4 font-bold text-gray-700">Giá nhập</th>
          <th class="py-4 font-bold text-gray-700">Đơn vị cơ sở</th>
          <th class="py-4 font-bold text-gray-700">Hệ số quy đổi</th>
          <th class="py-4 font-bold text-brand-500">Giá vốn / ĐVCS</th>
          <th class="py-4 font-bold text-right text-gray-700">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="materials.length === 0">
           <td colspan="7" class="py-8 text-center text-gray-500 font-semibold">Chưa có dữ liệu. Hãy thêm nguyên liệu mới!</td>
        </tr>
        <tr v-for="mat in materials" :key="mat.id" class="border-b border-gray-50 hover:bg-gray-50/50">
          <td class="py-4 font-bold text-textmain">{{ mat.name }}</td>
          <td class="py-4">{{ mat.purchase_unit }}</td>
          <td class="py-4">{{ formatPrice(mat.current_price) }}</td>
          <td class="py-4">{{ mat.base_unit }}</td>
          <td class="py-4 text-gray-500">1 {{ mat.purchase_unit }} = {{ mat.conversion_rate }} {{ mat.base_unit }}</td>
          <td class="py-4 font-bold text-brand-500">{{ formatPrice(mat.cost_per_base_unit) }} / {{ mat.base_unit }}</td>
          <td class="py-4 text-right space-x-2">
            <button @click="openEditModal(mat)" class="px-3 py-1 bg-blue-50 text-blue-500 font-bold rounded-lg hover:bg-blue-100 transition">Sửa</button>
            <button @click="deleteMaterial(mat.id)" class="px-3 py-1 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100 transition">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Add Material Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 class="text-xl font-bold text-textmain">{{ editingId ? 'Sửa Nguyên Liệu' : 'Thêm Nguyên Liệu Thô' }}</h2>
          <button @click="closeModal" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600">X</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Tên nguyên liệu</label>
            <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Ví dụ: Trà Olong" />
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Đơn vị mua</label>
              <input v-model="form.purchase_unit" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Gói, Lon, Kg" />
            </div>
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Đơn vị cơ sở</label>
              <input v-model="form.base_unit" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="gram, ml" />
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Giá nhập (VNĐ)</label>
              <input v-model="form.current_price" type="number" class="w-full border border-gray-200 rounded-xl px-4 py-2" />
            </div>
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Hệ số quy đổi</label>
              <input v-model="form.conversion_rate" type="number" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="VD: 500" />
            </div>
          </div>
          <p class="text-sm text-gray-500 italic mt-2">
            * VD: Mua 1 Gói (ĐV mua) giá 150.000đ. Bên trong gói có 500 gram (ĐV cơ sở). Hãy điền Hệ số = 500.
          </p>
        </div>
        <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button @click="closeModal" class="px-6 py-2 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100">Hủy</button>
          <button @click="saveMaterial" class="px-6 py-2 rounded-xl font-bold text-white bg-brand-500 hover:opacity-90">
            {{ editingId ? 'Cập Nhật' : 'Lưu Nguyên Liệu' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const materials = ref([])
const showAddModal = ref(false)
const editingId = ref(null)
const form = ref({ name: '', purchase_unit: '', base_unit: '', current_price: 0, conversion_rate: 1 })

const closeModal = () => {
  showAddModal.value = false
  editingId.value = null
  form.value = { name: '', purchase_unit: '', base_unit: '', current_price: 0, conversion_rate: 1 }
}

const openEditModal = (mat) => {
  editingId.value = mat.id
  form.value = { ...mat }
  showAddModal.value = true
}

const fetchData = async () => {
  try {
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/materials')
    if(res.ok) materials.value = await res.json()
    else loadMock()
  } catch (e) { loadMock() }
}

onMounted(() => fetchData())

const saveMaterial = async () => {
  try {
    const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/materials' + (editingId.value ? `/${editingId.value}` : '')
    const method = editingId.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      alert(editingId.value ? 'Cập nhật thành công!' : 'Thêm thành công!')
      closeModal()
      fetchData() // reload list
    } else {
      const errData = await res.json()
      alert('Có lỗi xảy ra: ' + errData.error)
    }
  } catch (e) {
    alert('Không thể kết nối đến Backend, giả lập thành công!')
    const calculated_cost = form.value.current_price / form.value.conversion_rate;
    if (editingId.value) {
      const index = materials.value.findIndex(m => m.id === editingId.value)
      if (index > -1) materials.value[index] = { ...form.value, cost_per_base_unit: calculated_cost }
    } else {
      materials.value.push({
        id: Date.now(),
        ...form.value,
        cost_per_base_unit: calculated_cost
      })
    }
    closeModal()
  }
}

const deleteMaterial = async (id) => {
  if (!confirm('Bạn có chắc chắn muốn xóa nguyên liệu này?')) return

  try {
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + `/materials/${id}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      fetchData()
    } else {
      const errData = await res.json()
      alert('Không thể xóa: ' + errData.error)
    }
  } catch (e) {
    alert('Không thể kết nối đến Backend, giả lập xóa thành công!')
    materials.value = materials.value.filter(m => m.id !== id)
  }
}

const loadMock = () => {
  if (materials.value.length === 0) {
    materials.value = [
      { id: 1, name: 'Trà Olong', purchase_unit: 'Gói', base_unit: 'gram', current_price: 150000, conversion_rate: 500, cost_per_base_unit: 300 },
      { id: 2, name: 'Sữa Đặc', purchase_unit: 'Lon', base_unit: 'ml', current_price: 25000, conversion_rate: 380, cost_per_base_unit: 65.78 }
    ]
  }
}

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
</script>
