<template>
  <div class="bg-white rounded-[24px] p-8 shadow-sm">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-textmain">Quản Lý Bán Thành Phẩm (Prep)</h2>
      <button @click="showAddModal = true" class="bg-brand-500 text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition">Tạo Prep Mới</button>
    </div>
    
    <table class="w-full text-left">
      <thead>
        <tr class="text-gray-500 border-b border-gray-200">
          <th class="py-4 font-bold text-gray-700">Tên Prep</th>
          <th class="py-4 font-bold text-gray-700">Công thức (BOM)</th>
          <th class="py-4 font-bold text-gray-700">Sản lượng (Yield)</th>
          <th class="py-4 font-bold text-brand-500">Giá vốn / 1 Đơn vị</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="preps.length === 0">
           <td colspan="4" class="py-8 text-center text-gray-500 font-semibold">Chưa có dữ liệu prep.</td>
        </tr>
        <tr v-for="prep in preps" :key="prep.id" class="border-b border-gray-50 hover:bg-gray-50/50">
          <td class="py-4 font-bold text-textmain">{{ prep.name }}</td>
          <td class="py-4 text-sm text-gray-500">
             <div v-for="ing in prep.ingredients" :key="ing.name">
               • {{ ing.qty }} {{ ing.unit }} {{ ing.name }}
             </div>
          </td>
          <td class="py-4 font-semibold text-gray-700">{{ prep.yield_quantity }} {{ prep.base_unit }}</td>
          <td class="py-4 font-bold text-brand-500">{{ formatPrice(prep.current_cost_per_unit) }} / {{ prep.base_unit }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Add Prep Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 class="text-xl font-bold text-textmain">Tạo Bán Thành Phẩm (Prep)</h2>
          <button @click="showAddModal = false" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600">X</button>
        </div>
        <div class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Tên Prep</label>
            <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Ví dụ: Nước cốt Trà Olong" />
          </div>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Sản lượng (Yield)</label>
              <input v-model="form.yield_quantity" type="number" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="VD: 4000" />
            </div>
            <div class="flex-1">
              <label class="block font-bold text-gray-700 mb-1">Đơn vị cơ sở</label>
              <input v-model="form.base_unit" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="ml" />
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t border-gray-100">
            <label class="block font-bold text-gray-700 mb-2">Thêm nguyên liệu thô (BOM)</label>
            <div class="flex gap-2 mb-2">
              <select v-model="tempIng.material_id" @change="onMaterialSelect" class="flex-1 border border-gray-200 rounded-xl px-3 py-1 text-sm bg-white">
                <option value="" disabled>-- Chọn Nguyên Liệu --</option>
                <option v-for="mat in materials" :key="mat.id" :value="mat.id">{{ mat.name }}</option>
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
          <button @click="showAddModal = false" class="px-6 py-2 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100">Hủy</button>
          <button @click="savePrep" class="px-6 py-2 rounded-xl font-bold text-white bg-brand-500 hover:opacity-90">Lưu Prep</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const preps = ref([])
const materials = ref([])
const showAddModal = ref(false)
const form = ref({ name: '', yield_quantity: '', base_unit: '', ingredients: [] })
const tempIng = ref({ material_id: '', name: '', qty: '', unit: '' })

const onMaterialSelect = () => {
  const selected = materials.value.find(m => m.id === tempIng.value.material_id)
  if (selected) {
    tempIng.value.name = selected.name
    tempIng.value.unit = selected.base_unit
  }
}

const addIng = () => {
  if (tempIng.value.material_id && tempIng.value.qty) {
    form.value.ingredients.push({ 
      material_id: tempIng.value.material_id, 
      name: tempIng.value.name, 
      quantity: tempIng.value.qty, 
      unit: tempIng.value.unit 
    })
    tempIng.value = { material_id: '', name: '', qty: '', unit: '' }
  }
}

const fetchData = async () => {
  try {
    // Fetch preps
    const resPreps = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/preps')
    if(resPreps.ok) preps.value = await resPreps.json()
    else loadMockPreps()
    
    // Fetch materials for dropdown
    const resMats = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/materials')
    if(resMats.ok) materials.value = await resMats.json()
    else loadMockMats()
  } catch (e) { 
    loadMockPreps() 
    loadMockMats()
  }
}

onMounted(() => fetchData())

const savePrep = async () => {
  try {
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/preps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      alert('Tạo Prep thành công!')
      showAddModal.value = false
      fetchData()
    }
  } catch (e) {
    alert('Backend chưa chạy, giả lập thêm Prep thành công!')
    preps.value.push({
      id: Date.now(),
      name: form.value.name,
      yield_quantity: form.value.yield_quantity,
      base_unit: form.value.base_unit,
      ingredients: [...form.value.ingredients],
      current_cost_per_unit: 15 // mock calculation
    })
    showAddModal.value = false
  }
}

const loadMockPreps = () => {
  if (preps.value.length === 0) {
    preps.value = [
      { 
        id: 1, 
        name: 'Nước cốt Trà Olong', 
        yield_quantity: 4000, 
        base_unit: 'ml', 
        current_cost_per_unit: 11.25, 
        ingredients: [
          { name: 'Trà Olong', quantity: 150, unit: 'gram' },
          { name: 'Nước sôi', quantity: 4000, unit: 'ml' }
        ] 
      }
    ]
  }
}

const loadMockMats = () => {
  materials.value = [
    { id: 1, name: 'Trà Olong', base_unit: 'gram' },
    { id: 2, name: 'Nước sôi', base_unit: 'ml' }
  ]
}

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
</script>
