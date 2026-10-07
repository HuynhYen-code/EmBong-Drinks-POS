<template>
  <div class="space-y-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <h2 class="text-3xl font-extrabold text-textmain">Tổng Quan Thống Kê</h2>
      <div class="flex items-center gap-3">
        <label class="font-bold text-gray-600">Chọn ngày:</label>
        <input type="date" v-model="selectedDate" @change="fetchData" class="border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-700 bg-white shadow-sm hover:border-brand-500 transition outline-none focus:border-brand-500" />
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="flex gap-6 flex-wrap xl:flex-nowrap">
      <div class="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-gray-700 font-bold mb-3 text-lg">Doanh thu ({{ displayDate }})</h3>
        <div class="text-4xl font-extrabold text-brand-500">{{ formatPrice(todayStats.revenue) }}</div>
      </div>
      <div class="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-gray-700 font-bold mb-3 text-lg">Giá vốn (COGS)</h3>
        <div class="text-4xl font-extrabold text-orange-500">{{ formatPrice(todayStats.cogs) }}</div>
      </div>
      <div class="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-gray-700 font-bold mb-3 text-lg">Lợi nhuận gộp</h3>
        <div class="text-4xl font-extrabold text-brand-500">{{ formatPrice(todayStats.profit) }}</div>
      </div>
    </div>

    <!-- Charts / Top items -->
    <div class="flex gap-6 flex-col xl:flex-row">
      <!-- Chart -->
      <div class="flex-1 xl:w-2/3 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-2xl font-bold text-textmain mb-8">Biểu đồ doanh thu (30 ngày gần nhất)</h3>
        <div class="h-72 flex items-end gap-2 pb-2 border-b border-gray-200 mt-8 relative overflow-x-auto scrollbar-hide">
           <div v-if="chartData.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 font-semibold">
              Chưa có dữ liệu doanh thu
           </div>
           <div v-for="(day, index) in chartData" :key="index" 
                class="flex-1 min-w-[30px] bg-brand-500/20 rounded-t-xl relative group transition-all hover:bg-brand-500 cursor-pointer" 
                :style="{ height: `${day.percent}%` }">
             <div class="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-bold text-xs px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10 pointer-events-none">
               {{ formatPrice(day.value) }}
             </div>
             <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-600 font-bold text-[10px] whitespace-nowrap">
               {{ day.label }}
             </div>
           </div>
        </div>
      </div>

      <!-- Top Items -->
      <div class="flex-1 xl:w-1/3 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-2xl font-bold text-textmain mb-6">Top món bán chạy (Tổng)</h3>
        <div class="space-y-4">
           <div v-if="topItems.length === 0" class="text-gray-400 font-semibold text-center py-8">
              Chưa có dữ liệu bán hàng
           </div>
           <div v-for="(item, index) in topItems" :key="item.name" class="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl transition hover:bg-gray-100">
             <div class="flex items-center gap-4">
               <div class="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-extrabold text-lg shrink-0">{{ index + 1 }}</div>
               <span class="font-bold text-gray-700 text-lg line-clamp-1">{{ item.name }}</span>
             </div>
             <div class="font-extrabold text-brand-500 text-lg whitespace-nowrap">{{ item.qty }} ly</div>
           </div>
        </div>
      </div>
    </div>
    
    <!-- History Table -->
    <div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <h3 class="text-2xl font-bold text-textmain mb-6">Lịch sử hóa đơn trong ngày</h3>
      
      <div v-if="historyData.length === 0" class="text-gray-400 font-semibold text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          Không có hóa đơn nào được ghi nhận vào ngày {{ displayDate }}.
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="order in historyData" :key="order.id" class="border border-gray-100 rounded-2xl p-6 bg-gray-50/50 hover:bg-white hover:shadow-md transition duration-300">
              <div class="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                  <div class="font-bold text-gray-700 flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    Mã đơn: #{{ order.id }}
                  </div>
                  <div class="text-gray-500 font-semibold text-sm">{{ order.time }}</div>
              </div>
              <ul class="space-y-3 mb-4">
                  <li v-for="(item, idx) in (order.isExpanded ? order.items : order.items.slice(0, 2))" :key="idx" class="text-sm text-gray-700 flex flex-col gap-1">
                      <div class="flex justify-between items-start">
                          <div class="flex-1 pr-4 font-medium"><span class="font-bold text-brand-500">{{ parseInt(item.quantity) }} x</span> {{ item.name }} <span class="text-gray-400">({{ item.size_name }})</span></div>
                          <span class="font-bold">{{ formatPrice(item.unit_price * item.quantity) }}</span>
                      </div>
                      <div v-if="item.toppings && item.toppings.length > 0" class="text-xs text-gray-500 pl-6">
                          <div v-for="(t, tIdx) in item.toppings" :key="tIdx" class="flex justify-between">
                              <span>+ {{ t.name }}</span>
                              <span>{{ formatPrice(t.unit_price * item.quantity) }}</span>
                          </div>
                      </div>
                  </li>
              </ul>
              
              <div v-if="order.items.length > 2" class="text-center mb-4">
                  <button @click="order.isExpanded = !order.isExpanded" class="text-xs font-bold text-brand-500 hover:text-brand-600 transition bg-brand-500/10 px-3 py-1.5 rounded-full">
                      {{ order.isExpanded ? 'Thu gọn' : `Xem thêm ${order.items.length - 2} món` }}
                  </button>
              </div>

              <div class="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span class="font-bold text-gray-500 uppercase text-xs tracking-wider">Tổng tiền</span>
                  <span class="font-extrabold text-brand-500 text-xl">{{ formatPrice(order.total_amount) }}</span>
              </div>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const getTodayStr = () => {
    // Return YYYY-MM-DD for local timezone
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

const topItems = ref([])
const chartData = ref([])
const todayStats = ref({ revenue: 0, cogs: 0, profit: 0 })
const historyData = ref([])

const fetchData = async () => {
  try {
    // 1. Lấy dữ liệu biểu đồ và top món (Stats API)
    const resStats = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/orders/stats')
    if (resStats.ok) {
      const data = await resStats.json()
      topItems.value = data.top_items.map(i => ({ name: i.name, qty: parseInt(i.total_sold) }))
      
      if (data.revenue && data.revenue.length > 0) {
        const sortedRev = [...data.revenue].sort((a,b) => new Date(a.date) - new Date(b.date))
        const maxVal = Math.max(...sortedRev.map(r => parseFloat(r.revenue))) || 1
        
        chartData.value = sortedRev.map(r => {
          const dateObj = new Date(r.date);
          return {
            value: parseFloat(r.revenue),
            percent: (parseFloat(r.revenue) / maxVal) * 100,
            label: `${dateObj.getDate()}/${dateObj.getMonth()+1}`
          }
        })

        // Tìm doanh thu theo ngày được chọn
        const [selYear, selMonth, selDay] = selectedDate.value.split('-').map(Number)
        const match = data.revenue.find(r => {
            const d = new Date(r.date)
            return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth && d.getDate() === selDay
        })
        
        if (match) {
          todayStats.value = {
            revenue: parseFloat(match.revenue),
            cogs: parseFloat(match.cogs),
            profit: parseFloat(match.profit)
          }
        } else {
          todayStats.value = { revenue: 0, cogs: 0, profit: 0 }
        }
      } else {
          todayStats.value = { revenue: 0, cogs: 0, profit: 0 }
      }
    }
    
    // 2. Lấy lịch sử chi tiết cho ngày được chọn
    const resHistory = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/history?date=${selectedDate.value}`)
    if (resHistory.ok) {
        const history = await resHistory.json()
        historyData.value = history.map(o => ({ ...o, isExpanded: false }))
    } else {
        historyData.value = []
    }
  } catch (e) {
    console.warn("Backend not running, using empty states", e);
    historyData.value = []
  }
}

onMounted(() => {
    fetchData()
})

const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
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
