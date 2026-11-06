<template>
  <div class="space-y-5 pb-10">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-textmain">Quản Lý Topping Bán Kèm</h2>
        <p class="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
          Hỗ trợ nhiều nguyên liệu cho 1 phần Topping và cho phép nhân viên chọn số lượng phần không giới hạn trên POS
        </p>
      </div>
      <button
        @click="openCreate"
        class="bg-brand-500 text-white px-5 py-2.5 rounded-2xl font-extrabold text-sm hover:bg-brand-600 transition shadow-sm shrink-0"
      >
        + Thêm Topping Mới
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="toppings.length === 0" class="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 text-gray-400 font-bold">
      Chưa có Topping nào. Hãy bấm "+ Thêm Topping Mới"!
    </div>

    <!-- Responsive Cards Grid (Hiển thị đẹp cả trên điện thoại & máy tính) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="item in toppings"
        :key="item.id"
        class="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 flex flex-col justify-between gap-4 hover:border-brand-200 transition"
      >
        <div>
          <div class="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h3 class="font-extrabold text-base text-textmain">{{ item.name }}</h3>
              <div class="text-lg font-black text-brand-600 mt-0.5">{{ formatPrice(item.price) }} <span class="text-xs font-semibold text-gray-400">/ phần</span></div>
            </div>
            <span
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-extrabold',
                item.price > 0 && item.cogs / item.price > 0.35 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
              ]"
            >
              FC: {{ item.price > 0 ? ((item.cogs / item.price) * 100).toFixed(1) : 0 }}%
            </span>
          </div>

          <div class="mt-3 space-y-1">
            <div class="text-[11px] font-bold uppercase text-gray-400">Định mức 1 phần bán:</div>
            <template v-if="item.ingredients && item.ingredients.length > 0">
              <div v-for="(ing, idx) in item.ingredients" :key="idx" class="flex justify-between text-xs font-semibold text-gray-700">
                <span>• {{ ing.name }}</span>
                <span class="font-extrabold">{{ ing.quantity }} {{ ing.unit }}</span>
              </div>
            </template>
            <div v-else class="text-xs text-gray-400 italic">Chưa liên kết nguyên liệu</div>
          </div>
        </div>

        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div class="text-xs font-bold text-gray-500">
            Giá vốn: <strong class="text-brand-600">{{ formatPrice(item.cogs) }}</strong>
          </div>
          <div class="flex gap-2">
            <button @click="openEdit(item)" class="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition">
              Sửa
            </button>
            <button @click="deleteTopping(item)" class="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 font-bold text-xs transition">
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Topping Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-surface shrink-0">
          <h2 class="text-lg sm:text-xl font-extrabold text-textmain">{{ isEditing ? 'Cập Nhật Topping' : 'Thêm Topping Mới' }}</h2>
          <button @click="showModal = false" class="w-9 h-9 bg-gray-100 rounded-full font-bold text-gray-600">✕</button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Tên Topping *</label>
              <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="VD: Phô mai viên" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Giá Bán / 1 Phần (VNĐ) *</label>
              <input v-model.number="form.price" type="number" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="VD: 5000" />
            </div>
          </div>

          <!-- BOM Editor cho Topping -->
          <div class="pt-3 border-t border-gray-100 space-y-3">
            <label class="block font-extrabold text-sm text-textmain">🧪 Thành phần cho 1 phần Topping</label>

            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200/80 space-y-2">
              <input
                v-model="ingSearch"
                type="text"
                placeholder="🔍 Tìm nhanh tên Nguyên liệu / Prep..."
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white outline-none focus:border-brand-500"
              />
              <div class="flex gap-2">
                <select v-model="tempKey" class="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold bg-white outline-none focus:border-brand-500">
                  <option value="">-- Chọn NL / Prep --</option>
                  <optgroup label="Bán Thành Phẩm (Prep)">
                    <option v-for="p in filteredPreps" :key="'p-' + p.id" :value="`prep__${p.id}`">
                      [Prep] {{ p.name }} ({{ p.base_unit }})
                    </option>
                  </optgroup>
                  <optgroup label="Nguyên Liệu Thô">
                    <option v-for="m in filteredMats" :key="'m-' + m.id" :value="`material__${m.id}`">
                      [NL] {{ m.name }} ({{ m.base_unit }})
                    </option>
                  </optgroup>
                </select>
                <input
                  v-model.number="tempQty"
                  @keyup.enter="addIng"
                  type="number"
                  step="any"
                  placeholder="SL"
                  class="w-20 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-extrabold bg-white outline-none focus:border-brand-500"
                />
                <button type="button" @click="addIng" class="bg-brand-500 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0">
                  + Thêm
                </button>
              </div>
            </div>

            <div v-if="form.ingredients.length > 0" class="space-y-1.5">
              <div v-for="(ing, idx) in form.ingredients" :key="idx" class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-xs">
                <span class="font-bold text-gray-800 truncate pr-2">{{ ing.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <input v-model.number="ing.quantity" type="number" step="any" class="w-16 px-2 py-1 text-right font-extrabold border border-gray-200 rounded-lg bg-white" />
                  <span class="text-gray-500 font-bold w-8">{{ ing.unit }}</span>
                  <button type="button" @click="form.ingredients.splice(idx, 1)" class="text-red-500 font-bold px-1">✕</button>
                </div>
              </div>
            </div>

            <div class="p-3 rounded-2xl bg-brand-50 border border-brand-200/80 flex justify-between items-center text-xs font-bold">
              <span class="text-brand-700">Giá vốn dự tính / 1 phần:</span>
              <span class="text-base font-black text-brand-700">{{ formatPrice(liveCogs) }}</span>
            </div>
          </div>
        </div>

        <div class="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5 shrink-0">
          <button @click="showModal = false" class="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-white border border-gray-200">Hủy</button>
          <button @click="saveTopping" class="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-brand-500 hover:bg-brand-600">Lưu Topping</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE, removeAccents, formatPrice, showToast } from '../../utils/helpers'

const toppings = ref([])
const materials = ref([])
const preps = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const currentEditId = ref(null)

const form = ref({ name: '', price: '', ingredients: [] })
const ingSearch = ref('')
const tempKey = ref('')
const tempQty = ref('')

const filteredMats = computed(() => {
  const q = removeAccents(ingSearch.value)
  return q ? materials.value.filter(m => removeAccents(m.name).includes(q)) : materials.value
})

const filteredPreps = computed(() => {
  const q = removeAccents(ingSearch.value)
  return q ? preps.value.filter(p => removeAccents(p.name).includes(q)) : preps.value
})

const getMeta = (type, id) => {
  if (type === 'prep') {
    const p = preps.value.find(x => Number(x.id) === Number(id))
    return p ? { name: p.name, unit: p.base_unit, cost: Number(p.current_cost_per_unit) || 0 } : null
  }
  const m = materials.value.find(x => Number(x.id) === Number(id))
  return m ? { name: m.name, unit: m.base_unit, cost: Number(m.cost_per_base_unit) || 0 } : null
}

const liveCogs = computed(() =>
  form.value.ingredients.reduce((sum, ing) => {
    const meta = getMeta(ing.ingredient_type, ing.ingredient_id)
    return sum + (Number(ing.quantity) || 0) * (meta ? meta.cost : 0)
  }, 0)
)

const addIng = () => {
  if (!tempKey.value || !tempQty.value || Number(tempQty.value) <= 0) {
    showToast('Vui lòng chọn thành phần và nhập định lượng > 0', 'warning')
    return
  }
  const [type, id] = tempKey.value.split('__')
  const meta = getMeta(type, id)
  if (!meta) return

  const existing = form.value.ingredients.find(x => x.ingredient_type === type && Number(x.ingredient_id) === Number(id))
  if (existing) {
    existing.quantity = Number(existing.quantity) + Number(tempQty.value)
  } else {
    form.value.ingredients.push({
      ingredient_type: type,
      ingredient_id: Number(id),
      name: meta.name,
      quantity: Number(tempQty.value),
      unit: meta.unit
    })
  }
  tempKey.value = ''
  tempQty.value = ''
}

const openCreate = () => {
  isEditing.value = false
  currentEditId.value = null
  form.value = { name: '', price: '', ingredients: [] }
  tempKey.value = ''
  tempQty.value = ''
  showModal.value = true
}

const openEdit = (item) => {
  isEditing.value = true
  currentEditId.value = item.id
  form.value = {
    name: item.name,
    price: item.price,
    ingredients: JSON.parse(JSON.stringify(item.ingredients || []))
  }
  tempKey.value = ''
  tempQty.value = ''
  showModal.value = true
}

const fetchData = async () => {
  try {
    const [resToppings, resMats, resPreps] = await Promise.all([
      fetch(`${API_BASE}/toppings`),
      fetch(`${API_BASE}/materials`),
      fetch(`${API_BASE}/preps`)
    ])
    if (resToppings.ok) toppings.value = await resToppings.json()
    if (resMats.ok) materials.value = await resMats.json()
    if (resPreps.ok) preps.value = await resPreps.json()
  } catch (e) {
    showToast('Không thể tải dữ liệu Topping', 'error')
  }
}

onMounted(() => fetchData())

const saveTopping = async () => {
  if (!form.value.name) {
    showToast('Vui lòng nhập tên Topping', 'warning')
    return
  }
  // Nếu người dùng chọn ở ô nháp mà quên bấm "+ Thêm" thì tự động gom vào luôn!
  if (tempKey.value && Number(tempQty.value) > 0) {
    addIng()
  }

  try {
    const url = isEditing.value ? `${API_BASE}/toppings/${currentEditId.value}` : `${API_BASE}/toppings`
    const method = isEditing.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })

    if (res.ok) {
      localStorage.removeItem('embong_pos_cache_v2')
      showToast(isEditing.value ? 'Đã cập nhật Topping!' : 'Đã thêm Topping mới!')
      showModal.value = false
      await fetchData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Lỗi khi lưu Topping', 'error')
    }
  } catch (e) {
    showToast('Không thể kết nối máy chủ', 'error')
  }
}

const deleteTopping = async (item) => {
  if (!confirm(`Xóa Topping "${item.name}"? (Nếu từng có trong bill cũ, hệ thống sẽ ẩn khỏi POS nhưng vẫn giữ nguyên lịch sử bill)`)) return
  try {
    const res = await fetch(`${API_BASE}/toppings/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      localStorage.removeItem('embong_pos_cache_v2')
      showToast(data.message || 'Đã xóa Topping')
      await fetchData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Không thể xóa Topping', 'error')
    }
  } catch (e) {
    showToast('Lỗi kết nối máy chủ', 'error')
  }
}
</script>
