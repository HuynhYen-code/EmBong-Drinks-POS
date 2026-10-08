<template>
  <div class="bg-white rounded-[24px] p-8 shadow-sm">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-textmain">Quản Lý Menu & Topping</h2>
      <button @click="openCreate" class="bg-brand-500 text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition">Thêm Món Mới</button>
    </div>
    
    <table class="w-full text-left">
      <thead>
        <tr class="text-gray-500 border-b border-gray-200">
          <th class="py-4 font-bold text-gray-700">Tên Món / Size</th>
          <th class="py-4 font-bold text-gray-700 w-16">Hình</th>
          <th class="py-4 font-bold text-gray-700">Công thức (BOM)</th>
          <th class="py-4 font-bold text-gray-700">Giá Bán</th>
          <th class="py-4 font-bold text-brand-500">Giá Vốn (COGS)</th>
          <th class="py-4 font-bold text-orange-500">Food Cost (%)</th>
          <th class="py-4 font-bold text-gray-700 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="menu.length === 0">
           <td colspan="7" class="py-8 text-center text-gray-500 font-semibold">Chưa có dữ liệu món ăn.</td>
        </tr>
        <tr v-for="item in menu" :key="item.id" class="border-b border-gray-50 hover:bg-gray-50/50">
          <td class="py-4">
             <div class="font-bold text-textmain">{{ item.name }}</div>
             <div class="text-sm text-gray-500">Size: {{ item.size }}</div>
          </td>
          <td class="py-4">
             <img :src="item.image_url" class="w-10 h-10 object-cover rounded-xl shadow-sm border border-gray-100" />
          </td>
          <td class="py-4 text-sm text-gray-500">
             <div v-for="ing in item.ingredients" :key="ing.id || ing.name">
               • {{ ing.quantity }} {{ ing.unit }} {{ ing.name }}
             </div>
          </td>
          <td class="py-4 font-semibold text-gray-700">{{ formatPrice(item.price) }}</td>
          <td class="py-4 font-bold text-brand-500">{{ formatPrice(item.cogs) }}</td>
          <td class="py-4 font-bold" :class="(item.price > 0 && item.cogs / item.price > 0.3) ? 'text-red-500' : 'text-green-500'">
             {{ item.price > 0 ? ((item.cogs / item.price) * 100).toFixed(1) : 0 }}%
          </td>
          <td class="py-4 text-right">
             <button @click="openEdit(item)" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg font-semibold text-sm transition">Sửa</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Add/Edit Menu Item Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 class="text-xl font-bold text-textmain">{{ isEditing ? 'Cập Nhật Món (Size)' : 'Thêm Món / Size Mới' }}</h2>
          <button @click="showModal = false" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600">X</button>
        </div>
        <div class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Tên Món</label>
            <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Ví dụ: Olong Lài Sữa" />
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Phân Loại (Category)</label>
              <select v-model="form.category" class="w-full border border-gray-200 rounded-xl px-4 py-2 bg-white">
                <option value="Món Bán Chạy">Món Bán Chạy</option>
                <option value="Rau Má">Rau Má</option>
                <option value="Trà / Trà Sữa">Trà / Trà Sữa</option>
                <option value="Trái Cây Tô">Trái Cây Tô</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Link Ảnh (URL)</label>
              <div class="flex gap-2">
                <input v-model="form.image_url" type="text" class="flex-1 w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="https://..." />
                <button @click.prevent="triggerUpload" type="button" class="bg-gray-100 border border-gray-200 px-4 rounded-xl hover:bg-gray-200 transition font-bold text-gray-600 flex items-center justify-center">
                  Tải Lên
                </button>
              </div>
              <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" accept="image/*" />
              <div v-if="isUploading" class="text-xs text-brand-500 font-bold mt-1">Đang tải ảnh lên (Vui lòng chờ)...</div>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Size</label>
              <input v-model="form.size" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="M, L, 700ml" />
            </div>
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Giá Bán (VNĐ)</label>
              <input v-model="form.price" type="number" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="25000" />
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t border-gray-100">
            <label class="block font-bold text-gray-700 mb-2">Thêm công thức (NL/Prep)</label>
            <div class="flex gap-2 mb-2">
              <select v-model="tempIng.selected" @change="onIngredientSelect" class="flex-1 border border-gray-200 rounded-xl px-3 py-1 text-sm bg-white">
                <option value="" disabled>-- Chọn Thành Phần --</option>
                <optgroup label="Nguyên Liệu Thô">
                  <option v-for="mat in materials" :key="'mat-'+mat.id" :value="{ type: 'material', id: mat.id, name: mat.name, unit: mat.base_unit }">
                    {{ mat.name }}
                  </option>
                </optgroup>
                <optgroup label="Bán Thành Phẩm (Prep)">
                  <option v-for="prep in preps" :key="'prep-'+prep.id" :value="{ type: 'prep', id: prep.id, name: prep.name, unit: prep.base_unit }">
                    {{ prep.name }}
                  </option>
                </optgroup>
              </select>
              <input v-model="tempIng.qty" type="number" placeholder="SL" class="w-20 border border-gray-200 rounded-xl px-3 py-1 text-sm" />
              <input v-model="tempIng.unit" type="text" placeholder="Đơn vị" class="w-20 border border-gray-200 rounded-xl px-3 py-1 text-sm bg-gray-50" disabled />
              <button @click="addIng" class="bg-gray-800 text-white px-3 py-1 rounded-xl text-sm font-bold">Thêm</button>
            </div>
            <ul class="space-y-1 mt-3">
              <li v-for="(ing, i) in form.ingredients" :key="i" class="text-sm text-gray-600 flex justify-between bg-gray-50 px-3 py-2 rounded-lg">
                <span>{{ ing.quantity }} {{ ing.unit }} {{ ing.name }}</span>
                <button @click="form.ingredients.splice(i, 1)" class="text-red-500 font-bold">X</button>
              </li>
            </ul>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button v-if="isEditing" @click="duplicateItem" class="px-6 py-2 rounded-xl font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition mr-auto flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            Tạo Size Khác
          </button>
          <button @click="showModal = false" class="px-6 py-2 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100">Hủy</button>
          <button @click="saveMenu" class="px-6 py-2 rounded-xl font-bold text-white bg-brand-500 hover:opacity-90">Lưu Món</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const menu = ref([])
const materials = ref([])
const preps = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const currentEditId = ref(null)
const fileInput = ref(null)
const isUploading = ref(false)

const form = ref({ name: '', category: 'Món Bán Chạy', image_url: '', size: '', price: '', ingredients: [] })
const tempIng = ref({ selected: '', name: '', qty: '', unit: '', type: '', id: '' })

const triggerUpload = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleFileUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  isUploading.value = true
  const formData = new FormData()
  formData.append('image', file)
  
  try {
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/upload', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (res.ok) {
      form.value.image_url = data.image_url
    } else {
      alert('Lỗi tải ảnh: ' + (data.error || 'Lỗi không xác định'))
    }
  } catch (err) {
    alert('Lỗi mạng khi tải ảnh lên máy chủ')
  } finally {
    isUploading.value = false
    e.target.value = ''
  }
}

const openCreate = () => {
  isEditing.value = false
  currentEditId.value = null
  form.value = { name: '', category: 'Món Bán Chạy', image_url: '', size: '', price: '', ingredients: [] }
  showModal.value = true
}

const openEdit = (item) => {
  isEditing.value = true
  currentEditId.value = item.id
  form.value = {
    name: item.name,
    category: item.category || 'Món Bán Chạy',
    image_url: item.image_url,
    size: item.size,
    price: item.price,
    ingredients: JSON.parse(JSON.stringify(item.ingredients || []))
  }
  showModal.value = true
}

const duplicateItem = () => {
  // Chuyển sang chế độ tạo mới nhưng giữ nguyên form hiện tại
  isEditing.value = false
  currentEditId.value = null
  // Xóa trắng trường size để người dùng tự nhập size mới
  form.value.size = ''
  // Focus hoặc chỉ cần chuyển trạng thái là form tự cập nhật UI
  alert('Đã chuyển sang chế độ tạo mới. Vui lòng điền tên Size mới (VD: L) và bấm Lưu Món.')
}

const onIngredientSelect = () => {
  if (tempIng.value.selected) {
    tempIng.value.name = tempIng.value.selected.name
    tempIng.value.unit = tempIng.value.selected.unit
    tempIng.value.type = tempIng.value.selected.type
    tempIng.value.id = tempIng.value.selected.id
  }
}

const addIng = () => {
  if (tempIng.value.selected && tempIng.value.qty) {
    form.value.ingredients.push({ 
      ingredient_type: tempIng.value.type,
      ingredient_id: tempIng.value.id,
      name: tempIng.value.name, 
      quantity: tempIng.value.qty, 
      unit: tempIng.value.unit 
    })
    tempIng.value = { selected: '', name: '', qty: '', unit: '', type: '', id: '' }
  }
}

const fetchData = async () => {
  try {
    const [resMenu, resMats, resPreps] = await Promise.all([
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/menu-items'),
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/materials'),
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/preps')
    ])
    if(resMenu.ok) {
       const data = await resMenu.json()
       menu.value = data.admin_items // using flattened list
    } else loadMockMenu()
    
    if(resMats.ok) materials.value = await resMats.json()
    else loadMockMats()

    if(resPreps.ok) preps.value = await resPreps.json()
    else loadMockPreps()
  } catch (e) { 
    loadMockMenu()
    loadMockMats()
    loadMockPreps()
  }
}

onMounted(() => fetchData())

const saveMenu = async () => {
  try {
    const url = isEditing.value ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/menu-items/${currentEditId.value}` : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/menu-items'
    const method = isEditing.value ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    
    if (res.ok) {
      alert('Lưu thành công!')
      showModal.value = false
      fetchData() // reload to get new COGS
    } else {
      const errData = await res.json()
      alert('Có lỗi xảy ra: ' + (errData.error || 'Vui lòng thử lại!'))
    }
  } catch (e) {
    alert('Backend lỗi hoặc chưa chạy. Hãy mở Backend lên để dùng lưu thật.')
  }
}

const loadMockMenu = () => {
  // .. fallback
}
const loadMockMats = () => { }
const loadMockPreps = () => { }
const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
</script>
