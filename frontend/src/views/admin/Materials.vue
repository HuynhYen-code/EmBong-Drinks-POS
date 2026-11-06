<template>
  <div class="space-y-5 pb-10">
    <!-- Header & Search -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-gray-100 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-extrabold text-textmain">Quản Lý Nguyên Liệu Thô</h2>
          <p class="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Khi cập nhật giá nhập nguyên liệu, giá vốn của Bán thành phẩm, Món nước & Topping sẽ tự động tính lại
          </p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-brand-500 text-white px-5 py-2.5 rounded-2xl font-extrabold text-sm hover:bg-brand-600 transition shadow-sm shrink-0"
        >
          + Thêm Nguyên Liệu
        </button>
      </div>

      <div class="relative">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm nhanh nguyên liệu (VD: tra olong, sua dac, tran chau...)"
          class="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-brand-500 outline-none"
        />
      </div>
    </div>

    <div v-if="filteredMaterials.length === 0" class="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 text-gray-400 font-bold">
      Chưa có nguyên liệu nào phù hợp.
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden md:block bg-white rounded-3xl p-6 shadow-2xs border border-gray-100 overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-xs font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-200">
            <th class="py-3.5 px-3">Tên Nguyên Liệu</th>
            <th class="py-3.5 px-3">Quy Cách Nhập</th>
            <th class="py-3.5 px-3 text-right">Giá Nhập</th>
            <th class="py-3.5 px-3 text-right">Giá Vốn / ĐV Cơ Sở</th>
            <th class="py-3.5 px-3 text-right">Tồn Kho</th>
            <th class="py-3.5 px-3 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 text-sm">
          <tr v-for="mat in filteredMaterials" :key="mat.id" class="hover:bg-gray-50/70 transition">
            <td class="py-3.5 px-3 font-extrabold text-textmain">{{ mat.name }}</td>
            <td class="py-3.5 px-3 text-gray-600 font-medium">
              1 {{ mat.purchase_unit }} = <strong>{{ Number(mat.conversion_rate) }}</strong> {{ mat.base_unit }}
            </td>
            <td class="py-3.5 px-3 text-right font-bold text-gray-700">{{ formatPrice(mat.current_price) }}</td>
            <td class="py-3.5 px-3 text-right font-black text-brand-600">
              {{ formatPrice(mat.cost_per_base_unit) }} / {{ mat.base_unit }}
            </td>
            <td class="py-3.5 px-3 text-right font-semibold text-gray-600">
              {{ Number(mat.stock_quantity || 0) }} {{ mat.base_unit }}
            </td>
            <td class="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
              <button @click="openEditModal(mat)" class="px-3.5 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition">Sửa</button>
              <button @click="deleteMaterial(mat)" class="px-3 py-1.5 bg-red-50 text-red-500 font-bold text-xs rounded-xl hover:bg-red-100 transition">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Responsive Cards -->
    <div v-if="filteredMaterials.length > 0" class="md:hidden grid grid-cols-1 gap-3">
      <div
        v-for="mat in filteredMaterials"
        :key="'m-' + mat.id"
        class="bg-white rounded-2xl p-4 shadow-2xs border border-gray-100 space-y-2.5"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-extrabold text-textmain text-base">{{ mat.name }}</h3>
            <p class="text-xs text-gray-500 font-semibold">
              1 {{ mat.purchase_unit }} ({{ formatPrice(mat.current_price) }}) = {{ Number(mat.conversion_rate) }} {{ mat.base_unit }}
            </p>
          </div>
          <div class="text-right shrink-0">
            <div class="font-black text-brand-600 text-sm">{{ formatPrice(mat.cost_per_base_unit) }}/{{ mat.base_unit }}</div>
            <div class="text-[11px] font-bold text-gray-400">Tồn: {{ Number(mat.stock_quantity || 0) }} {{ mat.base_unit }}</div>
          </div>
        </div>
        <div class="pt-2 border-t border-gray-100 flex justify-end gap-2">
          <button @click="openEditModal(mat)" class="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl">Sửa</button>
          <button @click="deleteMaterial(mat)" class="px-4 py-1.5 bg-red-50 text-red-500 font-bold text-xs rounded-xl">Xóa</button>
        </div>
      </div>
    </div>

    <!-- Modal Thêm / Sửa Nguyên Liệu -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 class="text-lg sm:text-xl font-extrabold text-textmain">{{ editingId ? 'Sửa Nguyên Liệu Thô' : 'Thêm Nguyên Liệu Thô' }}</h2>
          <button @click="closeModal" class="w-9 h-9 bg-gray-100 rounded-full font-bold text-gray-600">✕</button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto">
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Tên nguyên liệu *</label>
            <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="VD: Trà Olong Lài" />
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Đơn vị mua (Nhập vào) *</label>
              <input v-model="form.purchase_unit" type="text" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="Gói, Hộp, Chai, Kg..." />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Đơn vị pha chế (Cơ sở) *</label>
              <input v-model="form.base_unit" type="text" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="gram, ml, viên..." />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Giá nhập / 1 {{ form.purchase_unit || 'ĐV mua' }} (VNĐ)</label>
              <input v-model.number="form.current_price" type="number" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Quy đổi (1 {{ form.purchase_unit || 'ĐV mua' }} = ? {{ form.base_unit || 'ĐVCS' }})</label>
              <input v-model.number="form.conversion_rate" type="number" step="any" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="VD: 500" />
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-brand-50 border border-brand-200/80 flex items-center justify-between">
            <span class="text-xs font-bold text-brand-700">Giá vốn tự động tính:</span>
            <span class="text-base font-black text-brand-700">
              {{ formatPrice(liveBaseCost) }} / 1 {{ form.base_unit || 'đơn vị' }}
            </span>
          </div>

          <p class="text-xs text-gray-500 leading-relaxed">
            💡 Ví dụ: Mua 1 <strong>Gói</strong> trà giá <strong>150.000đ</strong>, bên trong gói nặng <strong>500 gram</strong> → Điền Giá nhập = 150000, Quy đổi = 500.
          </p>
        </div>

        <div class="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5">
          <button @click="closeModal" class="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-white border border-gray-200">Hủy</button>
          <button @click="saveMaterial" class="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-brand-500 hover:bg-brand-600">
            {{ editingId ? 'Lưu Cập Nhật' : 'Lưu Nguyên Liệu' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE, removeAccents, formatPrice, showToast } from '../../utils/helpers'

const materials = ref([])
const searchQuery = ref('')
const showAddModal = ref(false)
const editingId = ref(null)
const form = ref({ name: '', purchase_unit: 'Gói', base_unit: 'gram', current_price: 0, conversion_rate: 500 })

const filteredMaterials = computed(() => {
  const q = removeAccents(searchQuery.value)
  if (!q) return materials.value
  return materials.value.filter(m => removeAccents(m.name).includes(q))
})

const liveBaseCost = computed(() => {
  const rate = Number(form.value.conversion_rate) || 1
  const price = Number(form.value.current_price) || 0
  return rate > 0 ? price / rate : 0
})

const openCreateModal = () => {
  editingId.value = null
  form.value = { name: '', purchase_unit: 'Gói', base_unit: 'gram', current_price: 0, conversion_rate: 500 }
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingId.value = null
}

const openEditModal = (mat) => {
  editingId.value = mat.id
  form.value = {
    name: mat.name,
    purchase_unit: mat.purchase_unit,
    base_unit: mat.base_unit,
    current_price: Number(mat.current_price),
    conversion_rate: Number(mat.conversion_rate)
  }
  showAddModal.value = true
}

const fetchData = async () => {
  try {
    const res = await fetch(`${API_BASE}/materials`)
    if (res.ok) materials.value = await res.json()
  } catch (e) {
    showToast('Không thể tải danh sách nguyên liệu', 'error')
  }
}

onMounted(() => fetchData())

const saveMaterial = async () => {
  if (!form.value.name || !String(form.value.name).trim()) {
    showToast('Vui lòng nhập tên nguyên liệu!', 'warning')
    return
  }

  try {
    const url = `${API_BASE}/materials${editingId.value ? '/' + editingId.value : ''}`
    const method = editingId.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      showToast(editingId.value ? 'Đã cập nhật nguyên liệu & tính lại giá vốn BOM!' : 'Đã thêm nguyên liệu mới!')
      closeModal()
      await fetchData()
    } else {
      const errData = await res.json()
      showToast(errData.error || 'Có lỗi xảy ra', 'error')
    }
  } catch (e) {
    showToast('Không thể kết nối đến Backend!', 'error')
  }
}

const deleteMaterial = async (mat) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa nguyên liệu "${mat.name}"?`)) return
  try {
    const res = await fetch(`${API_BASE}/materials/${mat.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast(`Đã xóa nguyên liệu "${mat.name}"`)
      await fetchData()
    } else {
      const errData = await res.json()
      showToast(errData.error || 'Không thể xóa nguyên liệu', 'error')
    }
  } catch (e) {
    showToast('Lỗi kết nối máy chủ', 'error')
  }
}
</script>
