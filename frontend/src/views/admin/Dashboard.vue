<template>
  <div class="space-y-6 sm:space-y-8 pb-12">
    <!-- Header & Pickers -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-textmain">Tổng Quan Thống Kê & Phân Tích</h2>
        <p class="text-gray-500 font-medium text-xs sm:text-sm mt-1">
          Theo dõi doanh thu, số ly, két tiền theo ngày và xuất báo cáo Excel tổng hợp theo tháng
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-2xs">
          <span class="text-xs font-bold text-gray-500">Ngày:</span>
          <input
            type="date"
            v-model="selectedDate"
            @change="onDateChange"
            class="font-bold text-sm text-gray-700 bg-transparent outline-none"
          />
        </div>

        <button
          @click="exportMonthlyReport"
          :disabled="isExporting"
          class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-60"
        >
          <span>📥</span>
          <span>{{ isExporting ? 'Đang xuất Excel...' : `Xuất Excel Tháng ${displayMonthLabel}` }}</span>
        </button>
      </div>
    </div>

    <!-- Quick Stats Cards (Ngày được chọn) -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs uppercase font-extrabold tracking-wider text-gray-400">Số Liệu Trong Ngày ({{ displayDate }})</h3>
        <span class="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200/80">
          {{ selectedDayOrdersCount }} đơn hàng
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <!-- Doanh thu ngày -->
        <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-2xs border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Doanh Thu Ngày</span>
              <span class="text-xl">💰</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-brand-600 mb-3">{{ formatPrice(todayStats.revenue) }}</div>
          </div>

          <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
            <span class="text-emerald-600">💵 TM: <strong>{{ formatPrice(todayStats.cash_revenue) }}</strong></span>
            <span class="text-blue-600">💳 CK: <strong>{{ formatPrice(todayStats.transfer_revenue) }}</strong></span>
          </div>
        </div>

        <!-- Số ly bán ra -->
        <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-2xs border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Số Ly Bán Ra</span>
              <span class="text-xl">🥤</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-emerald-600 mb-3">
              {{ todayStats.cups }} <span class="text-sm font-bold text-gray-400">ly</span>
            </div>
          </div>

          <div class="pt-3 border-t border-gray-100 text-xs font-medium text-gray-400">
            Trung bình: {{ selectedDayOrdersCount > 0 ? formatPrice(Math.round(todayStats.revenue / selectedDayOrdersCount)) : '0 ₫' }} / đơn
          </div>
        </div>

        <!-- Lợi nhuận gộp -->
        <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-2xs border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Lợi Nhuận Gộp</span>
              <span class="text-xl">📈</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-brand-600 mb-3">{{ formatPrice(todayStats.profit) }}</div>
          </div>

          <div class="pt-3 border-t border-gray-100 text-xs font-semibold text-orange-500 flex justify-between">
            <span>Giá vốn (COGS):</span>
            <strong>{{ formatPrice(todayStats.cogs) }}</strong>
          </div>
        </div>

        <!-- Két tiền ngày -->
        <div class="bg-white p-5 sm:p-6 rounded-3xl shadow-2xs border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Két Tiền Cuối Ngày</span>
              <span class="text-xl">🏦</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-gray-800 mb-3">{{ formatPrice(dailyCashSummary.expected_ending_cash) }}</div>
          </div>

          <div class="pt-3 border-t border-gray-100 text-xs flex justify-between text-gray-500 font-semibold">
            <span>Đầu ngày: {{ formatPrice(dailyCashSummary.initial_cash) }}</span>
            <router-link to="/admin/expenses" class="text-brand-600 font-bold hover:underline">Sổ két →</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Banner Thống Kê Theo Tháng & Xuất Excel -->
    <div class="bg-gradient-to-r from-brand-50 via-emerald-50/70 to-blue-50/50 p-5 sm:p-6 rounded-3xl border border-brand-200/80">
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <span class="text-xs uppercase font-black tracking-widest text-brand-600 block mb-1">📅 Thống Kê Lũy Kế Theo Tháng</span>
            <div class="flex items-center gap-2.5 flex-wrap">
              <h3 class="text-xl sm:text-2xl font-black text-textmain">Tháng {{ displayMonthLabel }}</h3>
              <input
                type="month"
                v-model="selectedMonth"
                @change="fetchData"
                class="px-3 py-1 bg-white border border-brand-200 rounded-xl text-xs font-extrabold text-brand-700 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 items-center">
          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Doanh Thu Tháng</div>
            <div class="text-lg sm:text-xl font-black text-brand-700">{{ formatPrice(monthStats.revenue) }}</div>
            <div class="text-[11px] text-gray-500 font-medium">
              TM {{ formatPrice(monthStats.cash_revenue) }} · CK {{ formatPrice(monthStats.transfer_revenue) }}
            </div>
          </div>

          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Tổng Số Ly</div>
            <div class="text-lg sm:text-xl font-black text-emerald-600">{{ monthStats.cups }} <span class="text-xs">ly</span></div>
            <div class="text-[11px] text-gray-500 font-medium">{{ monthStats.total_orders }} đơn hàng</div>
          </div>

          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Lợi Nhuận Gộp</div>
            <div class="text-lg sm:text-xl font-black text-brand-600">{{ formatPrice(monthStats.profit) }}</div>
            <div class="text-[11px] text-orange-500 font-semibold">COGS: {{ formatPrice(monthStats.cogs) }}</div>
          </div>

          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Chi Két Tháng</div>
            <div class="text-lg sm:text-xl font-black text-amber-600">{{ formatPrice(monthStats.expenses || 0) }}</div>
            <button
              @click="exportMonthlyReport"
              :disabled="isExporting"
              class="mt-0.5 text-[11px] font-extrabold text-emerald-700 hover:underline flex items-center gap-1"
            >
              📥 Tải file Excel chi tiết →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Biểu đồ 30 ngày & Top Món Bán Chạy -->
    <div class="flex gap-5 flex-col xl:flex-row">
      <!-- Interactive Chart -->
      <div class="flex-1 xl:w-2/3 bg-white p-5 sm:p-7 rounded-3xl shadow-2xs border border-gray-100 flex flex-col">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 class="text-lg sm:text-xl font-extrabold text-textmain">Biểu Đồ Xu Hướng (30 Ngày Hoạt Động Gần Nhất)</h3>
            <p class="text-xs text-gray-400 font-semibold mt-0.5">Chạm vào cột bất kỳ để xem nhanh số liệu & hóa đơn của ngày đó</p>
          </div>

          <div class="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 self-start">
            <button
              v-for="mode in chartModes"
              :key="mode.id"
              @click="currentChartMode = mode.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                currentChartMode === mode.id
                  ? 'bg-white text-brand-600 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-[260px] flex items-end gap-2 pb-6 border-b border-gray-200 relative overflow-x-auto scrollbar-hide pt-12">
          <div v-if="chartData.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 font-semibold">
            Chưa có dữ liệu thống kê
          </div>

          <div
            v-for="(day, index) in chartData"
            :key="index"
            @click="selectDateFromChart(day.fullDate)"
            class="flex-1 min-w-[30px] max-w-[46px] h-full flex flex-col justify-end items-center relative group cursor-pointer"
          >
            <!-- Tooltip -->
            <div class="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-bold text-xs p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl z-30 pointer-events-none">
              <div class="text-[10px] text-gray-400 font-semibold">Ngày {{ day.label }}</div>
              <div v-if="currentChartMode === 'revenue'" class="text-emerald-300 font-black">{{ formatPrice(day.revenue) }}</div>
              <div v-else-if="currentChartMode === 'cups'" class="text-emerald-300 font-black">{{ day.cups }} ly</div>
              <div v-else class="text-blue-300 font-black">{{ formatPrice(day.profit) }}</div>
            </div>

            <!-- Bar -->
            <div
              class="w-full rounded-t-xl transition-all"
              :class="[
                day.fullDate === selectedDate
                  ? 'bg-brand-500 shadow-md ring-2 ring-brand-200'
                  : currentChartMode === 'revenue'
                    ? 'bg-brand-200 group-hover:bg-brand-500'
                    : currentChartMode === 'cups'
                      ? 'bg-emerald-200 group-hover:bg-emerald-500'
                      : 'bg-blue-200 group-hover:bg-blue-500'
              ]"
              :style="{ height: `${Math.max(8, day.percent)}%` }"
            ></div>

            <div class="absolute -bottom-6 text-gray-500 font-bold text-[10px] whitespace-nowrap">
              {{ day.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- Top Món Bán Chạy -->
      <div class="flex-1 xl:w-1/3 bg-white p-5 sm:p-7 rounded-3xl shadow-2xs border border-gray-100 flex flex-col">
        <h3 class="text-lg sm:text-xl font-extrabold text-textmain mb-1">Top Món Bán Chạy</h3>
        <p class="text-xs text-gray-400 font-medium mb-5">Xếp hạng theo tổng số ly tích lũy</p>

        <div class="space-y-3 flex-1">
          <div v-if="topItems.length === 0" class="text-gray-400 font-semibold text-center py-12">
            Chưa có dữ liệu bán hàng
          </div>
          <div
            v-for="(item, index) in topItems"
            :key="item.name"
            class="flex items-center justify-between p-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl"
          >
            <div class="flex items-center gap-3 min-w-0 pr-2">
              <div
                :class="[
                  'w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0',
                  index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-200 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-brand-50 text-brand-600'
                ]"
              >
                #{{ index + 1 }}
              </div>
              <span class="font-bold text-gray-700 text-sm truncate">{{ item.name }}</span>
            </div>
            <div class="font-extrabold text-brand-600 text-sm whitespace-nowrap">{{ item.qty }} ly</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chi Tiết Số Lượng Từng Món Bán Được (Responsive Desktop Table + Mobile Cards) -->
    <div class="bg-white p-5 sm:p-7 rounded-3xl shadow-2xs border border-gray-100">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 class="text-lg sm:text-xl font-extrabold text-textmain">📊 Chi Tiết Số Lượng Từng Món Bán Được</h3>
          <p class="text-xs text-gray-400 font-semibold mt-0.5">Phân tích sản lượng từng món & size</p>
        </div>

        <div class="flex items-center bg-gray-100 p-1 rounded-xl self-start">
          <button
            @click="breakdownScope = 'date'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
              breakdownScope === 'date' ? 'bg-white text-brand-600 shadow-2xs' : 'text-gray-500'
            ]"
          >
            Ngày {{ displayDate }}
          </button>
          <button
            @click="breakdownScope = 'month'"
            :class="[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
              breakdownScope === 'month' ? 'bg-white text-brand-600 shadow-2xs' : 'text-gray-500'
            ]"
          >
            Tháng {{ displayMonthLabel }}
          </button>
        </div>
      </div>

      <div v-if="currentItemsBreakdown.length === 0" class="text-gray-400 font-semibold text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-sm">
        Chưa có món nào được bán trong khoảng thời gian này.
      </div>

      <template v-else>
        <!-- Desktop Table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-200 text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                <th class="py-3 px-4">Tên Món</th>
                <th class="py-3 px-4">Size</th>
                <th class="py-3 px-4 text-right">Số Ly Bán</th>
                <th class="py-3 px-4 text-right">Doanh Thu Món</th>
                <th class="py-3 px-4 text-right">Giá Vốn (COGS)</th>
                <th class="py-3 px-4 text-right">Lợi Nhuận Gộp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm font-medium text-gray-700">
              <tr v-for="item in currentItemsBreakdown" :key="`${item.id}-${item.size_name}`" class="hover:bg-gray-50/60">
                <td class="py-3 px-4 font-bold text-gray-800">{{ item.name }}</td>
                <td class="py-3 px-4">
                  <span class="px-2.5 py-0.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">{{ item.size_name }}</span>
                </td>
                <td class="py-3 px-4 text-right font-black text-emerald-600">{{ item.total_sold }} ly</td>
                <td class="py-3 px-4 text-right font-extrabold text-brand-600">{{ formatPrice(item.total_sales) }}</td>
                <td class="py-3 px-4 text-right text-orange-500 font-semibold">{{ formatPrice(item.total_cogs) }}</td>
                <td class="py-3 px-4 text-right font-bold text-emerald-600">{{ formatPrice(item.total_sales - item.total_cogs) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="md:hidden space-y-2.5">
          <div
            v-for="item in currentItemsBreakdown"
            :key="`mob-${item.id}-${item.size_name}`"
            class="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2"
          >
            <div class="min-w-0">
              <div class="font-extrabold text-sm text-textmain truncate">{{ item.name }}</div>
              <div class="text-xs text-gray-500 font-semibold mt-0.5">
                Size {{ item.size_name }} · Lãi {{ formatPrice(item.total_sales - item.total_cogs) }}
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-black text-emerald-600 text-sm">{{ item.total_sold }} ly</div>
              <div class="text-xs font-bold text-brand-600">{{ formatPrice(item.total_sales) }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Lịch sử hóa đơn trong ngày (Bất biến: Chỉ xem đối soát, KHÔNG cho phép xóa/sửa) -->
    <div class="bg-white p-5 sm:p-7 rounded-3xl shadow-2xs border border-gray-100">
      <div class="flex items-center justify-between mb-5 gap-2">
        <div>
          <h3 class="text-lg sm:text-xl font-extrabold text-textmain">Lịch Sử Hóa Đơn Ngày {{ displayDate }}</h3>
          <p class="text-xs text-gray-400 font-semibold mt-0.5">Hóa đơn đã thanh toán được lưu trữ cố định để bảo toàn số liệu kế toán</p>
        </div>
        <span class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full shrink-0">
          {{ historyData.length }} hóa đơn
        </span>
      </div>

      <div v-if="historyData.length === 0" class="text-gray-400 font-semibold text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-sm">
        Không có hóa đơn nào trong ngày {{ displayDate }}.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="order in historyData"
          :key="order.id"
          class="border border-gray-100 rounded-2xl p-4 sm:p-5 bg-gray-50/60 hover:bg-white hover:shadow-sm transition flex flex-col justify-between"
        >
          <div>
            <div class="flex justify-between items-center mb-3 pb-2.5 border-b border-gray-200 gap-2">
              <div class="font-extrabold text-gray-700 flex items-center gap-1.5 text-sm">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>#{{ order.id }}</span>
              </div>

              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md text-[11px] font-extrabold',
                    order.payment_method === 'transfer'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  ]"
                >
                  {{ order.payment_method === 'transfer' ? '💳 CK' : '💵 TM' }}
                </span>
                <span class="text-gray-400 font-bold text-xs">{{ order.time }}</span>
              </div>
            </div>

            <ul class="space-y-2 mb-3">
              <li
                v-for="(item, idx) in (order.isExpanded ? (order.items || []) : (order.items || []).slice(0, 3))"
                :key="idx"
                class="text-xs text-gray-700 space-y-0.5"
              >
                <div class="flex justify-between items-start gap-2">
                  <div class="flex-1 font-semibold">
                    <span class="font-extrabold text-brand-600">{{ parseInt(item.quantity) }}x</span>
                    {{ item.name }}
                    <span class="text-gray-400">({{ item.size_name }})</span>
                  </div>
                  <span class="font-bold shrink-0">{{ formatPrice(item.unit_price * item.quantity) }}</span>
                </div>

                <!-- Toppings với số phần chính xác -->
                <div v-if="item.toppings && item.toppings.length > 0" class="text-[11px] text-gray-500 pl-3 space-y-0.5">
                  <div v-for="(t, tIdx) in item.toppings" :key="tIdx" class="flex justify-between">
                    <span>+ {{ t.per_cup_qty > 1 ? `${t.per_cup_qty}x ` : '' }}{{ t.name }}</span>
                    <span>{{ formatPrice(t.unit_price * t.quantity) }}</span>
                  </div>
                </div>

                <!-- Ghi chú pha chế của món -->
                <div v-if="item.note" class="text-[11px] text-amber-700 font-semibold pl-3">
                  📝 {{ item.note }}
                </div>
              </li>
            </ul>

            <div v-if="(order.items || []).length > 3" class="text-center mb-2">
              <button @click="order.isExpanded = !order.isExpanded" class="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                {{ order.isExpanded ? 'Thu gọn' : `Xem thêm ${(order.items || []).length - 3} món` }}
              </button>
            </div>

            <div v-if="order.order_note" class="text-[11px] text-gray-500 italic mb-2">
              Ghi chú đơn: {{ order.order_note }}
            </div>
          </div>

          <div class="pt-2.5 border-t border-gray-200 space-y-1">
            <div v-if="order.discount_amount > 0" class="flex justify-between items-center text-xs text-amber-600 font-bold">
              <span>Giảm giá:</span>
              <span>-{{ formatPrice(order.discount_amount) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="font-bold text-gray-500 uppercase text-xs">Thực thu</span>
              <span class="font-black text-brand-600 text-base sm:text-lg">{{ formatPrice(order.total_amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { API_BASE, getTodayVN, getCurrentMonthVN, formatPrice, showToast } from '../../utils/helpers'

const selectedDate = ref(getTodayVN())
const selectedMonth = ref(getCurrentMonthVN())
const isExporting = ref(false)

const displayDate = computed(() => {
  const [y, m, d] = selectedDate.value.split('-')
  return `${d}/${m}/${y}`
})

const displayMonthLabel = computed(() => {
  const [y, m] = selectedMonth.value.split('-')
  return `${m}/${y}`
})

const chartModes = [
  { id: 'revenue', label: 'Doanh Thu' },
  { id: 'cups', label: 'Số Ly' },
  { id: 'profit', label: 'Lợi Nhuận' }
]
const currentChartMode = ref('revenue')
const breakdownScope = ref('date')
const rawRevenueData = ref([])

const chartData = computed(() => {
  if (!rawRevenueData.value || rawRevenueData.value.length === 0) return []
  const sortedRev = [...rawRevenueData.value].sort((a, b) => a.date.localeCompare(b.date))

  let maxVal = 1
  if (currentChartMode.value === 'cups') {
    maxVal = Math.max(...sortedRev.map(r => r.cups)) || 1
  } else if (currentChartMode.value === 'profit') {
    maxVal = Math.max(...sortedRev.map(r => r.profit)) || 1
  } else {
    maxVal = Math.max(...sortedRev.map(r => r.revenue)) || 1
  }

  return sortedRev.map(r => {
    const [, m, d] = r.date.split('-')
    let curVal = r.revenue
    if (currentChartMode.value === 'cups') curVal = r.cups
    else if (currentChartMode.value === 'profit') curVal = r.profit

    return {
      fullDate: r.date,
      label: `${d}/${m}`,
      revenue: r.revenue,
      cash_revenue: r.cash_revenue,
      transfer_revenue: r.transfer_revenue,
      cups: r.cups,
      profit: r.profit,
      percent: Math.min(100, Math.round((curVal / maxVal) * 100))
    }
  })
})

const topItems = ref([])
const todayStats = ref({ revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0 })
const monthStats = ref({ revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, expenses: 0, cups: 0, total_orders: 0 })
const dateItemsBreakdown = ref([])
const monthItemsBreakdown = ref([])
const historyData = ref([])
const dailyCashSummary = ref({ initial_cash: 0, expected_ending_cash: 0 })

const selectedDayOrdersCount = computed(() => historyData.value.length)

const currentItemsBreakdown = computed(() =>
  breakdownScope.value === 'date' ? dateItemsBreakdown.value : monthItemsBreakdown.value
)

const onDateChange = () => {
  if (selectedDate.value) {
    selectedMonth.value = selectedDate.value.slice(0, 7)
  }
  fetchData()
}

const selectDateFromChart = (dateStr) => {
  selectedDate.value = dateStr
  selectedMonth.value = dateStr.slice(0, 7)
  fetchData()
}

const fetchData = async () => {
  try {
    // Chạy song song cả 3 API (Stats + Cash Drawer + History) để tải trang tức thì!
    const [resStats, resCash, resHistory] = await Promise.all([
      fetch(`${API_BASE}/orders/stats?date=${selectedDate.value}&month=${selectedMonth.value}`),
      fetch(`${API_BASE}/cash-drawer?date=${selectedDate.value}`).catch(() => null),
      fetch(`${API_BASE}/orders/history?date=${selectedDate.value}`).catch(() => null)
    ])

    if (resStats && resStats.ok) {
      const data = await resStats.json()
      topItems.value = (data.top_items || []).map(i => ({ name: i.name, qty: parseInt(i.total_sold, 10) }))
      monthStats.value = data.this_month || { revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, expenses: 0, cups: 0, total_orders: 0 }
      dateItemsBreakdown.value = data.date_items_breakdown || []
      monthItemsBreakdown.value = data.month_items_breakdown || []
      rawRevenueData.value = data.revenue || []
      todayStats.value = data.selected_day || { revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0 }
    }

    if (resCash && resCash.ok) {
      const cashData = await resCash.json()
      dailyCashSummary.value = {
        initial_cash: cashData.initial_cash || 0,
        expected_ending_cash: cashData.expected_ending_cash || 0
      }
    }

    if (resHistory && resHistory.ok) {
      const history = await resHistory.json()
      historyData.value = Array.isArray(history)
        ? history.map(o => ({ ...o, isExpanded: false, items: Array.isArray(o.items) ? o.items : [] }))
        : []
    } else {
      historyData.value = []
    }
  } catch (e) {
    console.warn('Error fetching dashboard data:', e)
  }
}

const exportMonthlyReport = async () => {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const res = await fetch(`${API_BASE}/orders/export-monthly?month=${selectedMonth.value}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      showToast(err.error || 'Không thể xuất file Excel', 'error')
      return
    }
    const blob = await res.blob()
    const [yyyy, mm] = selectedMonth.value.split('-')
    const fileName = `Bao_Cao_EmBong_Thang_${mm}_${yyyy}.xlsx`
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    showToast(`Đã tải xuống báo cáo ${fileName}!`)
  } catch (e) {
    showToast('Lỗi kết nối khi tải file Excel!', 'error')
  } finally {
    isExporting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
