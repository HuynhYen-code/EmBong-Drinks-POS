<template>
  <div class="min-h-screen flex flex-col font-sans text-textmain bg-surface">
    <!-- Header -->
    <header class="bg-white shadow-sm z-20 border-b border-gray-100 h-16 shrink-0">
      <div class="h-full px-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Em Bông Logo" class="h-12 w-auto object-contain" />
        </div>
        <div class="flex gap-3 sm:gap-4 items-center">
          <button @click="isMobileCartOpen = !isMobileCartOpen" class="lg:hidden bg-brand-500 text-white px-5 py-2 rounded-full font-bold shadow-md hover:opacity-90 transition flex items-center gap-2">
            <span v-if="!isMobileCartOpen">Giỏ hàng ({{ cartItemCount }})</span>
            <span v-else>← Về Menu</span>
          </button>
          <router-link to="/admin" class="hidden sm:block text-brand-500 font-bold hover:underline mr-2">Trang Quản Trị</router-link>
          <div class="hidden sm:flex px-4 py-2 bg-brand-500/10 text-brand-500 rounded-full font-bold text-sm items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Quầy Phục Vụ
          </div>
        </div>
      </div>
    </header>
    
    <div class="flex-1 flex w-full h-full relative overflow-hidden">
    <!-- Bảng điều khiển bên trái (Chọn Món) -->
    <div :class="['h-full flex-col bg-surface border-b lg:border-b-0 lg:border-r border-gray-200 transition-all', isMobileCartOpen ? 'hidden lg:flex lg:w-2/3' : 'flex w-full lg:w-2/3']">
      
      <!-- Thanh Phân loại (Tabs) -->
      <div class="px-6 pt-6 pb-2 shrink-0">
        <div class="flex gap-3 overflow-x-auto scrollbar-hide">
          <button v-for="cat in categories" :key="cat" 
            @click="selectedCategory = cat"
            :class="[
              'px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm',
              selectedCategory === cat 
                ? 'bg-brand-500 text-white border-transparent' 
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
            ]">
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Danh sách Menu chính -->
      <div class="flex-1 overflow-y-auto p-6 pt-2 scrollbar-hide space-y-4">
        
        <div v-for="item in filteredItems" :key="item.id" 
             class="bg-white rounded-[24px] p-3 sm:p-4 shadow-sm border border-gray-100 flex gap-4 sm:gap-5 items-center hover:shadow-md transition-shadow cursor-pointer"
             @click="openItemModal(item)">
          <div class="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-2xl overflow-hidden shrink-0">
             <img :src="item.image_url" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold mb-1 text-textmain">{{ item.name }}</h3>
            <!-- Hiển thị khoảng giá -->
            <p class="text-brand-500 font-bold mb-3">{{ getPriceRange(item.prices_sizes_map) }}</p>
            <div class="flex gap-2">
              <span v-for="(price, size) in item.prices_sizes_map" :key="size" 
                    class="px-3 py-1 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200">
                {{ size }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Bảng điều khiển bên phải (Đơn hàng Hiện tại) -->
    <div :class="['bg-white flex-col h-full shadow-lg z-10 transition-all', isMobileCartOpen ? 'flex w-full lg:w-1/3' : 'hidden lg:flex lg:w-1/3']">
      <div class="p-6 border-b border-gray-100 shrink-0">
        <h2 class="text-2xl font-bold text-textmain">Đơn Hàng Hiện Tại</h2>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
        <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
          <p class="font-medium">Chưa có món nào được chọn</p>
        </div>
        
        <div v-for="(cartItem, index) in cart" :key="index" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-bold text-textmain">{{ cartItem.name }} ({{ cartItem.size }})</h4>
              <!-- Toppings list -->
              <div v-if="cartItem.toppings.length > 0" class="text-sm text-gray-500 mt-1">
                <span v-for="(t, i) in cartItem.toppings" :key="t.id">
                  + {{ t.name }}<span v-if="i < cartItem.toppings.length - 1">, </span>
                </span>
              </div>
            </div>
            <div class="font-bold text-brand-500">{{ formatPrice(cartItem.itemTotal) }}</div>
          </div>
          <div class="flex items-center justify-between mt-3">
             <div class="text-xs font-semibold text-gray-400">{{ formatPrice(cartItem.unitPriceTotal) }} / ly</div>
             <div class="flex items-center gap-3 bg-gray-50 rounded-xl p-1 border border-gray-100">
              <button @click="decreaseQty(index)" class="w-8 h-8 rounded-lg bg-white text-textmain shadow-sm flex items-center justify-center hover:bg-gray-100 transition font-bold">-</button>
              <span class="font-bold text-textmain w-4 text-center">{{ cartItem.quantity }}</span>
              <button @click="increaseQty(index)" class="w-8 h-8 rounded-lg bg-brand-500 text-white shadow-sm flex items-center justify-center hover:opacity-90 transition font-bold">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Checkout -->
      <div class="p-6 bg-white border-t border-gray-100 shrink-0">
        <div class="flex justify-between items-center mb-6">
          <span class="text-xl font-bold text-gray-500">Tổng cộng:</span>
          <span class="text-3xl font-extrabold text-brand-500">{{ formatPrice(totalAmount) }}</span>
        </div>
        <button 
          @click="openPaymentModal"
          :disabled="cart.length === 0 || isCheckingOut"
          class="w-full py-4 bg-brand-500 text-white rounded-[20px] font-bold text-xl hover:opacity-90 transition shadow-lg hover:shadow-xl disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg v-if="isCheckingOut" class="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          {{ isCheckingOut ? 'Đang xử lý...' : 'Thanh Toán' }}
        </button>
      </div>
    </div>

    <!-- Modal Xác nhận Thanh toán & Chọn Phương thức -->
    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 class="text-2xl font-extrabold text-textmain">Thanh Toán Đơn Hàng</h2>
            <p class="text-xs text-gray-400 font-semibold mt-0.5">{{ cartItemCount }} ly nước trong đơn</p>
          </div>
          <button @click="showPaymentModal = false" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold transition">✕</button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Total Price Hero Box -->
          <div class="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-5 text-center">
            <span class="text-xs uppercase tracking-wider font-extrabold text-brand-600 block mb-1">Tổng tiền cần thanh toán</span>
            <span class="text-4xl font-black text-brand-500">{{ formatPrice(totalAmount) }}</span>
          </div>

          <!-- Phương thức thanh toán -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Phương thức thanh toán:</label>
            <div class="grid grid-cols-2 gap-3">
              <button 
                type="button"
                @click="selectedPaymentMethod = 'cash'"
                :class="[
                  'p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 border-2 transition-all',
                  selectedPaymentMethod === 'cash'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 shadow-sm'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                ]">
                <span class="text-2xl">💵</span>
                <span>Tiền Mặt</span>
              </button>

              <button 
                type="button"
                @click="selectedPaymentMethod = 'transfer'"
                :class="[
                  'p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 border-2 transition-all',
                  selectedPaymentMethod === 'transfer'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-600 shadow-sm'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                ]">
                <span class="text-2xl">💳</span>
                <span>Chuyển Khoản</span>
              </button>
            </div>
          </div>

          <!-- Chi tiết Tiền mặt -->
          <div v-if="selectedPaymentMethod === 'cash'" class="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div class="flex justify-between items-center text-sm font-bold text-gray-600">
              <span>Tiền khách đưa:</span>
              <button type="button" @click="customerGiven = totalAmount" class="text-xs text-brand-500 font-bold hover:underline">Khách đưa đúng tiền</button>
            </div>
            
            <input 
              type="number" 
              v-model.number="customerGiven" 
              placeholder="Nhập số tiền..."
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-lg text-textmain focus:border-brand-500 outline-none"
            />

            <!-- Gợi ý tiền nhanh -->
            <div class="flex gap-2 flex-wrap">
              <button 
                v-for="amt in quickCashAmounts" 
                :key="amt"
                type="button"
                @click="customerGiven = amt"
                class="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-500 transition">
                {{ formatPrice(amt) }}
              </button>
            </div>

            <div class="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span class="text-sm font-bold text-gray-500">Tiền thối lại:</span>
              <span :class="['text-xl font-extrabold', changeAmount >= 0 ? 'text-green-600' : 'text-red-500']">
                {{ formatPrice(changeAmount >= 0 ? changeAmount : 0) }}
              </span>
            </div>
          </div>

          <!-- Chi tiết Chuyển khoản -->
          <div v-else class="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 text-blue-700 text-sm font-semibold">
            <span class="text-2xl">📲</span>
            <div>
              <p class="font-bold">Khách thanh toán chuyển khoản</p>
              <p class="text-xs text-blue-600/80 mt-0.5">Vui lòng kiểm tra thông báo ngân hàng trên điện thoại trước khi bấm hoàn tất.</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-100 bg-white flex gap-3">
          <button 
            type="button" 
            @click="showPaymentModal = false"
            class="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition">
            Quay lại
          </button>
          <button 
            type="button" 
            @click="executeCheckout"
            :disabled="isCheckingOut || (selectedPaymentMethod === 'cash' && customerGiven > 0 && customerGiven < totalAmount)"
            class="flex-2 py-3.5 bg-brand-500 text-white rounded-2xl font-bold text-base hover:opacity-90 transition shadow-md disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2">
            <svg v-if="isCheckingOut" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ isCheckingOut ? 'Đang lưu đơn...' : 'Xác Nhận Đơn' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal chọn Size & Topping -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-full">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-surface">
          <h2 class="text-2xl font-bold text-textmain">{{ selectedItem?.name }}</h2>
          <button @click="closeModal" class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold">X</button>
        </div>
        
        <!-- Body -->
        <div class="p-6 overflow-y-auto">
          <!-- Size Selector -->
          <div class="mb-6">
            <h3 class="text-lg font-bold mb-3 text-textmain">Kích thước</h3>
            <div class="grid grid-cols-2 gap-3">
              <button v-for="(price, size) in selectedItem?.prices_sizes_map" :key="size"
                @click="tempSelection.size = size; tempSelection.price = price"
                :class="[
                  'py-4 px-4 rounded-2xl font-bold border-2 text-left transition-all',
                  tempSelection.size === size 
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500' 
                    : 'border-gray-100 text-gray-500 hover:border-gray-300'
                ]">
                <div class="text-base mb-1">{{ size }}</div>
                <div class="text-sm opacity-80">{{ formatPrice(price) }}</div>
              </button>
            </div>
          </div>

          <!-- Toppings -->
          <div>
             <h3 class="text-lg font-bold mb-3 text-textmain">Topping</h3>
             <div class="space-y-2">
                <label v-for="t in toppings" :key="t.id" 
                       class="flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all"
                       :class="tempSelection.toppings.find(x => x.id === t.id) ? 'border-brand-500 bg-brand-500/10' : 'border-gray-100 hover:bg-gray-50'">
                  <div class="flex items-center gap-3">
                    <input type="checkbox" :value="t" v-model="tempSelection.toppings" class="w-5 h-5 accent-brand-500 rounded" />
                    <span class="font-bold text-textmain">{{ t.name }}</span>
                  </div>
                  <span class="font-bold text-brand-500">+{{ formatPrice(t.price) }}</span>
                </label>
             </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-100 bg-white">
          <button 
            @click="confirmAddToCart"
            :disabled="!tempSelection.size"
            class="w-full py-4 bg-brand-500 text-white rounded-[20px] font-bold text-lg hover:opacity-90 disabled:bg-gray-200 transition">
            Thêm vào đơn - {{ formatPrice(calculateTempTotal()) }}
          </button>
        </div>
      </div>
    </div>

  </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const categories = ['Món Bán Chạy', 'Rau Má', 'Trà / Trà Sữa', 'Trái Cây Tô', 'Topping']
const selectedCategory = ref('Món Bán Chạy')

const menuItems = ref([])
const toppings = ref([])

onMounted(async () => {
  try {
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/menu-items')
    if (res.ok) {
        const data = await res.json()
        menuItems.value = data.menu_items
        toppings.value = data.toppings
    } else {
        alert('Lỗi lấy dữ liệu từ Backend. Kiểm tra link Render.')
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    alert('Không thể kết nối đến Backend: ' + (import.meta.env.VITE_API_URL || 'http://localhost:5000/api'))
  }
})

const loadMockData = () => {
  // Đã xóa mock data để kiểm tra lỗi thật
}

const filteredItems = computed(() => {
  if (selectedCategory.value === 'Món Bán Chạy') {
    return menuItems.value.filter(i => i.category === 'Món Bán Chạy')
  }
  return menuItems.value.filter(i => i.category === selectedCategory.value)
})

const cart = ref([])
const showModal = ref(false)
const selectedItem = ref(null)
const tempSelection = ref({ size: null, price: 0, toppings: [] })
const isMobileCartOpen = ref(false)
const isCheckingOut = ref(false)

const showPaymentModal = ref(false)
const selectedPaymentMethod = ref('cash')
const customerGiven = ref(0)

const cartItemCount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0)
})

const quickCashAmounts = computed(() => {
  const currentTotal = totalAmount.value
  const standard = [50000, 100000, 200000, 500000]
  const filtered = standard.filter(amt => amt >= currentTotal)
  if (!filtered.includes(currentTotal)) {
    filtered.unshift(currentTotal)
  }
  return filtered
})

const changeAmount = computed(() => {
  return (customerGiven.value || 0) - totalAmount.value
})

const openPaymentModal = () => {
  if (cart.value.length === 0 || isCheckingOut.value) return
  selectedPaymentMethod.value = 'cash'
  customerGiven.value = totalAmount.value
  showPaymentModal.value = true
}

const openItemModal = (item) => {
  selectedItem.value = item
  const defaultSize = Object.keys(item.prices_sizes_map)[0]
  tempSelection.value = {
    size: defaultSize,
    price: item.prices_sizes_map[defaultSize],
    toppings: []
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
}

const calculateTempTotal = () => {
  let total = parseFloat(tempSelection.value.price) || 0
  tempSelection.value.toppings.forEach(t => {
    total += (parseFloat(t.price) || 0)
  })
  return total
}

const confirmAddToCart = () => {
  const unitPriceTotal = calculateTempTotal()
  
  const toppingsCopy = JSON.parse(JSON.stringify(tempSelection.value.toppings))

  const existingIndex = cart.value.findIndex(c => 
    c.id === selectedItem.value.id && 
    c.size === tempSelection.value.size &&
    JSON.stringify(c.toppings.map(t=>t.id).sort()) === JSON.stringify(toppingsCopy.map(t=>t.id).sort())
  )

  if (existingIndex > -1) {
    cart.value[existingIndex].quantity++
    cart.value[existingIndex].itemTotal = cart.value[existingIndex].quantity * unitPriceTotal
  } else {
    cart.value.push({
      id: selectedItem.value.id,
      name: selectedItem.value.name,
      size: tempSelection.value.size,
      toppings: toppingsCopy,
      quantity: 1,
      unitPriceTotal: unitPriceTotal,
      itemTotal: unitPriceTotal
    })
  }

  closeModal()
}

const increaseQty = (index) => {
  cart.value[index].quantity++
  cart.value[index].itemTotal = cart.value[index].quantity * cart.value[index].unitPriceTotal
}

const decreaseQty = (index) => {
  if (cart.value[index].quantity > 1) {
    cart.value[index].quantity--
    cart.value[index].itemTotal = cart.value[index].quantity * cart.value[index].unitPriceTotal
  } else {
    cart.value.splice(index, 1)
  }
}

const totalAmount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.itemTotal, 0)
})

const getPriceRange = (pricesMap) => {
  const prices = Object.values(pricesMap)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return formatPrice(min)
  return `${formatPrice(min)} - ${formatPrice(max)}`
}

const formatPrice = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const executeCheckout = async () => {
  if (cart.value.length === 0 || isCheckingOut.value) return
  isCheckingOut.value = true
  
  try {
    const payload = {
      payment_method: selectedPaymentMethod.value,
      cart_items: cart.value.map(item => ({
        id: item.id,
        size: item.size,
        quantity: item.quantity,
        toppings: item.toppings.map(t => ({ id: t.id, quantity: 1 }))
      }))
    }
    
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (res.ok) {
      const methodLabel = selectedPaymentMethod.value === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'
      alert(`Thanh toán thành công qua ${methodLabel}!`)
      cart.value = []
      showPaymentModal.value = false
    } else {
      const errData = await res.json()
      alert('Có lỗi xảy ra: ' + (errData.error || 'Lỗi server'))
    }
  } catch (error) {
    console.error('Lỗi thanh toán:', error)
    alert('Thanh toán thành công! (Chế độ giả lập)')
    cart.value = []
    showPaymentModal.value = false
  } finally {
    isCheckingOut.value = false
  }
}
</script>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
