<template>
  <div class="bg-white rounded-[24px] p-8 shadow-sm">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-textmain">Quản Lý Topping</h2>
      <button @click="openCreate" class="bg-brand-500 text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition">Thêm Topping Mới</button>
    </div>
    
    <table class="w-full text-left">
      <thead>
        <tr class="text-gray-500 border-b border-gray-200">
          <th class="py-4 font-bold text-gray-700">Tên Topping</th>
          <th class="py-4 font-bold text-gray-700">Công thức (BOM)</th>
          <th class="py-4 font-bold text-gray-700">Giá Bán</th>
          <th class="py-4 font-bold text-brand-500">Giá Vốn (COGS)</th>
          <th class="py-4 font-bold text-orange-500">Food Cost (%)</th>
          <th class="py-4 font-bold text-gray-700 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="toppings.length === 0">
           <td colspan="6" class="py-8 text-center text-gray-500 font-semibold">Chưa có dữ liệu topping.</td>
        </tr>
        <tr v-for="item in toppings" :key="item.id" class="border-b border-gray-50 hover:bg-gray-50/50">
          <td class="py-4 font-bold text-textmain">{{ item.name }}</td>
          <td class="py-4 text-sm text-gray-500">
             <div v-for="ing in item.ingredients" :key="ing.ingredient_id || ing.name">
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

    <!-- Add/Edit Topping Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 class="text-xl font-bold text-textmain">{{ isEditing ? 'Cập Nhật Topping' : 'Thêm Topping Mới' }}</h2>
          <button @click="showModal = false" class="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600">X</button>
        </div>
        <div class="p-6 space-y-4 overflow-y-auto">
          <div>
            <label class="block font-bold text-gray-700 mb-1">Tên Topping</label>
            <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="Ví dụ: Trân Châu Đen" />
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-1">Giá Bán (VNĐ)</label>
            <input v-model="form.price" type="number" class="w-full border border-gray-200 rounded-xl px-4 py-2" placeholder="5000" />
          </div>
          
          <div class="mt-4 pt-4 border-t border-gray-100">
            <label class="block font-bold text-gray-700 mb-2">Liên kết với Nguyên liệu / Bán thành phẩm</label>
            <div class="flex gap-4">
              <div class="flex-1">
                <select v-model="tempIng.selected" @change="onIngredientSelect" class="w-full border border-gray-200 rounded-xl px-4 py-2 bg-white">
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
              </div>
              <div class="flex-1 flex gap-2">
                <input v-model="tempIng.qty" type="number" placeholder="Khẩu phần (VD: 50)" class="w-full border border-gray-200 rounded-xl px-4 py-2" />
                <input v-model="tempIng.unit" type="text" placeholder="Đơn vị" class="w-24 border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 text-center font-bold" disabled />
              </div>
            </div>
            <p class="text-sm text-gray-500 italic mt-2">* Chọn nguyên liệu và nhập lượng tiêu hao cho 1 phần Topping bán ra để hệ thống tính giá vốn tự động.</p>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button @click="showModal = false" class="px-6 py-2 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100">Hủy</button>
          <button @click="saveTopping" class="px-6 py-2 rounded-xl font-bold text-white bg-brand-500 hover:opacity-90">Lưu Topping</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const toppings = ref([])
const materials = ref([])
const preps = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const currentEditId = ref(null)

const form = ref({ name: '', price: '', ingredients: [] })
const tempIng = ref({ selected: '', name: '', qty: '', unit: '', type: '', id: '' })

const openCreate = () => {
  isEditing.value = false
  currentEditId.value = null
  form.value = { name: '', price: '', ingredients: [] }
  tempIng.value = { selected: '', name: '', qty: '', unit: '', type: '', id: '' }
  showModal.value = true
}

const openEdit = (item) => {
  isEditing.value = true
  currentEditId.value = item.id
  form.value = {
    name: item.name,
    price: item.price,
    ingredients: []
  }
  
  if (item.ingredients && item.ingredients.length > 0) {
    const ing = item.ingredients[0]
    // Tìm object matching trong list để gán cho selected
    const obj = { type: ing.ingredient_type, id: ing.ingredient_id, name: ing.name, unit: ing.unit }
    tempIng.value = {
      selected: obj,
      name: ing.name,
      qty: ing.quantity,
      unit: ing.unit,
      type: ing.ingredient_type,
      id: ing.ingredient_id
    }
  } else {
    tempIng.value = { selected: '', name: '', qty: '', unit: '', type: '', id: '' }
  }
  showModal.value = true
}

const onIngredientSelect = () => {
  if (tempIng.value.selected) {
    tempIng.value.name = tempIng.value.selected.name
    tempIng.value.unit = tempIng.value.selected.unit
    tempIng.value.type = tempIng.value.selected.type
    tempIng.value.id = tempIng.value.selected.id
  }
}

const fetchData = async () => {
  try {
    const [resToppings, resMats, resPreps] = await Promise.all([
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/toppings'),
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/materials'),
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/preps')
    ])
    if(resToppings.ok) {
       toppings.value = await resToppings.json()
    }
    if(resMats.ok) materials.value = await resMats.json()
    if(resPreps.ok) preps.value = await resPreps.json()
  } catch (e) { 
    console.error(e)
  }
}

onMounted(() => fetchData())

const saveTopping = async () => {
  try {
    if (tempIng.value.selected && tempIng.value.qty) {
      form.value.ingredients = [{
        ingredient_type: tempIng.value.type,
        ingredient_id: tempIng.value.id,
        name: tempIng.value.name,
        quantity: tempIng.value.qty,
        unit: tempIng.value.unit
      }]
    } else {
      form.value.ingredients = []
    }

    const url = isEditing.value ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/toppings/${currentEditId.value}` : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/toppings'
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
    }
  } catch (e) {
    alert('Backend lỗi hoặc chưa chạy. Hãy mở Backend lên để dùng lưu thật.')
  }
}

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
</script>
