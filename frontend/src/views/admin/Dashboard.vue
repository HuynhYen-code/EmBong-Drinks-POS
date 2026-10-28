<template>
  <div class="space-y-8 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-extrabold text-textmain">Tổng Quan Thống Kê & Phân Tích</h2>
        <p class="text-gray-500 font-medium text-sm mt-1">Theo dõi doanh thu, số ly, phương thức thanh toán và chi tiết món bán</p>
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

    <!-- Quick Stats Cards (Ngày được chọn) -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs uppercase font-extrabold tracking-wider text-gray-400">Số Liệu Trong Ngày ({{ displayDate }})</h3>
        <span class="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200/60">
          {{ selectedDayOrdersCount }} đơn hàng
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <!-- Doanh thu ngày -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Doanh Thu Ngày</span>
              <span class="text-xl">💰</span>
            </div>
            <div class="text-3xl font-black text-brand-500 mb-3">{{ formatPrice(todayStats.revenue) }}</div>
          </div>
          
          <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
            <span class="text-emerald-600 flex items-center gap-1">
              <span>💵 TM:</span>
              <strong>{{ formatPrice(todayStats.cash_revenue) }}</strong>
            </span>
            <span class="text-blue-600 flex items-center gap-1">
              <span>💳 CK:</span>
              <strong>{{ formatPrice(todayStats.transfer_revenue) }}</strong>
            </span>
          </div>
        </div>

        <!-- Số ly bán ra trong ngày -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Số Ly Bán Ra</span>
              <span class="text-xl">🥤</span>
            </div>
            <div class="text-3xl font-black text-emerald-600 mb-3">{{ todayStats.cups }} <span class="text-sm font-bold text-gray-400">ly</span></div>
          </div>
          
          <div class="pt-3 border-t border-gray-100 text-xs font-medium text-gray-400">
            Tổng cộng tất cả các món & size bán trong ngày
          </div>
        </div>

        <!-- Lợi nhuận gộp -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Lợi Nhuận Gộp</span>
              <span class="text-xl">📈</span>
            </div>
            <div class="text-3xl font-black text-brand-500 mb-3">{{ formatPrice(todayStats.profit) }}</div>
          </div>
          
          <div class="pt-3 border-t border-gray-100 text-xs font-semibold text-orange-500 flex justify-between">
            <span>Giá vốn (COGS):</span>
            <strong>{{ formatPrice(todayStats.cogs) }}</strong>
          </div>
        </div>

        <!-- Két tiền ngày -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-500 font-bold text-xs uppercase tracking-wider">Két Tiền Cuối Ngày</span>
              <span class="text-xl">🏦</span>
            </div>
            <div class="text-3xl font-black text-gray-800 mb-3">{{ formatPrice(dailyCashSummary.expected_ending_cash) }}</div>
          </div>
          
          <div class="pt-3 border-t border-gray-100 text-xs flex justify-between text-gray-500 font-semibold">
            <span>Đầu ngày: {{ formatPrice(dailyCashSummary.initial_cash) }}</span>
            <router-link to="/admin/expenses" class="text-brand-500 hover:underline">Chi tiết & Chi →</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Tổng quan Tháng này (Banner Month-To-Date) -->
    <div class="bg-gradient-to-r from-brand-500/10 via-emerald-50 to-blue-50/40 p-6 rounded-3xl border border-brand-500/20">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="text-xs uppercase font-black tracking-widest text-brand-600 block mb-1">📅 Thống Kê Lũy Kế Tháng Này</span>
          <h3 class="text-2xl font-black text-textmain">Tháng {{ currentMonthLabel }}</h3>
        </div>

        <div class="flex items-center gap-6 flex-wrap">
          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Doanh Thu Tháng</div>
            <div class="text-2xl font-black text-brand-600">{{ formatPrice(monthStats.revenue) }}</div>
            <div class="text-[11px] text-gray-500">
              💵 {{ formatPrice(monthStats.cash_revenue) }} | 💳 {{ formatPrice(monthStats.transfer_revenue) }}
            </div>
          </div>

          <div class="h-10 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Tổng Số Ly Bán</div>
            <div class="text-2xl font-black text-emerald-600">{{ monthStats.cups }} <span class="text-sm">ly</span></div>
            <div class="text-[11px] text-gray-500">{{ monthStats.total_orders }} đơn hàng</div>
          </div>

          <div class="h-10 w-px bg-gray-200 hidden sm:block"></div>

          <div>
            <div class="text-xs font-bold text-gray-500 mb-0.5">Lợi Nhuận Gộp Tháng</div>
            <div class="text-2xl font-black text-brand-500">{{ formatPrice(monthStats.profit) }}</div>
            <div class="text-[11px] text-orange-500 font-semibold">COGS: {{ formatPrice(monthStats.cogs) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts / Top items -->
    <div class="flex gap-6 flex-col xl:flex-row">
      <!-- Interactive Chart Section -->
      <div class="flex-1 xl:w-2/3 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 class="text-xl font-extrabold text-textmain">Biểu Đồ Xu Hướng (30 Ngày Gần Nhất)</h3>
            <p class="text-xs text-gray-400 font-semibold mt-0.5">Rà chuột vào từng cột để xem chi tiết tiền mặt, chuyển khoản và số ly</p>
          </div>

          <!-- Metric Selector -->
          <div class="flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
            <button 
              v-for="mode in chartModes" 
              :key="mode.id"
              @click="currentChartMode = mode.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                currentChartMode === mode.id 
                  ? 'bg-white text-brand-600 shadow-2xs' 
                  : 'text-gray-500 hover:text-gray-700'
              ]">
              {{ mode.label }}
            </button>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="flex-1 min-h-[300px] flex items-end gap-2 pb-6 border-b border-gray-200 relative overflow-x-auto scrollbar-hide pt-10">
          <div v-if="chartData.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 font-semibold">
            Chưa có dữ liệu thống kê
          </div>

          <div 
            v-for="(day, index) in chartData" 
            :key="index" 
            class="flex-1 min-w-[32px] max-w-[48px] h-full flex flex-col justify-end items-center relative group">
            
            <!-- Tooltip -->
            <div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-bold text-xs p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl z-30 pointer-events-none scale-95 group-hover:scale-100">
              <div class="text-[10px] text-gray-400 font-semibold mb-1">Ngày {{ day.fullDate }}</div>
              <div v-if="currentChartMode === 'revenue'" class="text-brand-400 font-black">{{ formatPrice(day.revenue) }}</div>
              <div v-else-if="currentChartMode === 'cups'" class="text-emerald-400 font-black">{{ day.cups }} ly nước</div>
              <div v-else class="text-blue-400 font-black">LN: {{ formatPrice(day.profit) }}</div>
              <div class="text-[10px] text-gray-300 mt-1 font-normal">
                TM: {{ formatPrice(day.cash_revenue) }} | CK: {{ formatPrice(day.transfer_revenue) }}
              </div>
            </div>

            <!-- Bar -->
            <div 
              class="w-full rounded-t-xl transition-all cursor-pointer relative"
              :class="[
                currentChartMode === 'revenue' 
                  ? 'bg-brand-500/30 group-hover:bg-brand-500' 
                  : currentChartMode === 'cups'
                    ? 'bg-emerald-500/30 group-hover:bg-emerald-500'
                    : 'bg-blue-500/30 group-hover:bg-blue-500',
                day.fullDate === selectedDate ? '!bg-brand-500 shadow-md ring-2 ring-brand-300' : ''
              ]"
              :style="{ height: `${Math.max(6, day.percent)}%` }">
            </div>

            <!-- X-axis Label -->
            <div class="absolute -bottom-6 text-gray-500 font-bold text-[10px] whitespace-nowrap">
              {{ day.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- Top Items & Món nổi bật -->
      <div class="flex-1 xl:w-1/3 bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
        <h3 class="text-xl font-extrabold text-textmain mb-1">Top Món Bán Chạy (Tổng)</h3>
        <p class="text-xs text-gray-400 font-medium mb-6">Xếp hạng theo tổng số ly tích lũy</p>

        <div class="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
          <div v-if="topItems.length === 0" class="text-gray-400 font-semibold text-center py-12">
            Chưa có dữ liệu bán hàng
          </div>
          <div 
            v-for="(item, index) in topItems" 
            :key="item.name" 
            class="flex items-center justify-between p-4 bg-gray-50/80 border border-gray-100 rounded-2xl transition hover:bg-gray-100">
            <div class="flex items-center gap-3">
              <div 
                :class="[
                  'w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0',
                  index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-200 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-brand-500/10 text-brand-500'
                ]">
                #{{ index + 1 }}
              </div>
              <span class="font-bold text-gray-700 text-sm line-clamp-1">{{ item.name }}</span>
            </div>
            <div class="font-extrabold text-brand-600 text-base whitespace-nowrap">{{ item.qty }} ly</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bảng Phân Tích Chi Tiết Số Lượng Từng Món Bán Được -->
    <div class="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 class="text-2xl font-extrabold text-textmain flex items-center gap-2">
            <span>📊</span> Chi Tiết Số Lượng Từng Món Bán Được
          </h3>
          <p class="text-xs text-gray-400 font-semibold mt-1">
            Bảng thống kê số lượng và doanh thu từng món/size giúp tối ưu thực đơn kinh doanh
          </p>
        </div>

        <!-- Filter Tab: Hôm nay vs Tháng này -->
        <div class="flex items-center bg-gray-100 p-1 rounded-xl">
          <button 
            @click="breakdownScope = 'date'"
            :class="[
              'px-4 py-2 rounded-lg text-xs font-bold transition-all',
              breakdownScope === 'date' 
                ? 'bg-white text-brand-600 shadow-2xs' 
                : 'text-gray-500 hover:text-gray-700'
            ]">
            Ngày {{ displayDate }}
          </button>
          <button 
            @click="breakdownScope = 'month'"
            :class="[
              'px-4 py-2 rounded-lg text-xs font-bold transition-all',
              breakdownScope === 'month' 
                ? 'bg-white text-brand-600 shadow-2xs' 
                : 'text-gray-500 hover:text-gray-700'
            ]">
            Cả Tháng Này
          </button>
        </div>
      </div>

      <!-- Table -->
      <div v-if="currentItemsBreakdown.length === 0" class="text-gray-400 font-semibold text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        Chưa có món nào được bán trong khoảng thời gian này.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <th class="py-3 px-4">Tên Món</th>
              <th class="py-3 px-4">Kích Thước (Size)</th>
              <th class="py-3 px-4 text-right">Số Lượng Bán (Ly)</th>
              <th class="py-3 px-4 text-right">Tổng Doanh Thu</th>
              <th class="py-3 px-4 text-right">Giá Vốn (COGS)</th>
              <th class="py-3 px-4 text-right">Lợi Nhuận</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-sm font-medium text-gray-700">
            <tr v-for="item in currentItemsBreakdown" :key="`${item.id}-${item.size_name}`" class="hover:bg-gray-50/60 transition">
              <td class="py-3.5 px-4 font-bold text-gray-800">{{ item.name }}</td>
              <td class="py-3.5 px-4">
                <span class="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                  {{ item.size_name }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right font-black text-emerald-600 text-base">
                {{ item.total_sold }} <span class="text-xs text-gray-400 font-semibold">ly</span>
              </td>
              <td class="py-3.5 px-4 text-right font-extrabold text-brand-600">
                {{ formatPrice(item.total_sales) }}
              </td>
              <td class="py-3.5 px-4 text-right text-orange-500 font-semibold">
                {{ formatPrice(item.total_cogs) }}
              </td>
              <td class="py-3.5 px-4 text-right font-bold text-emerald-600">
                {{ formatPrice(item.total_sales - item.total_cogs) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Lịch sử hóa đơn trong ngày -->
    <div class="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-2xl font-extrabold text-textmain">Lịch Sử Hóa Đơn Trong Ngày</h3>
          <p class="text-xs text-gray-400 font-semibold mt-0.5">Danh sách các đơn hàng đã phục vụ ngày {{ displayDate }}</p>
        </div>
        <span class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
          {{ historyData.length }} hóa đơn
        </span>
      </div>
      
      <div v-if="historyData.length === 0" class="text-gray-400 font-semibold text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        Không có hóa đơn nào được ghi nhận vào ngày {{ displayDate }}.
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="order in historyData" :key="order.id" class="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 hover:bg-white hover:shadow-md transition duration-300 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
              <div class="font-bold text-gray-700 flex items-center gap-2 text-sm">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                Mã đơn: #{{ order.id }}
              </div>
              
              <!-- Payment Method Badge -->
              <div class="flex items-center gap-2">
                <span 
                  :class="[
                    'px-2.5 py-0.5 rounded-md text-[11px] font-extrabold',
                    order.payment_method === 'transfer' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  ]">
                  {{ order.payment_method === 'transfer' ? '💳 Chuyển khoản' : '💵 Tiền mặt' }}
                </span>
                <span class="text-gray-400 font-semibold text-xs">{{ order.time }}</span>
              </div>
            </div>

            <ul class="space-y-2.5 mb-4">
              <li v-for="(item, idx) in (order.isExpanded ? order.items : order.items.slice(0, 2))" :key="idx" class="text-xs text-gray-700 flex flex-col gap-1">
                <div class="flex justify-between items-start">
                  <div class="flex-1 pr-3 font-medium">
                    <span class="font-bold text-brand-500">{{ parseInt(item.quantity) }} x</span> {{ item.name }} 
                    <span class="text-gray-400 font-semibold">({{ item.size_name }})</span>
                  </div>
                  <span class="font-bold">{{ formatPrice(item.unit_price * item.quantity) }}</span>
                </div>
                <div v-if="item.toppings && item.toppings.length > 0" class="text-[11px] text-gray-400 pl-4">
                  <div v-for="(t, tIdx) in item.toppings" :key="tIdx" class="flex justify-between">
                    <span>+ {{ t.name }}</span>
                    <span>{{ formatPrice(t.unit_price * item.quantity) }}</span>
                  </div>
                </div>
              </li>
            </ul>
            
            <div v-if="order.items.length > 2" class="text-center mb-3">
              <button @click="order.isExpanded = !order.isExpanded" class="text-xs font-bold text-brand-500 hover:text-brand-600 transition bg-brand-500/10 px-3 py-1 rounded-full">
                {{ order.isExpanded ? 'Thu gọn' : `Xem thêm ${order.items.length - 2} món` }}
              </button>
            </div>
          </div>

          <div class="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span class="font-bold text-gray-500 uppercase text-xs tracking-wider">Tổng tiền</span>
            <span class="font-extrabold text-brand-500 text-lg">{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

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

const currentMonthLabel = computed(() => {
    const d = new Date()
    return `${d.getMonth() + 1}/${d.getFullYear()}`
})

const chartModes = [
    { id: 'revenue', label: 'Doanh Thu (VNĐ)' },
    { id: 'cups', label: 'Số Ly Bán' },
    { id: 'profit', label: 'Lợi Nhuận (VNĐ)' }
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
        const [y, m, d] = r.date.split('-')
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

const todayStats = ref({ revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0 })
const monthStats = ref({ revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0, total_orders: 0 })
const dateItemsBreakdown = ref([])
const monthItemsBreakdown = ref([])
const historyData = ref([])
const dailyCashSummary = ref({ initial_cash: 0, expected_ending_cash: 0 })

const selectedDayOrdersCount = computed(() => historyData.value.length)

const currentItemsBreakdown = computed(() => {
    return breakdownScope.value === 'date' ? dateItemsBreakdown.value : monthItemsBreakdown.value
})

const fetchData = async () => {
    try {
        // 1. Lấy dữ liệu thống kê từ API orders/stats
        const resStats = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/stats?date=${selectedDate.value}`)
        if (resStats.ok) {
            const data = await resStats.json()
            
            topItems.value = (data.top_items || []).map(i => ({ name: i.name, qty: parseInt(i.total_sold) }))
            monthStats.value = data.this_month || { revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0, total_orders: 0 }
            dateItemsBreakdown.value = data.date_items_breakdown || []
            monthItemsBreakdown.value = data.month_items_breakdown || []
            rawRevenueData.value = data.revenue || []

            // Gán dữ liệu của ngày đang chọn
            if (data.selected_day) {
                todayStats.value = data.selected_day
            } else {
                todayStats.value = { revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0 }
            }
        } else {
            rawRevenueData.value = []
            todayStats.value = { revenue: 0, cash_revenue: 0, transfer_revenue: 0, cogs: 0, profit: 0, cups: 0 }
        }

        // 2. Lấy thông tin két tiền ngày được chọn
        try {
            const resCash = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cash-drawer?date=${selectedDate.value}`)
            if (resCash.ok) {
                const cashData = await resCash.json()
                dailyCashSummary.value = {
                    initial_cash: cashData.initial_cash || 0,
                    expected_ending_cash: cashData.expected_ending_cash || 0
                }
            }
        } catch (err) {
            console.warn('Cannot fetch cash drawer', err)
        }

        // 3. Lấy lịch sử chi tiết cho ngày được chọn
        const resHistory = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/history?date=${selectedDate.value}`)
        if (resHistory.ok) {
            const history = await resHistory.json()
            historyData.value = history.map(o => ({ ...o, isExpanded: false }))
        } else {
            historyData.value = []
        }
    } catch (e) {
        console.warn('Backend not running or error', e)
        historyData.value = []
    }
}

onMounted(() => {
    fetchData()
})

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)
</script>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
</style>
