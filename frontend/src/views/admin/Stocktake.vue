<template>
  <div class="space-y-5 pb-10">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-gray-100 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-extrabold text-textmain">Kiểm Kê Tồn Kho Thủ Công</h2>
          <p class="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Kiểm đếm số lượng nguyên liệu thực tế cuối ca/cuối tuần và bấm Lưu để cập nhật tồn kho thực tế
          </p>
        </div>
        <button
          @click="saveStocktake"
          :disabled="isSaving"
          class="bg-brand-500 text-white px-6 py-2.5 rounded-2xl font-extrabold text-sm hover:bg-brand-600 transition shadow-sm disabled:bg-gray-200 shrink-0"
        >
          {{ isSaving ? 'Đang lưu...' : '✓ Lưu Kết Quả Kiểm Kê' }}
        </button>
      </div>

      <!-- Summary Banner & Search -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div class="p-4 bg-brand-50 border border-brand-200/80 rounded-2xl flex justify-between items-center">
          <span class="font-bold text-xs sm:text-sm text-brand-800">Tổng giá trị tồn kho thực tế:</span>
          <span class="text-xl sm:text-2xl font-black text-brand-600">{{ formatPrice(totalValue) }}</span>
        </div>

        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm nguyên liệu cần kiểm đếm..."
            class="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-brand-500 outline-none"
          />
        </div>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block bg-white rounded-3xl p-6 shadow-2xs border border-gray-100 overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-xs font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-200">
            <th class="py-3.5 px-3">Nguyên Liệu</th>
            <th class="py-3.5 px-3 text-right">Giá Vốn ĐV</th>
            <th class="py-3.5 px-3 text-right">Tồn Trước Đó</th>
            <th class="py-3.5 px-3 text-center">Tồn Thực Tế Mới</th>
            <th class="py-3.5 px-3 text-center">Nhập Nhanh (+1 ĐV Mua)</th>
            <th class="py-3.5 px-3 text-right">Giá Trị Tồn</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 text-sm">
          <tr v-for="mat in filteredInventory" :key="mat.id" class="hover:bg-gray-50/60 transition">
            <td class="py-3.5 px-3 font-extrabold text-textmain">{{ mat.name }}</td>
            <td class="py-3.5 px-3 text-right text-gray-500 font-semibold">
              {{ formatPrice(mat.cost_per_base_unit) }} / {{ mat.base_unit }}
            </td>
            <td class="py-3.5 px-3 text-right text-gray-500 font-bold">
              {{ mat.system_qty }} {{ mat.base_unit }}
            </td>
            <td class="py-3.5 px-3 text-center">
              <div class="inline-flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  min="0"
                  v-model.number="mat.actual_qty"
                  class="w-28 px-3 py-1.5 border border-gray-200 rounded-xl text-right font-extrabold focus:border-brand-500 outline-none"
                />
                <span class="text-xs font-bold text-gray-400 w-9 text-left">{{ mat.base_unit }}</span>
              </div>
            </td>
            <td class="py-3.5 px-3 text-center">
              <button
                type="button"
                @click="mat.actual_qty = Number(((Number(mat.actual_qty) || 0) + mat.conversion_rate).toFixed(2))"
                class="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
              >
                +1 {{ mat.purchase_unit }} (+{{ mat.conversion_rate }}{{ mat.base_unit }})
              </button>
            </td>
            <td class="py-3.5 px-3 text-right font-black text-brand-600">
              {{ formatPrice((Number(mat.actual_qty) || 0) * mat.cost_per_base_unit) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden grid grid-cols-1 gap-3">
      <div
        v-for="mat in filteredInventory"
        :key="'mob-' + mat.id"
        class="bg-white rounded-2xl p-4 shadow-2xs border border-gray-100 space-y-3"
      >
        <div class="flex justify-between items-start gap-2">
          <div>
            <h3 class="font-extrabold text-textmain">{{ mat.name }}</h3>
            <p class="text-xs text-gray-400 font-semibold">Tồn trước: {{ mat.system_qty }} {{ mat.base_unit }}</p>
          </div>
          <span class="font-black text-brand-600 text-sm">
            {{ formatPrice((Number(mat.actual_qty) || 0) * mat.cost_per_base_unit) }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              type="number"
              step="any"
              min="0"
              v-model.number="mat.actual_qty"
              class="w-full pl-3 pr-12 py-2 border border-gray-200 rounded-xl font-extrabold text-sm outline-none focus:border-brand-500"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{{ mat.base_unit }}</span>
          </div>
          <button
            type="button"
            @click="mat.actual_qty = Number(((Number(mat.actual_qty) || 0) + mat.conversion_rate).toFixed(2))"
            class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold shrink-0"
          >
            +1 {{ mat.purchase_unit }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE, removeAccents, formatPrice, showToast } from '../../utils/helpers'

const inventory = ref([])
const searchQuery = ref('')
const isSaving = ref(false)

const filteredInventory = computed(() => {
  const q = removeAccents(searchQuery.value)
  if (!q) return inventory.value
  return inventory.value.filter(m => removeAccents(m.name).includes(q))
})

const fetchData = async () => {
  try {
    const res = await fetch(`${API_BASE}/materials`)
    if (res.ok) {
      const data = await res.json()
      inventory.value = data.map(mat => {
        const stock = Number(mat.stock_quantity) || 0
        return {
          id: mat.id,
          name: mat.name,
          purchase_unit: mat.purchase_unit || 'Gói',
          conversion_rate: Number(mat.conversion_rate) || 1,
          base_unit: mat.base_unit,
          cost_per_base_unit: Number(mat.cost_per_base_unit) || 0,
          system_qty: stock,
          actual_qty: stock
        }
      })
    }
  } catch (e) {
    showToast('Không thể tải dữ liệu tồn kho', 'error')
  }
}

onMounted(() => fetchData())

const saveStocktake = async () => {
  if (inventory.value.length === 0) return
  isSaving.value = true
  try {
    const res = await fetch(`${API_BASE}/materials/stocktake`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: inventory.value.map(i => ({
          id: i.id,
          actual_qty: Number(i.actual_qty) || 0
        }))
      })
    })
    if (res.ok) {
      showToast('Đã lưu kết quả kiểm kê vào cơ sở dữ liệu!')
      await fetchData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Lỗi khi lưu kiểm kê', 'error')
    }
  } catch (e) {
    showToast('Không thể kết nối đến máy chủ', 'error')
  } finally {
    isSaving.value = false
  }
}

const totalValue = computed(() =>
  inventory.value.reduce((sum, item) => sum + ((Number(item.actual_qty) || 0) * item.cost_per_base_unit), 0)
)
</script>
