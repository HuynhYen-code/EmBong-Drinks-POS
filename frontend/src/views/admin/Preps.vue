<template>
  <div class="space-y-5 pb-10">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-gray-100 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-extrabold text-textmain">Bán Thành Phẩm (Prep / Nước Cốt / Nấu Sẵn)</h2>
          <p class="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Quản lý công thức nấu trà, sên trân châu, nấu sốt... Tự động cập nhật giá vốn cho toàn bộ Menu & Topping liên quan
          </p>
        </div>
        <button
          @click="openCreate"
          class="bg-brand-500 text-white px-5 py-2.5 rounded-2xl font-extrabold text-sm hover:bg-brand-600 transition shadow-sm shrink-0"
        >
          + Tạo Prep Mới
        </button>
      </div>

      <div class="relative">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm kiếm tên Bán thành phẩm..."
          class="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-brand-500 outline-none"
        />
      </div>
    </div>

    <div v-if="filteredPreps.length === 0" class="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 text-gray-400 font-bold">
      Chưa có Bán thành phẩm nào phù hợp.
    </div>

    <!-- Responsive Grid Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="prep in filteredPreps"
        :key="prep.id"
        class="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 flex flex-col justify-between gap-4 hover:border-brand-200 transition"
      >
        <div>
          <div class="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h3 class="font-extrabold text-base text-textmain">{{ prep.name }}</h3>
              <span class="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs">
                Thu được: {{ Number(prep.yield_quantity) }} {{ prep.base_unit }} / mẻ
              </span>
            </div>
            <div class="text-right shrink-0">
              <div class="text-[11px] font-bold text-gray-400">Giá vốn ĐV</div>
              <div class="font-black text-brand-600 text-sm">{{ formatPrice(prep.current_cost_per_unit) }}/{{ prep.base_unit }}</div>
            </div>
          </div>

          <div class="mt-3 space-y-1">
            <div class="text-[11px] font-bold uppercase text-gray-400">Công thức nấu 1 mẻ:</div>
            <div v-for="(ing, idx) in prep.ingredients" :key="idx" class="flex justify-between text-xs font-semibold text-gray-700">
              <span>• {{ ing.name }}</span>
              <span class="font-extrabold">{{ Number(ing.quantity) }} {{ ing.unit }}</span>
            </div>
            <div v-if="!prep.ingredients || prep.ingredients.length === 0" class="text-xs text-gray-400 italic">
              Chưa có nguyên liệu
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs font-bold text-gray-500">
            Tổng mẻ: <strong class="text-gray-800">{{ formatPrice(Number(prep.current_cost_per_unit) * Number(prep.yield_quantity)) }}</strong>
          </span>
          <div class="flex gap-2">
            <button @click="openEditModal(prep)" class="px-3.5 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition">Sửa</button>
            <button @click="deletePrep(prep)" class="px-3 py-1.5 bg-red-50 text-red-500 font-bold text-xs rounded-xl hover:bg-red-100 transition">Xóa</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Thêm / Sửa Prep -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-surface shrink-0">
          <h2 class="text-lg sm:text-xl font-extrabold text-textmain">{{ editingId ? 'Cập Nhật Bán Thành Phẩm' : 'Tạo Bán Thành Phẩm (Prep)' }}</h2>
          <button @click="closeModal" class="w-9 h-9 bg-gray-100 rounded-full font-bold text-gray-600">✕</button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto">
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Tên Bán Thành Phẩm *</label>
            <input v-model="form.name" type="text" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="VD: Nước cốt Trà Olong Lài" />
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Sản lượng thu được / 1 mẻ *</label>
              <input v-model.number="form.yield_quantity" type="number" step="any" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="VD: 4000" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Đơn vị tính *</label>
              <input v-model="form.base_unit" type="text" class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-500" placeholder="ml, gram, phần..." />
            </div>
          </div>

          <!-- BOM Picker -->
          <div class="pt-3 border-t border-gray-100 space-y-3">
            <label class="block font-extrabold text-sm text-textmain">🧪 Nguyên liệu thô nấu 1 mẻ</label>

            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200/80 space-y-2">
              <input
                v-model="matSearch"
                type="text"
                placeholder="🔍 Tìm nhanh tên nguyên liệu thô..."
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white outline-none focus:border-brand-500"
              />
              <div class="flex gap-2">
                <select v-model="tempIng.material_id" @change="onMaterialSelect" class="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold bg-white outline-none focus:border-brand-500">
                  <option value="">-- Chọn Nguyên Liệu Thô --</option>
                  <option v-for="mat in filteredMats" :key="mat.id" :value="mat.id">
                    {{ mat.name }} ({{ mat.base_unit }} · {{ formatPrice(mat.cost_per_base_unit) }}/{{ mat.base_unit }})
                  </option>
                </select>
                <input
                  v-model.number="tempIng.qty"
                  @keyup.enter="addIng"
                  type="number"
                  step="any"
                  placeholder="Định lượng"
                  class="w-24 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-extrabold bg-white outline-none focus:border-brand-500"
                />
                <button type="button" @click="addIng" class="bg-brand-500 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0">
                  + Thêm
                </button>
              </div>

              <!-- Nhân nhanh mẻ nấu -->
              <div v-if="form.ingredients.length > 0" class="flex items-center justify-between pt-1.5 border-t border-gray-200/60">
                <span class="text-[11px] font-bold text-gray-500">⚡ Nhân hệ số mẻ nấu (cả SL thu được):</span>
                <div class="flex gap-1">
                  <button v-for="r in [0.5, 1.5, 2, 3]" :key="r" type="button" @click="scaleBatch(r)" class="px-2 py-0.5 rounded bg-white border border-gray-200 text-[11px] font-extrabold text-gray-600 hover:border-brand-500">
                    x{{ r }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="form.ingredients.length > 0" class="space-y-1.5">
              <div v-for="(ing, i) in form.ingredients" :key="i" class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-xs">
                <span class="font-bold text-gray-800 truncate pr-2">{{ ing.name }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <input v-model.number="ing.quantity" type="number" step="any" class="w-20 px-2 py-1 text-right font-extrabold border border-gray-200 rounded-lg bg-white" />
                  <span class="w-10 font-bold text-gray-500">{{ ing.unit }}</span>
                  <button type="button" @click="form.ingredients.splice(i, 1)" class="text-red-500 font-bold px-1">✕</button>
                </div>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-brand-50 border border-brand-200/80 flex justify-between items-center text-xs font-bold">
              <div>
                <div class="text-gray-500">Tổng vốn 1 mẻ:</div>
                <div class="text-sm font-black text-gray-800">{{ formatPrice(liveBatchTotalCost) }}</div>
              </div>
              <div class="text-right">
                <div class="text-brand-700">Giá vốn / 1 {{ form.base_unit || 'đơn vị' }}:</div>
                <div class="text-base font-black text-brand-700">{{ formatPrice(liveUnitCost) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5 shrink-0">
          <button @click="closeModal" class="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-white border border-gray-200">Hủy</button>
          <button @click="savePrep" class="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-brand-500 hover:bg-brand-600">
            {{ editingId ? 'Lưu Cập Nhật' : 'Lưu Prep' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE, removeAccents, formatPrice, showToast } from '../../utils/helpers'

const preps = ref([])
const materials = ref([])
const searchQuery = ref('')
const matSearch = ref('')

const showAddModal = ref(false)
const editingId = ref(null)
const form = ref({ name: '', yield_quantity: '', base_unit: 'ml', ingredients: [] })
const tempIng = ref({ material_id: '', name: '', qty: '', unit: '' })

const filteredPreps = computed(() => {
  const q = removeAccents(searchQuery.value)
  if (!q) return preps.value
  return preps.value.filter(p => removeAccents(p.name).includes(q))
})

const filteredMats = computed(() => {
  const q = removeAccents(matSearch.value)
  if (!q) return materials.value
  return materials.value.filter(m => removeAccents(m.name).includes(q))
})

const liveBatchTotalCost = computed(() =>
  form.value.ingredients.reduce((sum, ing) => {
    const m = materials.value.find(x => Number(x.id) === Number(ing.material_id))
    const unitCost = m ? (Number(m.cost_per_base_unit) || 0) : 0
    return sum + (Number(ing.quantity) || 0) * unitCost
  }, 0)
)

const liveUnitCost = computed(() => {
  const y = Number(form.value.yield_quantity) || 0
  return y > 0 ? liveBatchTotalCost.value / y : 0
})

const openCreate = () => {
  editingId.value = null
  form.value = { name: '', yield_quantity: '', base_unit: 'ml', ingredients: [] }
  tempIng.value = { material_id: '', name: '', qty: '', unit: '' }
  matSearch.value = ''
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingId.value = null
}

const openEditModal = (prep) => {
  editingId.value = prep.id
  form.value = {
    name: prep.name,
    yield_quantity: Number(prep.yield_quantity),
    base_unit: prep.base_unit,
    ingredients: (prep.ingredients || []).map(ing => ({
      material_id: ing.material_id,
      name: ing.name,
      quantity: Number(ing.quantity),
      unit: ing.unit
    }))
  }
  tempIng.value = { material_id: '', name: '', qty: '', unit: '' }
  showAddModal.value = true
}

const onMaterialSelect = () => {
  const selected = materials.value.find(m => Number(m.id) === Number(tempIng.value.material_id))
  if (selected) {
    tempIng.value.name = selected.name
    tempIng.value.unit = selected.base_unit
  }
}

const addIng = () => {
  if (!tempIng.value.material_id || !tempIng.value.qty || Number(tempIng.value.qty) <= 0) {
    showToast('Vui lòng chọn nguyên liệu và nhập định lượng > 0', 'warning')
    return
  }
  onMaterialSelect()
  const existing = form.value.ingredients.find(x => Number(x.material_id) === Number(tempIng.value.material_id))
  if (existing) {
    existing.quantity = Number(existing.quantity) + Number(tempIng.value.qty)
  } else {
    form.value.ingredients.push({
      material_id: tempIng.value.material_id,
      name: tempIng.value.name,
      quantity: Number(tempIng.value.qty),
      unit: tempIng.value.unit
    })
  }
  tempIng.value = { material_id: '', name: '', qty: '', unit: '' }
  matSearch.value = ''
}

const scaleBatch = (ratio) => {
  if (form.value.yield_quantity) {
    form.value.yield_quantity = Number((Number(form.value.yield_quantity) * ratio).toFixed(1))
  }
  form.value.ingredients.forEach(ing => {
    ing.quantity = Number((Number(ing.quantity) * ratio).toFixed(1))
  })
  showToast(`Đã nhân mẻ nấu x${ratio}`)
}

const fetchData = async () => {
  try {
    const [resPreps, resMats] = await Promise.all([
      fetch(`${API_BASE}/preps`),
      fetch(`${API_BASE}/materials`)
    ])
    if (resPreps.ok) preps.value = await resPreps.json()
    if (resMats.ok) materials.value = await resMats.json()
  } catch (e) {
    showToast('Không thể tải dữ liệu Bán thành phẩm', 'error')
  }
}

onMounted(() => fetchData())

const savePrep = async () => {
  if (!form.value.name || !form.value.yield_quantity) {
    showToast('Vui lòng nhập Tên Prep và Sản lượng thu được!', 'warning')
    return
  }
  if (tempIng.value.material_id && Number(tempIng.value.qty) > 0) {
    addIng()
  }

  try {
    const url = `${API_BASE}/preps${editingId.value ? '/' + editingId.value : ''}`
    const method = editingId.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (res.ok) {
      showToast(editingId.value ? 'Cập nhật Prep thành công!' : 'Tạo Prep thành công!')
      closeModal()
      await fetchData()
    } else {
      const errData = await res.json()
      showToast(errData.error || 'Lỗi lưu Prep', 'error')
    }
  } catch (e) {
    showToast('Không thể kết nối máy chủ', 'error')
  }
}

const deletePrep = async (prep) => {
  if (!confirm(`Bạn có chắc chắn muốn xóa Bán thành phẩm "${prep.name}"?`)) return
  try {
    const res = await fetch(`${API_BASE}/preps/${prep.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast(`Đã xóa "${prep.name}"`)
      await fetchData()
    } else {
      const errData = await res.json()
      showToast(errData.error || 'Không thể xóa Prep', 'error')
    }
  } catch (e) {
    showToast('Lỗi kết nối máy chủ', 'error')
  }
}
</script>
