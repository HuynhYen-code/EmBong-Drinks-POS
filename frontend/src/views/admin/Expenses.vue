<template>
  <div class="space-y-8 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-extrabold text-textmain">Sổ Thu Chi & Két Tiền</h2>
        <p class="text-gray-500 font-medium text-sm mt-1">Quản lý dòng tiền mặt, chi phí phát sinh và kiểm đếm chốt két hàng ngày</p>
      </div>
      <div class="flex items-center gap-3">
        <label class="font-bold text-gray-600">Chọn ngày:</label>
        <input 
          type="date" 
          v-model="selectedDate" 
          @change="fetchData" 
          class="border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-700 bg-white shadow-sm hover:border-brand-500 transition outline-none focus:border-brand-500" 
        />
      </div>
    </div>

    <!-- Khối Tổng quan Két Tiền & Đối soát Dòng tiền -->
    <div class="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center text-xl font-bold">
            💰
          </div>
          <div>
            <h3 class="text-xl font-extrabold text-textmain">Đối Soát Tiền Két Ngày {{ displayDate }}</h3>
            <p class="text-xs text-gray-400 font-semibold">Công thức: Tiền đầu ngày + Tiền mặt bán được - Khoản chi = Tiền kết ca dự tính</p>
          </div>
        </div>
        <span v-if="cashData.actual_ending_cash !== null" class="px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-bold">
          ✓ Đã Chốt Két
        </span>
      </div>

      <!-- Grid các thẻ dòng tiền -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <!-- 1. Tiền đầu ngày -->
        <div class="p-5 rounded-2xl bg-gray-50/70 border border-gray-200/80">
          <div class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">1. Tiền Trong Két Đầu Ngày</div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-2xl font-black text-gray-800">{{ formatPrice(cashData.initial_cash) }}</span>
            <button 
              @click="openInitialCashModal" 
              class="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 font-bold text-brand-600 hover:bg-brand-50 transition shadow-2xs">
              {{ cashData.initial_cash > 0 ? 'Sửa' : '+ Nhập' }}
            </button>
          </div>
          <p class="text-[11px] text-gray-400 mt-2">Tiền thối sẵn có khi bắt đầu mở quán</p>
        </div>

        <!-- 2. Tiền mặt bán được -->
        <div class="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
          <div class="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">+ 2. Doanh Thu Tiền Mặt</div>
          <div class="text-2xl font-black text-emerald-600">{{ formatPrice(cashData.cash_revenue) }}</div>
          <p class="text-[11px] text-emerald-700/70 mt-2">Tổng từ các đơn thanh toán tiền mặt</p>
        </div>

        <!-- 3. Tiền chi ra -->
        <div class="p-5 rounded-2xl bg-amber-50/60 border border-amber-100">
          <div class="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">- 3. Tổng Khoản Chi Két</div>
          <div class="text-2xl font-black text-amber-600">{{ formatPrice(cashData.total_expenses) }}</div>
          <p class="text-[11px] text-amber-700/70 mt-2">{{ cashData.expenses.length }} khoản chi trong ngày</p>
        </div>

        <!-- 4. Tiền kết ca dự tính -->
        <div class="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/20">
          <div class="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">= 4. Tiền Trong Két Kết Ca</div>
          <div class="text-2xl font-black text-brand-500">{{ formatPrice(cashData.expected_ending_cash) }}</div>
          <p class="text-[11px] text-brand-600/70 mt-2">Lý thuyết cần có trong két khi kết thúc</p>
        </div>
      </div>

      <!-- Khu vực Kiểm đếm thực tế & Chốt Két -->
      <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>🔍</span> Kiểm Đếm Thực Tế & Chốt Két Cuối Ca/Ngày
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">Số tiền thực tế đếm được trong két (VNĐ):</label>
            <input 
              type="number" 
              v-model.number="actualCashInput" 
              placeholder="VD: 1.500.000..." 
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">Ghi chú kiểm đếm / lý do lệch (nếu có):</label>
            <input 
              type="text" 
              v-model="closeNotesInput" 
              placeholder="Ghi chú thêm..." 
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 focus:border-brand-500 outline-none"
            />
          </div>

          <div class="flex gap-2">
            <button 
              @click="submitCloseShift" 
              :disabled="actualCashInput === null || actualCashInput === ''"
              class="w-full py-3 bg-brand-500 text-white rounded-xl font-bold hover:opacity-90 transition shadow-sm disabled:bg-gray-200 disabled:text-gray-400">
              Chốt Két Ngày
            </button>
          </div>
        </div>

        <!-- Chênh lệch thực tế so với lý thuyết -->
        <div v-if="actualCashInput !== null && actualCashInput !== ''" class="mt-4 pt-4 border-t border-gray-200/60 flex items-center justify-between flex-wrap gap-2">
          <div class="text-sm font-bold text-gray-600">
            Chênh lệch (Thực tế - Lý thuyết):
          </div>
          <div class="text-lg font-black">
            <span v-if="differenceCalc === 0" class="text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
              ✓ Khớp hoàn toàn (0đ)
            </span>
            <span v-else-if="differenceCalc > 0" class="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              ▲ Thừa tiền: +{{ formatPrice(differenceCalc) }}
            </span>
            <span v-else class="text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
              ▼ Thiếu hụt: {{ formatPrice(differenceCalc) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Thêm thẻ thông tin Doanh thu Chuyển khoản -->
      <div class="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between text-sm flex-wrap gap-2">
        <div class="flex items-center gap-2 text-blue-700 font-semibold">
          <span>💳</span>
          <span>Doanh thu chuyển khoản hôm nay: <strong class="text-blue-800 font-extrabold">{{ formatPrice(cashData.transfer_revenue) }}</strong></span>
        </div>
        <span class="text-xs text-blue-600/80 italic">* Tiền chuyển khoản vào trực tiếp tài khoản ngân hàng, không cộng vào két tiền mặt.</span>
      </div>
    </div>

    <!-- Quản lý các khoản chi từ két -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Cột trái: Form nhập khoản chi mới -->
      <div class="lg:col-span-1 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-xl font-extrabold text-textmain mb-4 flex items-center gap-2">
          <span>📝</span> Thêm Khoản Chi Mới
        </h3>
        <p class="text-xs text-gray-400 mb-6 font-medium">Nhập các khoản chi tiêu tiền mặt rút trực tiếp từ két</p>

        <form @submit.prevent="submitExpense" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1.5">Danh mục chi *</label>
            <select 
              v-model="newExpense.category" 
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 focus:border-brand-500 outline-none">
              <option value="Mua nguyên liệu ngoài">Mua nguyên liệu ngoài</option>
              <option value="Mặt bằng / Điện nước">Mặt bằng / Điện nước</option>
              <option value="Marketing / In ấn">Marketing / In ấn quảng cáo</option>
              <option value="Vật dụng & Sửa chữa">Vật dụng & Sửa chữa quán</option>
              <option value="Chi phí khác">Chi phí khác</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1.5">Số tiền chi (VNĐ) *</label>
            <input 
              type="number" 
              v-model.number="newExpense.amount" 
              required 
              placeholder="VD: 50.000..." 
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-textmain focus:border-brand-500 outline-none" 
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1.5">Ghi chú / Diễn giải chi tiết</label>
            <textarea 
              v-model="newExpense.description" 
              rows="3" 
              placeholder="VD: Mua gấp 2kg chanh, mua túi rác..." 
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-textmain focus:border-brand-500 outline-none"></textarea>
          </div>

          <button 
            type="submit" 
            :disabled="isSubmittingExpense || !newExpense.amount"
            class="w-full py-3.5 bg-brand-500 text-white rounded-xl font-bold hover:opacity-90 transition shadow-md disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2">
            <span>+ Thêm Khoản Chi</span>
          </button>
        </form>
      </div>

      <!-- Cột phải: Danh sách các khoản chi trong ngày -->
      <div class="lg:col-span-2 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-extrabold text-textmain flex items-center gap-2">
            <span>📋</span> Danh Sách Khoản Chi Trong Ngày
          </h3>
          <span class="text-xs font-bold text-gray-400">{{ cashData.expenses.length }} mục</span>
        </div>

        <div v-if="cashData.expenses.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400 py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <span class="text-4xl mb-2">💸</span>
          <p class="font-bold">Chưa có khoản chi nào trong ngày {{ displayDate }}</p>
        </div>

        <div v-else class="space-y-3 overflow-y-auto max-h-[500px] pr-1">
          <div 
            v-for="item in cashData.expenses" 
            :key="item.id" 
            class="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-4 hover:bg-white hover:shadow-xs transition">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[11px]">
                  {{ item.category }}
                </span>
                <span class="text-xs text-gray-400 font-medium">{{ item.time }}</span>
              </div>
              <p class="text-sm font-semibold text-gray-700">{{ item.description || 'Không có ghi chú' }}</p>
            </div>

            <div class="flex items-center gap-4">
              <span class="text-lg font-black text-amber-600">-{{ formatPrice(item.amount) }}</span>
              <button 
                @click="deleteExpense(item.id)" 
                class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition" 
                title="Xóa khoản chi này">
                🗑
              </button>
            </div>
          </div>
        </div>

        <!-- Tổng chi footer -->
        <div v-if="cashData.expenses.length > 0" class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span class="font-bold text-gray-500 text-sm">Tổng tiền đã chi trong ngày:</span>
          <span class="text-2xl font-black text-amber-600">{{ formatPrice(cashData.total_expenses) }}</span>
        </div>
      </div>
    </div>

    <!-- Modal Cập nhật Tiền Đầu Ngày -->
    <div v-if="showInitialModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <h3 class="text-xl font-bold text-textmain mb-2">Tiền Trong Két Đầu Ngày</h3>
        <p class="text-xs text-gray-400 mb-4 font-medium">Nhập số tiền mặt có sẵn trong ngăn kéo đầu ngày mở quán</p>
        
        <input 
          type="number" 
          v-model.number="tempInitialCash" 
          placeholder="VD: 500.000" 
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-lg text-textmain focus:border-brand-500 outline-none mb-6"
        />

        <div class="flex gap-3">
          <button 
            type="button" 
            @click="showInitialModal = false" 
            class="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">
            Hủy
          </button>
          <button 
            type="button" 
            @click="saveInitialCash" 
            class="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl hover:opacity-90 transition shadow-sm">
            Lưu
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const getTodayStr = () => {
    const d = new Date()
    const month = '' + (d.getMonth() + 1)
    const day = '' + d.getDate()
    const year = d.getFullYear()
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-')
}

const selectedDate = ref(getTodayStr())

const displayDate = computed(() => {
    const [y, m, d] = selectedDate.value.split('-')
    return `${d}/${m}/${y}`
})

const cashData = ref({
    date: selectedDate.value,
    initial_cash: 0,
    cash_revenue: 0,
    transfer_revenue: 0,
    total_revenue: 0,
    total_orders: 0,
    total_expenses: 0,
    expected_ending_cash: 0,
    actual_ending_cash: null,
    difference: null,
    notes: '',
    expenses: []
})

const actualCashInput = ref(null)
const closeNotesInput = ref('')

const differenceCalc = computed(() => {
    if (actualCashInput.value === null || actualCashInput.value === '') return 0
    return actualCashInput.value - cashData.value.expected_ending_cash
})

const showInitialModal = ref(false)
const tempInitialCash = ref(0)

const newExpense = ref({
    category: 'Mua nguyên liệu ngoài',
    amount: null,
    description: ''
})
const isSubmittingExpense = ref(false)

const fetchData = async () => {
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cash-drawer?date=${selectedDate.value}`)
        if (res.ok) {
            const data = await res.json()
            cashData.value = data
            actualCashInput.value = data.actual_ending_cash !== null ? data.actual_ending_cash : null
            closeNotesInput.value = data.notes || ''
        }
    } catch (err) {
        console.error('Error fetching cash drawer data:', err)
    }
}

const openInitialCashModal = () => {
    tempInitialCash.value = cashData.value.initial_cash
    showInitialModal.value = true
}

const saveInitialCash = async () => {
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cash-drawer/initial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: selectedDate.value,
                initial_cash: tempInitialCash.value
            })
        })
        if (res.ok) {
            showInitialModal.value = false
            await fetchData()
        } else {
            alert('Lỗi cập nhật tiền đầu ngày')
        }
    } catch (err) {
        console.error(err)
        alert('Không thể kết nối đến server')
    }
}

const submitCloseShift = async () => {
    if (actualCashInput.value === null) return
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cash-drawer/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: selectedDate.value,
                actual_ending_cash: actualCashInput.value,
                notes: closeNotesInput.value
            })
        })
        if (res.ok) {
            alert('Đã chốt két ngày thành công!')
            await fetchData()
        } else {
            alert('Lỗi khi chốt két')
        }
    } catch (err) {
        console.error(err)
        alert('Không thể kết nối server')
    }
}

const submitExpense = async () => {
    if (!newExpense.value.amount) return
    isSubmittingExpense.value = true
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: selectedDate.value,
                category: newExpense.value.category,
                amount: newExpense.value.amount,
                description: newExpense.value.description
            })
        })
        if (res.ok) {
            newExpense.value.amount = null
            newExpense.value.description = ''
            await fetchData()
        } else {
            alert('Lỗi khi thêm khoản chi')
        }
    } catch (err) {
        console.error(err)
        alert('Không thể kết nối server')
    } finally {
        isSubmittingExpense.value = false
    }
}

const deleteExpense = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản chi này không?')) return
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/expenses/${id}`, {
            method: 'DELETE'
        })
        if (res.ok) {
            await fetchData()
        } else {
            alert('Lỗi khi xóa khoản chi')
        }
    } catch (err) {
        console.error(err)
        alert('Không thể kết nối server')
    }
}

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)

onMounted(() => {
    fetchData()
})
</script>
