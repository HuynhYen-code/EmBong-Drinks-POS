<template>
  <div class="space-y-6 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-textmain">Sổ Thu Chi & Két Tiền</h2>
        <p class="text-gray-500 font-medium text-xs sm:text-sm mt-1">
          Tiền kết két hôm nay tự động chuyển làm tiền đầu ngày hôm sau nếu bạn không nhập đè
        </p>
      </div>
      <div class="flex items-center gap-2.5">
        <label class="font-bold text-sm text-gray-600 shrink-0">Ngày xem:</label>
        <input
          type="date"
          v-model="selectedDate"
          @change="fetchData"
          class="border border-gray-200 rounded-xl px-3.5 py-2 font-bold text-sm text-gray-700 bg-white shadow-2xs focus:border-brand-500 outline-none"
        />
      </div>
    </div>

    <!-- Khối Tổng quan Két Tiền & Đối soát Dòng tiền -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-2xs border border-gray-100">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl font-bold">
            💰
          </div>
          <div>
            <h3 class="text-lg sm:text-xl font-extrabold text-textmain">Đối Soát Tiền Két Ngày {{ displayDate }}</h3>
            <p class="text-xs text-gray-400 font-semibold">Đầu ngày + Doanh thu Tiền mặt − Chi tiền mặt = Kết ca lý thuyết</p>
          </div>
        </div>
        <span v-if="cashData.actual_ending_cash !== null" class="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-extrabold">
          ✓ Đã Chốt Két: {{ formatPrice(cashData.actual_ending_cash) }}
        </span>
      </div>

      <!-- Grid các thẻ dòng tiền -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-6">
        <!-- 1. Tiền đầu ngày -->
        <div class="p-4 sm:p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-500">1. Két Đầu Ngày</span>
              <span
                v-if="cashData.is_auto_rollover"
                class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 text-[10px] font-extrabold"
                title="Tự động chuyển sang từ tiền kết két hôm trước"
              >
                🔄 Tự động
              </span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-xl sm:text-2xl font-black text-gray-800">{{ formatPrice(cashData.initial_cash) }}</span>
              <button
                @click="openInitialCashModal"
                class="text-xs px-3 py-1.5 rounded-xl bg-white border border-gray-200 font-bold text-brand-600 hover:bg-brand-50 transition shadow-2xs shrink-0"
              >
                Sửa
              </button>
            </div>
          </div>
          <p class="text-[11px] text-gray-400 mt-2 font-medium">
            {{ cashData.is_auto_rollover ? 'Lấy tự động từ kết ca ngày trước' : 'Số tiền đã nhập thủ công cho ngày này' }}
          </p>
        </div>

        <!-- 2. Tiền mặt bán được -->
        <div class="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1.5">+ 2. Thu Tiền Mặt</div>
            <div class="text-xl sm:text-2xl font-black text-emerald-600">{{ formatPrice(cashData.cash_revenue) }}</div>
          </div>
          <p class="text-[11px] text-emerald-700/70 mt-2 font-medium">Từ các đơn thanh toán tiền mặt</p>
        </div>

        <!-- 3. Tiền chi ra -->
        <div class="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1.5">− 3. Chi Rút Két</div>
            <div class="text-xl sm:text-2xl font-black text-amber-600">{{ formatPrice(cashData.total_expenses) }}</div>
          </div>
          <p class="text-[11px] text-amber-700/70 mt-2 font-medium">{{ cashData.expenses.length }} phiếu chi trong ngày</p>
        </div>

        <!-- 4. Tiền kết ca dự tính -->
        <div class="p-4 sm:p-5 rounded-2xl bg-brand-50 border border-brand-200/80 flex flex-col justify-between">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">= 4. Tiền Kết Két</div>
            <div class="text-xl sm:text-2xl font-black text-brand-600">{{ formatPrice(cashData.expected_ending_cash) }}</div>
          </div>
          <p class="text-[11px] text-brand-700/70 mt-2 font-medium">Sẽ chuyển sang đầu ngày hôm sau</p>
        </div>
      </div>

      <!-- Khu vực Kiểm đếm thực tế & Chốt Két -->
      <div class="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-100">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h4 class="font-extrabold text-sm text-gray-700 flex items-center gap-2">
            <span>🔍</span> Kiểm Đếm Thực Tế & Chốt Két Cuối Ngày
          </h4>
          <button
            type="button"
            @click="actualCashInput = cashData.expected_ending_cash"
            class="text-xs font-bold text-brand-600 hover:underline"
          >
            Điền khớp số lý thuyết ({{ formatPrice(cashData.expected_ending_cash) }})
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1">Tiền thực tế đếm trong két (VNĐ):</label>
            <input
              type="number"
              v-model.number="actualCashInput"
              placeholder="VD: 1200000"
              class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-800 focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1">Ghi chú chốt ca / rút tiền cất:</label>
            <input
              type="text"
              v-model="closeNotesInput"
              placeholder="VD: Cất 500k, để lại 200k tiền lẻ cho mai..."
              class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-sm text-gray-800 focus:border-brand-500 outline-none"
            />
          </div>

          <button
            @click="submitCloseShift"
            :disabled="actualCashInput === null || actualCashInput === ''"
            class="w-full py-2.5 bg-brand-500 text-white rounded-xl font-extrabold text-sm hover:bg-brand-600 transition shadow-xs disabled:bg-gray-200 disabled:text-gray-400"
          >
            Chốt Két Ngày
          </button>
        </div>

        <div v-if="actualCashInput !== null && actualCashInput !== ''" class="mt-3.5 pt-3.5 border-t border-gray-200/60 flex items-center justify-between flex-wrap gap-2">
          <span class="text-xs sm:text-sm font-bold text-gray-600">Chênh lệch (Thực đếm − Lý thuyết):</span>
          <div class="text-sm font-black">
            <span v-if="differenceCalc === 0" class="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              ✓ Khớp hoàn toàn (0 ₫)
            </span>
            <span v-else-if="differenceCalc > 0" class="text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              ▲ Dư: +{{ formatPrice(differenceCalc) }}
            </span>
            <span v-else class="text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
              ▼ Hụt / Đã rút cất: {{ formatPrice(differenceCalc) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Doanh thu chuyển khoản & Cấu hình VietQR -->
      <div class="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between text-xs sm:text-sm flex-wrap gap-3">
        <div class="flex items-center gap-2 text-blue-800 font-semibold">
          <span>💳</span>
          <span>Chuyển khoản ngày {{ displayDate }}: <strong class="font-black">{{ formatPrice(cashData.transfer_revenue) }}</strong> (vào thẳng ngân hàng)</span>
        </div>
        <button
          type="button"
          @click="showBankModal = true"
          class="px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-50 transition"
        >
          ⚙️ Cấu hình TK VietQR trên POS
        </button>
      </div>
    </div>

    <!-- Quản lý các khoản chi từ két -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Form nhập / sửa khoản chi -->
      <div class="lg:col-span-1 bg-white p-5 sm:p-6 rounded-3xl shadow-2xs border border-gray-100">
        <h3 class="text-lg font-extrabold text-textmain mb-1 flex items-center gap-2">
          <span>📝</span> {{ editingExpenseId ? 'Sửa Khoản Chi' : 'Thêm Khoản Chi Két' }}
        </h3>
        <p class="text-xs text-gray-400 mb-4 font-medium">Các khoản lấy tiền mặt từ két ra chi tiêu</p>

        <form @submit.prevent="submitExpense" class="space-y-3.5">
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Danh mục chi *</label>
            <select
              v-model="expenseForm.category"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 focus:border-brand-500 outline-none"
            >
              <option value="Mua nguyên liệu ngoài">Mua nguyên liệu ngoài (Đá, chanh, sữa...)</option>
              <option value="Mặt bằng / Điện nước">Mặt bằng / Điện nước</option>
              <option value="Marketing / In ấn">Marketing / In ấn quảng cáo</option>
              <option value="Vật dụng & Sửa chữa">Vật dụng & Sửa chữa quán</option>
              <option value="Lương / Phụ cấp">Lương / Phụ cấp nhân viên</option>
              <option value="Chi phí khác">Chi phí khác</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Số tiền chi (VNĐ) *</label>
            <input
              type="number"
              v-model.number="expenseForm.amount"
              required
              placeholder="VD: 50000"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-textmain focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Diễn giải chi tiết</label>
            <textarea
              v-model="expenseForm.description"
              rows="2"
              placeholder="VD: Mua 2 bao đá bi, mua túi mang về..."
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-textmain focus:border-brand-500 outline-none"
            ></textarea>
          </div>

          <div class="flex gap-2">
            <button
              v-if="editingExpenseId"
              type="button"
              @click="cancelEditExpense"
              class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              :disabled="isSubmittingExpense || !expenseForm.amount"
              class="flex-[2] py-3 bg-brand-500 text-white rounded-xl font-extrabold text-sm hover:bg-brand-600 transition shadow-xs disabled:bg-gray-200"
            >
              {{ editingExpenseId ? 'Lưu Cập Nhật' : '+ Ghi Nhận Khoản Chi' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Danh sách khoản chi trong ngày -->
      <div class="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl shadow-2xs border border-gray-100 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-extrabold text-textmain flex items-center gap-2">
            <span>📋</span> Danh Sách Khoản Chi Ngày {{ displayDate }}
          </h3>
          <span class="text-xs font-bold text-gray-400">{{ cashData.expenses.length }} khoản</span>
        </div>

        <div v-if="cashData.expenses.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400 py-14 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <span class="text-3xl mb-2">💸</span>
          <p class="font-bold text-sm">Chưa có khoản chi nào trong ngày {{ displayDate }}</p>
        </div>

        <div v-else class="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
          <div
            v-for="item in cashData.expenses"
            :key="item.id"
            class="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[11px]">
                  {{ item.category }}
                </span>
                <span class="text-xs text-gray-400 font-medium">{{ item.time }}</span>
              </div>
              <p class="text-sm font-semibold text-gray-700 break-words">{{ item.description || 'Không có ghi chú' }}</p>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
              <span class="text-base font-black text-amber-600">-{{ formatPrice(item.amount) }}</span>
              <div class="flex gap-1.5">
                <button
                  @click="startEditExpense(item)"
                  class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition"
                >
                  Sửa
                </button>
                <button
                  @click="deleteExpense(item.id)"
                  class="px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs font-bold transition"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="cashData.expenses.length > 0" class="mt-4 pt-3.5 border-t border-gray-100 flex justify-between items-center">
          <span class="font-bold text-gray-500 text-sm">Tổng chi tiền mặt trong ngày:</span>
          <span class="text-xl font-black text-amber-600">{{ formatPrice(cashData.total_expenses) }}</span>
        </div>
      </div>
    </div>

    <!-- Modal Cập nhật Tiền Đầu Ngày -->
    <div v-if="showInitialModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div>
          <h3 class="text-xl font-extrabold text-textmain">Tiền Trong Két Đầu Ngày</h3>
          <p class="text-xs text-gray-500 mt-1 font-medium">
            Mặc định hệ thống tự lấy tiền kết két hôm trước. Bạn chỉ cần nhập ở đây nếu sáng nay có bỏ thêm hoặc rút bớt tiền lẻ đầu ca.
          </p>
        </div>

        <input
          type="number"
          v-model.number="tempInitialCash"
          placeholder="VD: 500000"
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-extrabold text-lg text-textmain focus:border-brand-500 outline-none"
        />

        <button
          v-if="!cashData.is_auto_rollover"
          type="button"
          @click="resetToAutoRollover"
          class="w-full py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
        >
          🔄 Đặt lại tự động theo tiền kết két hôm trước
        </button>

        <div class="flex gap-2.5">
          <button type="button" @click="showInitialModal = false" class="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl">Hủy</button>
          <button type="button" @click="saveInitialCash" class="flex-1 py-2.5 bg-brand-500 text-white font-extrabold rounded-xl">Lưu Số Này</button>
        </div>
      </div>
    </div>

    <!-- Modal Cấu hình Ngân hàng VietQR -->
    <div v-if="showBankModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div>
          <h3 class="text-xl font-extrabold text-textmain">Tài Khoản Nhận VietQR</h3>
          <p class="text-xs text-gray-500 mt-1 font-medium">Dùng để tạo mã QR tự động điền đúng số tiền đơn hàng trên màn hình POS</p>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Ngân hàng</label>
            <select v-model="bankForm.bank_bin" @change="onBankChange" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold">
              <option value="">-- Chọn ngân hàng --</option>
              <option v-for="b in VIETQR_BANKS" :key="b.bin" :value="b.bin">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Số tài khoản</label>
            <input v-model="bankForm.account_no" type="text" placeholder="Nhập số tài khoản..." class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-600 mb-1">Tên chủ tài khoản (Không dấu)</label>
            <input v-model="bankForm.account_name" type="text" placeholder="VD: NGUYEN VAN A" class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase" />
          </div>
        </div>

        <div class="flex gap-2.5">
          <button type="button" @click="showBankModal = false" class="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl">Đóng</button>
          <button type="button" @click="saveBankConfig" class="flex-1 py-2.5 bg-brand-500 text-white font-extrabold rounded-xl">Lưu Cấu Hình</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE, getTodayVN, formatPrice, showToast, VIETQR_BANKS } from '../../utils/helpers'

const selectedDate = ref(getTodayVN())

const displayDate = computed(() => {
  const [y, m, d] = selectedDate.value.split('-')
  return `${d}/${m}/${y}`
})

const cashData = ref({
  date: selectedDate.value,
  initial_cash: 0,
  is_auto_rollover: false,
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
  return Number(actualCashInput.value) - cashData.value.expected_ending_cash
})

const showInitialModal = ref(false)
const tempInitialCash = ref(0)

const editingExpenseId = ref(null)
const expenseForm = ref({
  category: 'Mua nguyên liệu ngoài',
  amount: null,
  description: ''
})
const isSubmittingExpense = ref(false)

const showBankModal = ref(false)
const bankForm = ref({ bank_bin: '', bank_short_name: '', account_no: '', account_name: '' })

const fetchData = async () => {
  try {
    const res = await fetch(`${API_BASE}/cash-drawer?date=${selectedDate.value}`)
    if (res.ok) {
      const data = await res.json()
      cashData.value = {
        ...data,
        expenses: Array.isArray(data.expenses) ? data.expenses : []
      }
      actualCashInput.value = data.actual_ending_cash !== null ? data.actual_ending_cash : null
      closeNotesInput.value = data.notes || ''
    }
  } catch (err) {
    showToast('Không thể tải dữ liệu két tiền', 'error')
  }
}

const fetchBankConfig = async () => {
  try {
    const res = await fetch(`${API_BASE}/settings`)
    if (res.ok) {
      const s = await res.json()
      bankForm.value = {
        bank_bin: s.bank_bin || '',
        bank_short_name: s.bank_short_name || '',
        account_no: s.account_no || '',
        account_name: s.account_name || ''
      }
    }
  } catch (e) {}
}

const onBankChange = () => {
  const b = VIETQR_BANKS.find(x => x.bin === bankForm.value.bank_bin)
  if (b) bankForm.value.bank_short_name = b.shortName
}

const saveBankConfig = async () => {
  onBankChange()
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bankForm.value)
    })
    if (res.ok) {
      showBankModal.value = false
      showToast('Đã lưu tài khoản nhận VietQR!')
    }
  } catch (e) {
    showToast('Lỗi lưu cấu hình ngân hàng', 'error')
  }
}

const openInitialCashModal = () => {
  tempInitialCash.value = cashData.value.initial_cash
  showInitialModal.value = true
}

const saveInitialCash = async () => {
  try {
    const res = await fetch(`${API_BASE}/cash-drawer/initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate.value,
        initial_cash: tempInitialCash.value
      })
    })
    if (res.ok) {
      showInitialModal.value = false
      showToast('Đã cập nhật tiền két đầu ngày!')
      await fetchData()
    }
  } catch (err) {
    showToast('Không thể kết nối máy chủ', 'error')
  }
}

const resetToAutoRollover = async () => {
  try {
    const res = await fetch(`${API_BASE}/cash-drawer/initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate.value,
        reset_auto: true
      })
    })
    if (res.ok) {
      showInitialModal.value = false
      showToast('Đã đặt lại chế độ tự động lấy tiền kết két hôm trước!')
      await fetchData()
    }
  } catch (e) {
    showToast('Lỗi kết nối máy chủ', 'error')
  }
}

const submitCloseShift = async () => {
  if (actualCashInput.value === null || actualCashInput.value === '') return
  try {
    const res = await fetch(`${API_BASE}/cash-drawer/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate.value,
        actual_ending_cash: actualCashInput.value,
        notes: closeNotesInput.value
      })
    })
    if (res.ok) {
      showToast('Chốt két thành công! Số tiền này sẽ chuyển làm tiền đầu ngày hôm sau.')
      await fetchData()
    } else {
      showToast('Lỗi khi chốt két', 'error')
    }
  } catch (err) {
    showToast('Không thể kết nối máy chủ', 'error')
  }
}

const startEditExpense = (item) => {
  editingExpenseId.value = item.id
  expenseForm.value = {
    category: item.category,
    amount: Number(item.amount),
    description: item.description || ''
  }
}

const cancelEditExpense = () => {
  editingExpenseId.value = null
  expenseForm.value = { category: 'Mua nguyên liệu ngoài', amount: null, description: '' }
}

const submitExpense = async () => {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0) return
  isSubmittingExpense.value = true
  try {
    const url = editingExpenseId.value
      ? `${API_BASE}/expenses/${editingExpenseId.value}`
      : `${API_BASE}/expenses`
    const method = editingExpenseId.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate.value,
        category: expenseForm.value.category,
        amount: expenseForm.value.amount,
        description: expenseForm.value.description
      })
    })
    if (res.ok) {
      showToast(editingExpenseId.value ? 'Đã cập nhật khoản chi!' : 'Đã thêm khoản chi mới!')
      cancelEditExpense()
      await fetchData()
    } else {
      showToast('Lỗi khi lưu khoản chi', 'error')
    }
  } catch (err) {
    showToast('Không thể kết nối máy chủ', 'error')
  } finally {
    isSubmittingExpense.value = false
  }
}

const deleteExpense = async (id) => {
  if (!confirm('Bạn có chắc chắn muốn xóa khoản chi này không?')) return
  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Đã xóa khoản chi')
      if (editingExpenseId.value === id) cancelEditExpense()
      await fetchData()
    }
  } catch (err) {
    showToast('Không thể kết nối máy chủ', 'error')
  }
}

onMounted(() => {
  fetchData()
  fetchBankConfig()
})
</script>
