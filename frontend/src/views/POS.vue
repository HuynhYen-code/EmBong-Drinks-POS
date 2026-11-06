<template>
  <div class="h-dvh flex flex-col font-sans text-textmain bg-surface overflow-hidden">
    <!-- Top Bar -->
    <header class="bg-white shadow-2xs z-20 border-b border-gray-100 h-14 sm:h-16 shrink-0">
      <div class="h-full px-3 sm:px-6 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="/logo.jpg" alt="Em Bông Logo" class="h-10 sm:h-11 w-auto object-contain rounded-lg shrink-0" />
          <div class="hidden md:flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-600 rounded-full font-bold text-xs border border-brand-200/60">
            <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Quầy Bán Hàng
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center gap-1.5 sm:gap-2.5">
          <!-- Tra cứu Công thức pha chế nhanh -->
          <button
            @click="openRecipeDrawer"
            class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition"
            title="Tra cứu nhanh công thức pha chế"
          >
            <span>📖</span>
            <span>Công Thức</span>
          </button>

          <!-- Bật/Tắt Âm thanh thanh toán -->
          <button
            @click="toggleSoundMute"
            :class="[
              'w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-base transition',
              isSoundMuted
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100'
            ]"
            :title="isSoundMuted ? 'Âm thanh thanh toán đang TẮT (Bấm để bật)' : 'Âm thanh thanh toán đang BẬT'"
          >
            {{ isSoundMuted ? '🔇' : '🔊' }}
          </button>

          <!-- Quản trị (hiển thị cả trên mobile & desktop) -->
          <router-link
            to="/admin"
            class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition"
          >
            <span>⚙️</span>
            <span class="hidden sm:inline">Quản Trị</span>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main POS Workspace -->
    <div class="flex-1 flex w-full min-h-0 relative overflow-hidden">
      <!-- LEFT: Khu vực Chọn Món -->
      <div :class="[
        'h-full flex-col bg-surface lg:border-r border-gray-200 min-w-0',
        isMobileCartOpen ? 'hidden lg:flex lg:w-2/3 xl:w-[68%]' : 'flex w-full lg:w-2/3 xl:w-[68%]'
      ]">
        <!-- Thanh Tìm kiếm + Tabs Phân loại -->
        <div class="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 bg-surface shrink-0 space-y-2.5 border-b border-gray-200/60">
          <!-- Search Input -->
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Tìm món cực nhanh (VD: olong, rau ma, tra sua...)"
              class="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-textmain placeholder:text-gray-400 focus:border-brand-500 outline-none shadow-2xs transition"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <!-- Category Pills -->
          <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = cat; searchQuery = ''"
              :class="[
                'px-4 py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all shrink-0',
                selectedCategory === cat && !searchQuery
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              ]"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Danh sách Món -->
        <div
          class="flex-1 overflow-y-auto p-3 sm:p-5 scrollbar-hide"
          :class="cart.length > 0 ? 'pb-24 lg:pb-6' : 'pb-6'"
        >
          <!-- Loading Skeleton lần đầu -->
          <div v-if="isLoadingMenu && menuItems.length === 0" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            <div v-for="n in 6" :key="n" class="bg-white rounded-2xl p-3.5 border border-gray-100 flex gap-3 animate-pulse">
              <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-2xl shrink-0"></div>
              <div class="flex-1 space-y-2 py-1">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                <div class="flex gap-2 pt-1">
                  <div class="h-7 w-16 bg-gray-200 rounded-xl"></div>
                  <div class="h-7 w-16 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredItems.length === 0" class="h-56 flex flex-col items-center justify-center text-gray-400 text-center px-4">
            <span class="text-4xl mb-2">🧋</span>
            <p class="font-bold text-gray-500">Không tìm thấy món phù hợp</p>
            <button v-if="searchQuery || selectedCategory !== 'Tất Cả'" @click="searchQuery = ''; selectedCategory = 'Tất Cả'" class="mt-2 text-xs font-bold text-brand-500 hover:underline">
              Xem tất cả món
            </button>
          </div>

          <!-- Grid Món: Bấm vào thẻ để tùy chỉnh Topping/Ghi chú HOẶC bấm nút Size để thêm nhanh 1 chạm -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2.5 sm:gap-3.5">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              @click="openItemModal(item)"
              class="bg-white rounded-2xl p-3 sm:p-3.5 shadow-2xs border border-gray-100 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer flex gap-3 items-center relative active:scale-[0.99]"
            >
              <!-- Badge số lượng đã chọn trong giỏ -->
              <div
                v-if="itemQtyInCartMap[item.id]"
                class="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-brand-500 text-white font-black text-xs flex items-center justify-center shadow-sm z-10"
              >
                {{ itemQtyInCartMap[item.id] }}
              </div>

              <!-- Ảnh món -->
              <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-2xl">🧋</span>
              </div>

              <!-- Nội dung + Nút chọn nhanh Size 1 chạm -->
              <div class="flex-1 min-w-0">
                <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{{ item.category }}</div>
                <h3 class="text-sm sm:text-base font-extrabold text-textmain leading-snug line-clamp-2 mb-2">
                  {{ item.name }}
                </h3>

                <!-- Nút bấm nhanh từng Size (1-tap thêm thẳng vào giỏ, cực nhanh trên điện thoại!) -->
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="(price, size) in item.prices_sizes_map"
                    :key="size"
                    type="button"
                    @click.stop="quickAddSize(item, size, price)"
                    class="px-2.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-500 hover:text-white active:bg-brand-600 active:text-white text-brand-700 border border-brand-200/80 text-xs font-extrabold transition flex items-center gap-1"
                    :title="`Thêm nhanh 1 ${item.name} (${size})`"
                  >
                    <span>+ {{ size }}</span>
                    <span class="opacity-75">· {{ formatShortPrice(price) }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Thanh Giỏ hàng Nổi dưới đáy cho Điện thoại (Sticky Mobile Checkout Bar) -->
        <div
          v-if="cart.length > 0 && !isMobileCartOpen"
          class="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] flex items-center gap-2.5"
        >
          <button
            @click="isMobileCartOpen = true"
            class="flex-1 py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-left flex items-center justify-between transition"
          >
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-xl bg-brand-500 text-white font-black text-xs flex items-center justify-center">{{ cartItemCount }}</span>
              <div>
                <div class="text-[11px] font-bold text-gray-500 leading-none">Xem / Sửa giỏ</div>
                <div class="text-sm font-black text-brand-600 mt-0.5">{{ formatPrice(subtotalAmount) }}</div>
              </div>
            </div>
            <span class="text-xs font-bold text-brand-600">Chi tiết ▲</span>
          </button>

          <button
            @click="openPaymentModal"
            class="py-3.5 px-5 rounded-2xl bg-brand-500 text-white font-extrabold text-sm shadow-md active:scale-95 transition shrink-0"
          >
            Thanh Toán →
          </button>
        </div>
      </div>

      <!-- RIGHT: Giỏ hàng / Đơn hàng hiện tại (Desktop Sidebar & Mobile Full Sheet) -->
      <div :class="[
        'bg-white flex-col h-full shadow-lg z-20',
        isMobileCartOpen ? 'flex w-full lg:w-1/3 xl:w-[32%]' : 'hidden lg:flex lg:w-1/3 xl:w-[32%]'
      ]">
        <!-- Cart Header -->
        <div class="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <button
              @click="isMobileCartOpen = false"
              class="lg:hidden px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs mr-1"
            >
              ← Thêm món
            </button>
            <h2 class="text-lg sm:text-xl font-extrabold text-textmain">
              Đơn Hàng
              <span v-if="cartItemCount > 0" class="text-sm font-bold text-brand-500">({{ cartItemCount }} ly)</span>
            </h2>
          </div>

          <button
            v-if="cart.length > 0"
            @click="clearCart"
            class="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
          >
            Xóa giỏ
          </button>
        </div>

        <!-- Cart Items List -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gray-50/40">
          <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 text-center px-6">
            <span class="text-4xl mb-2 opacity-60">🛒</span>
            <p class="font-bold text-sm text-gray-500">Chưa có món nào trong đơn</p>
            <p class="text-xs text-gray-400 mt-1">Bấm nút <strong class="text-brand-600">+ Size</strong> để thêm nhanh 1 chạm hoặc bấm vào món để chọn Topping & Ghi chú</p>
          </div>

          <div
            v-for="(cartItem, index) in cart"
            :key="index"
            class="bg-white p-3.5 rounded-2xl shadow-2xs border border-gray-100 hover:border-brand-200 transition"
          >
            <div class="flex justify-between items-start gap-2">
              <div class="flex-1 min-w-0 cursor-pointer" @click="editCartItem(index)">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="font-extrabold text-sm text-textmain">{{ cartItem.name }}</h4>
                  <span class="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-bold text-[11px]">{{ cartItem.size }}</span>
                </div>

                <!-- Toppings kèm số lượng phần/ly -->
                <div v-if="cartItem.toppings.length > 0" class="text-xs text-gray-600 mt-1 space-y-0.5">
                  <div v-for="t in cartItem.toppings" :key="t.id" class="flex items-center gap-1">
                    <span class="text-brand-600 font-bold">+ {{ t.quantity > 1 ? `${t.quantity}x ` : '' }}{{ t.name }}</span>
                    <span class="text-gray-400 text-[11px]">({{ formatShortPrice(t.price * t.quantity) }}/ly)</span>
                  </div>
                </div>

                <!-- Ghi chú pha chế -->
                <div v-if="cartItem.note" class="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 text-[11px] font-bold">
                  <span>📝</span>
                  <span>{{ cartItem.note }}</span>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="font-extrabold text-brand-600 text-sm">{{ formatPrice(cartItem.itemTotal) }}</div>
                <button
                  @click="editCartItem(index)"
                  class="text-[11px] font-bold text-blue-600 hover:underline mt-1"
                >
                  Sửa món
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
              <div class="text-xs font-semibold text-gray-400">{{ formatPrice(cartItem.unitPriceTotal) }} / ly</div>
              <div class="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                <button
                  @click="decreaseQty(index)"
                  class="w-7 h-7 rounded-lg bg-white text-textmain shadow-2xs flex items-center justify-center hover:bg-gray-100 transition font-black"
                >
                  {{ cartItem.quantity === 1 ? '🗑' : '−' }}
                </button>
                <span class="font-extrabold text-textmain w-6 text-center text-sm">{{ cartItem.quantity }}</span>
                <button
                  @click="increaseQty(index)"
                  class="w-7 h-7 rounded-lg bg-brand-500 text-white shadow-2xs flex items-center justify-center hover:bg-brand-600 transition font-black"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Checkout Footer -->
        <div class="p-4 sm:p-5 bg-white border-t border-gray-100 shrink-0">
          <div class="flex justify-between items-center mb-3.5">
            <span class="text-sm sm:text-base font-bold text-gray-500">Tạm tính ({{ cartItemCount }} ly):</span>
            <span class="text-2xl font-black text-brand-600">{{ formatPrice(subtotalAmount) }}</span>
          </div>
          <button
            @click="openPaymentModal"
            :disabled="cart.length === 0 || isCheckingOut"
            class="w-full py-3.5 sm:py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base sm:text-lg hover:bg-brand-600 transition shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{{ isCheckingOut ? 'Đang xử lý...' : 'Thanh Toán Đơn Hàng' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- MODAL 1: Tùy Chỉnh Món (Size, Số ly, Ghi chú nhanh, Topping nhiều phần) -->
    <!-- ======================================================================= -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-surface shrink-0">
          <div class="min-w-0 pr-2">
            <span class="text-[11px] font-bold uppercase text-brand-600">
              {{ editingCartIndex !== null ? 'Chỉnh sửa món trong giỏ' : 'Tùy chỉnh món' }}
            </span>
            <h2 class="text-lg sm:text-xl font-extrabold text-textmain truncate">{{ selectedItem?.name }}</h2>
          </div>
          <button @click="closeModal" class="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold shrink-0">✕</button>
        </div>

        <!-- Body -->
        <div class="p-5 overflow-y-auto space-y-5">
          <!-- 1. Chọn Size & Số lượng ly -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-extrabold text-textmain uppercase tracking-wide">1. Kích thước (Size)</h3>
              <!-- Bộ đếm số ly ngay trong modal -->
              <div class="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                <span class="text-xs font-bold text-gray-500 pl-2">Số ly:</span>
                <button
                  type="button"
                  @click="tempSelection.cupQty = Math.max(1, tempSelection.cupQty - 1)"
                  class="w-7 h-7 rounded-lg bg-white font-black text-gray-700 shadow-2xs"
                >−</button>
                <span class="w-6 text-center font-black text-sm text-brand-600">{{ tempSelection.cupQty }}</span>
                <button
                  type="button"
                  @click="tempSelection.cupQty++"
                  class="w-7 h-7 rounded-lg bg-brand-500 text-white font-black shadow-2xs"
                >+</button>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                v-for="(price, size) in selectedItem?.prices_sizes_map"
                :key="size"
                type="button"
                @click="tempSelection.size = size; tempSelection.price = price"
                :class="[
                  'py-3 px-3.5 rounded-2xl font-bold border-2 text-left transition-all',
                  tempSelection.size === size
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-2xs'
                    : 'border-gray-100 text-gray-600 hover:border-gray-200'
                ]"
              >
                <div class="text-sm font-extrabold">{{ size }}</div>
                <div class="text-xs opacity-80 mt-0.5">{{ formatPrice(price) }}</div>
              </button>
            </div>
          </div>

          <!-- 2. Ghi chú pha chế nhanh (Ít đá, ít ngọt...) -->
          <div>
            <h3 class="text-sm font-extrabold text-textmain uppercase tracking-wide mb-2.5">2. Ghi chú pha chế</h3>
            <div class="flex flex-wrap gap-1.5 mb-2.5">
              <button
                v-for="tag in QUICK_ITEM_NOTES"
                :key="tag"
                type="button"
                @click="toggleNoteTag(tag)"
                :class="[
                  'px-3 py-1.5 rounded-xl text-xs font-bold border transition',
                  tempSelection.noteTags.includes(tag)
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                ]"
              >
                {{ tag }}
              </button>
            </div>
            <input
              v-model="tempSelection.customNote"
              type="text"
              placeholder="Ghi chú riêng khác (VD: Cho ly riêng, khách quen...)"
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:border-brand-500 outline-none"
            />
          </div>

          <!-- 3. Topping (Hỗ trợ chọn số lượng phần tùy thích cho mỗi ly: 1, 2, 5... phần!) -->
          <div v-if="toppings.length > 0">
            <div class="flex items-center justify-between mb-2.5">
              <h3 class="text-sm font-extrabold text-textmain uppercase tracking-wide">3. Topping thêm (Tùy chỉnh SL / 1 ly)</h3>
              <span v-if="selectedToppingCountPerCup > 0" class="text-xs font-extrabold text-brand-600">
                Đã chọn {{ selectedToppingCountPerCup }} phần/ly
              </span>
            </div>

            <div class="space-y-2">
              <div
                v-for="t in toppings"
                :key="t.id"
                @click="getTempToppingQty(t.id) === 0 && changeTempToppingQty(t, 1)"
                :class="[
                  'flex items-center justify-between p-3 rounded-2xl border-2 transition-all',
                  getTempToppingQty(t.id) > 0
                    ? 'border-brand-500 bg-brand-50/70'
                    : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                ]"
              >
                <div class="min-w-0 pr-2">
                  <div class="font-bold text-sm text-textmain truncate">{{ t.name }}</div>
                  <div class="text-xs font-bold text-brand-600">+{{ formatPrice(t.price) }} / phần</div>
                </div>

                <!-- Stepper số lượng phần Topping -->
                <div v-if="getTempToppingQty(t.id) > 0" class="flex items-center gap-2 bg-white rounded-xl p-1 border border-brand-200 shadow-2xs shrink-0" @click.stop>
                  <button
                    type="button"
                    @click="changeTempToppingQty(t, -1)"
                    class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-textmain font-black flex items-center justify-center"
                  >−</button>
                  <input
                    type="number"
                    min="0"
                    :value="getTempToppingQty(t.id)"
                    @input="setTempToppingExactQty(t, $event.target.value)"
                    class="w-10 text-center font-black text-sm text-brand-700 outline-none"
                  />
                  <button
                    type="button"
                    @click="changeTempToppingQty(t, 1)"
                    class="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-black flex items-center justify-center"
                  >+</button>
                </div>

                <button
                  v-else
                  type="button"
                  @click.stop="changeTempToppingQty(t, 1)"
                  class="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-brand-500 hover:text-white text-gray-700 font-bold text-xs transition shrink-0"
                >
                  + Thêm
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-5 border-t border-gray-100 bg-white shrink-0">
          <button
            @click="confirmAddToCart"
            :disabled="!tempSelection.size"
            class="w-full py-3.5 sm:py-4 bg-brand-500 text-white rounded-2xl font-extrabold text-base hover:bg-brand-600 disabled:bg-gray-200 transition shadow-md"
          >
            {{ editingCartIndex !== null ? 'Cập nhật món' : `Thêm ${tempSelection.cupQty} ly vào đơn` }} · {{ formatPrice(calculateTempTotal() * tempSelection.cupQty) }}
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- MODAL 2: Thanh Toán (Giảm giá VNĐ/% + Tiền mặt + Mã QR VietQR Động)     -->
    <!-- ======================================================================= -->
    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[94dvh]">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/70 shrink-0">
          <div>
            <h2 class="text-xl font-extrabold text-textmain">Thanh Toán Đơn Hàng</h2>
            <p class="text-xs text-gray-500 font-semibold">{{ cartItemCount }} ly nước · Tạm tính {{ formatPrice(subtotalAmount) }}</p>
          </div>
          <button @click="showPaymentModal = false" class="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold">✕</button>
        </div>

        <div class="p-5 space-y-4 overflow-y-auto">
          <!-- Giảm giá / Khuyến mãi -->
          <div class="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-gray-600 uppercase tracking-wide">🎁 Giảm giá / Chiết khấu</span>
              <div class="flex bg-white rounded-lg p-0.5 border border-gray-200 text-xs font-bold">
                <button
                  type="button"
                  @click="discountMode = 'vnd'; discountInput = 0"
                  :class="['px-2.5 py-1 rounded-md transition', discountMode === 'vnd' ? 'bg-brand-500 text-white' : 'text-gray-500']"
                >VNĐ</button>
                <button
                  type="button"
                  @click="discountMode = 'percent'; discountInput = 0"
                  :class="['px-2.5 py-1 rounded-md transition', discountMode === 'percent' ? 'bg-brand-500 text-white' : 'text-gray-500']"
                >%</button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input
                type="number"
                min="0"
                v-model.number="discountInput"
                :placeholder="discountMode === 'percent' ? 'Nhập % giảm (VD: 10)...' : 'Nhập số tiền giảm (VD: 5000)...'"
                class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-textmain focus:border-brand-500 outline-none"
              />
              <button
                v-if="discountInput > 0"
                type="button"
                @click="discountInput = 0"
                class="px-2.5 py-2 text-xs font-bold text-gray-500 hover:text-red-500"
              >Xóa</button>
            </div>

            <!-- Gợi ý giảm nhanh -->
            <div class="flex gap-1.5 flex-wrap">
              <template v-if="discountMode === 'percent'">
                <button v-for="p in [5, 10, 15, 20, 50]" :key="p" type="button" @click="discountInput = p" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600">
                  -{{ p }}%
                </button>
              </template>
              <template v-else>
                <button v-for="v in [5000, 10000, 15000, 20000]" :key="v" type="button" @click="discountInput = v" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600">
                  -{{ formatShortPrice(v) }}
                </button>
              </template>
            </div>
          </div>

          <!-- Tổng tiền thực thu -->
          <div class="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-center">
            <span class="text-[11px] uppercase tracking-wider font-extrabold text-brand-600 block">Khách Cần Thanh Toán</span>
            <span class="text-3xl sm:text-4xl font-black text-brand-600 block mt-0.5">{{ formatPrice(finalPayableAmount) }}</span>
            <span v-if="computedDiscountAmount > 0" class="text-xs font-bold text-amber-600 mt-1 inline-block">
              Đã giảm {{ formatPrice(computedDiscountAmount) }} từ {{ formatPrice(subtotalAmount) }}
            </span>
          </div>

          <!-- Phương thức thanh toán -->
          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              @click="selectedPaymentMethod = 'cash'"
              :class="[
                'p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all text-sm',
                selectedPaymentMethod === 'cash'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-2xs'
                  : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
              ]"
            >
              <span class="text-xl">💵</span>
              <span>Tiền Mặt</span>
            </button>

            <button
              type="button"
              @click="selectedPaymentMethod = 'transfer'"
              :class="[
                'p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all text-sm',
                selectedPaymentMethod === 'transfer'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-2xs'
                  : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
              ]"
            >
              <span class="text-xl">💳</span>
              <span>Chuyển Khoản</span>
            </button>
          </div>

          <!-- Chi tiết Tiền mặt -->
          <div v-if="selectedPaymentMethod === 'cash'" class="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div class="flex justify-between items-center text-xs font-bold text-gray-600">
              <span>Tiền khách đưa:</span>
              <button type="button" @click="customerGiven = finalPayableAmount" class="text-brand-600 hover:underline">Đưa đủ tiền</button>
            </div>

            <input
              type="number"
              v-model.number="customerGiven"
              placeholder="Nhập tiền khách đưa..."
              class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-extrabold text-base text-textmain focus:border-brand-500 outline-none"
            />

            <div class="flex gap-1.5 flex-wrap">
              <button
                v-for="amt in quickCashAmounts"
                :key="amt"
                type="button"
                @click="customerGiven = amt"
                class="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-brand-500 hover:text-brand-600 transition"
              >
                {{ formatPrice(amt) }}
              </button>
            </div>

            <div class="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500">Tiền thối lại khách:</span>
              <span :class="['text-lg font-black', changeAmount >= 0 ? 'text-emerald-600' : 'text-red-500']">
                {{ changeAmount >= 0 ? formatPrice(changeAmount) : `Thiếu ${formatPrice(Math.abs(changeAmount))}` }}
              </span>
            </div>
          </div>

          <!-- Chi tiết Chuyển khoản + Mã QR VietQR Động -->
          <div v-else class="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-3">
            <!-- Đã cấu hình VietQR & không đang sửa -->
            <div v-if="hasBankConfig && !isEditingBank" class="flex flex-col items-center text-center">
              <div class="w-full flex items-center justify-between mb-2">
                <span class="text-xs font-extrabold text-blue-800">📲 Quét mã VietQR tự điền số tiền</span>
                <button type="button" @click="isEditingBank = true" class="text-[11px] font-bold text-blue-600 hover:underline">⚙️ Đổi TK</button>
              </div>
              <div class="bg-white p-2.5 rounded-2xl shadow-xs border border-blue-100">
                <img
                  :src="vietQrUrl"
                  alt="VietQR"
                  class="w-48 h-auto sm:w-52 mx-auto rounded-xl object-contain"
                />
              </div>
              <div class="mt-2 text-xs font-bold text-gray-700">
                {{ bankSettings.bank_short_name }} · {{ bankSettings.account_no }}
              </div>
              <div v-if="bankSettings.account_name" class="text-[11px] font-semibold text-gray-500 uppercase">
                {{ bankSettings.account_name }}
              </div>
            </div>

            <!-- Chưa cấu hình hoặc đang sửa TK nhận QR -->
            <div v-else class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-blue-800">⚙️ Cài đặt Ngân hàng tạo mã VietQR</span>
                <button v-if="hasBankConfig" type="button" @click="isEditingBank = false" class="text-xs font-bold text-gray-500">Đóng</button>
              </div>
              <select
                v-model="bankSettings.bank_bin"
                @change="onBankSelectChange"
                class="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
              >
                <option value="">-- Chọn Ngân hàng --</option>
                <option v-for="b in VIETQR_BANKS" :key="b.bin" :value="b.bin">{{ b.name }}</option>
              </select>
              <input
                v-model="bankSettings.account_no"
                type="text"
                placeholder="Số tài khoản nhận tiền..."
                class="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
              />
              <input
                v-model="bankSettings.account_name"
                type="text"
                placeholder="Tên chủ tài khoản (Không dấu, VD: NGUYEN VAN A)"
                class="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-gray-700 uppercase outline-none"
              />
              <button
                type="button"
                @click="saveBankSettings"
                class="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Lưu & Hiện Mã QR
              </button>
            </div>
          </div>

          <!-- Ghi chú đơn hàng (tùy chọn) -->
          <input
            v-model="orderNote"
            type="text"
            placeholder="Ghi chú hóa đơn (Tùy chọn: Tên khách, bàn, giao hàng...)"
            class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-brand-500 outline-none"
          />
        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-5 border-t border-gray-100 bg-white flex gap-2.5 shrink-0">
          <button
            type="button"
            @click="showPaymentModal = false"
            class="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition"
          >
            Quay lại
          </button>
          <button
            type="button"
            @click="executeCheckout"
            :disabled="isCheckingOut || (selectedPaymentMethod === 'cash' && customerGiven > 0 && customerGiven < finalPayableAmount)"
            class="flex-[2] py-3.5 bg-brand-500 text-white rounded-2xl font-extrabold text-sm sm:text-base hover:bg-brand-600 transition shadow-md disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2"
          >
            <span>{{ isCheckingOut ? 'Đang lưu đơn...' : '✓ Hoàn Tất Thanh Toán' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- MODAL 3: Sổ Tay Tra Cứu Nhanh Công Thức Pha Chế (Gom chung các Size)    -->
    <!-- ======================================================================= -->
    <div v-if="showRecipeModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[92dvh] sm:h-[86dvh]">
        <!-- Header -->
        <div class="px-5 py-4 bg-white border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 class="text-lg sm:text-xl font-extrabold text-textmain flex items-center gap-2">
              <span>📖</span> Sổ Tay Tra Cứu Công Thức Pha Chế
            </h2>
            <p class="text-xs text-gray-500 font-medium">Các size cùng 1 món được gom chung giúp đối chiếu định lượng nhanh</p>
          </div>
          <button @click="showRecipeModal = false" class="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold shrink-0">✕</button>
        </div>

        <!-- Search & Category Filter for Barista -->
        <div class="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 space-y-2.5 shrink-0">
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              v-model="recipeSearch"
              type="text"
              placeholder="Gõ tên món để xem công thức ngay (VD: olong lai, rau ma dau xanh...)"
              class="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-textmain focus:bg-white focus:border-brand-500 outline-none"
            />
            <button v-if="recipeSearch" @click="recipeSearch = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div class="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              v-for="cat in categories"
              :key="'rcat-' + cat"
              @click="recipeCategory = cat"
              :class="[
                'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition',
                recipeCategory === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Grouped Recipe Cards -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div v-if="groupedRecipeCategories.length === 0" class="text-center py-16 text-gray-400 font-bold">
            Không tìm thấy công thức món phù hợp.
          </div>

          <div v-for="group in groupedRecipeCategories" :key="group.category" class="space-y-3">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-extrabold uppercase tracking-wider">{{ group.category }}</span>
              <div class="h-px flex-1 bg-gray-200"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="drink in group.items"
                :key="drink.id"
                class="bg-white rounded-2xl p-4 shadow-2xs border border-gray-200/80 flex flex-col gap-3"
              >
                <!-- Tên món chung -->
                <div class="flex items-center gap-3 pb-2.5 border-b border-gray-100">
                  <img v-if="drink.image_url" :src="drink.image_url" class="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0" />
                  <div class="min-w-0">
                    <h3 class="font-extrabold text-base text-textmain leading-snug">{{ drink.name }}</h3>
                    <span class="text-[11px] font-bold text-gray-400">{{ (drink.sizes || []).length }} kích thước</span>
                  </div>
                </div>

                <!-- Các Size đặt cạnh nhau trong cùng 1 thẻ món! -->
                <div :class="['grid gap-2.5', (drink.sizes || []).length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1']">
                  <div
                    v-for="sz in drink.sizes"
                    :key="sz.id"
                    class="bg-surface rounded-xl p-3 border border-gray-200/70"
                  >
                    <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-dashed border-gray-200">
                      <span class="px-2.5 py-0.5 rounded-lg bg-brand-500 text-white font-extrabold text-xs">Size {{ sz.size_name }}</span>
                      <span class="text-xs font-bold text-gray-400">{{ formatShortPrice(sz.price) }}</span>
                    </div>

                    <ul v-if="sz.ingredients && sz.ingredients.length > 0" class="space-y-1.5">
                      <li
                        v-for="(ing, iIdx) in sz.ingredients"
                        :key="iIdx"
                        class="flex items-center justify-between text-xs sm:text-sm gap-2"
                      >
                        <span class="font-semibold text-gray-700">{{ ing.name }}</span>
                        <span class="font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60 whitespace-nowrap">
                          {{ ing.quantity }} {{ ing.unit }}
                        </span>
                      </li>
                    </ul>
                    <p v-else class="text-xs text-gray-400 italic">Chưa nhập định lượng</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  API_BASE,
  removeAccents,
  formatPrice,
  formatShortPrice,
  showToast,
  isSoundMuted,
  toggleSoundMute,
  playCheckoutSound,
  QUICK_ITEM_NOTES,
  VIETQR_BANKS
} from '../utils/helpers'

const POS_CACHE_KEY = 'embong_pos_cache_v2'

const menuItems = ref([])
const toppings = ref([])
const isLoadingMenu = ref(true)

const selectedCategory = ref('Món Bán Chạy')
const searchQuery = ref('')

// Cart & Item Customization state
const cart = ref([])
const showModal = ref(false)
const selectedItem = ref(null)
const editingCartIndex = ref(null)
const tempSelection = ref({
  size: null,
  price: 0,
  cupQty: 1,
  toppings: [], // [{ id, name, price, quantity }] -> quantity là số phần cho 1 ly
  noteTags: [],
  customNote: ''
})

const isMobileCartOpen = ref(false)
const isCheckingOut = ref(false)

// Payment & Discount state
const showPaymentModal = ref(false)
const selectedPaymentMethod = ref('cash')
const customerGiven = ref(0)
const discountMode = ref('vnd') // 'vnd' | 'percent'
const discountInput = ref(0)
const orderNote = ref('')

// VietQR Bank Settings
const bankSettings = ref({
  bank_bin: '',
  bank_short_name: '',
  account_no: '',
  account_name: ''
})
const isEditingBank = ref(false)

// Barista Recipe Lookup Drawer state
const showRecipeModal = ref(false)
const recipeSearch = ref('')
const recipeCategory = ref('Tất Cả')

// Danh sách Category động dựa trên dữ liệu thực tế
const categories = computed(() => {
  const baseOrder = ['Tất Cả', 'Món Bán Chạy', 'Rau Má', 'Trà / Trà Sữa', 'Trà Trái Cây', 'Trái Cây Tô', 'Cà Phê']
  const dynamicCats = new Set(baseOrder)
  for (const item of menuItems.value) {
    if (item.category) dynamicCats.add(item.category)
  }
  return Array.from(dynamicCats).filter(cat => {
    if (cat === 'Tất Cả') return true
    return menuItems.value.some(i => i.category === cat)
  })
})

onMounted(async () => {
  // 1. Tải tức thì từ bộ nhớ đệm localStorage (0ms) để nhân viên thao tác ngay lập tức
  try {
    const cachedRaw = localStorage.getItem(POS_CACHE_KEY)
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw)
      if (Array.isArray(cached.menu_items)) menuItems.value = cached.menu_items
      if (Array.isArray(cached.toppings)) toppings.value = cached.toppings
      if (menuItems.value.length > 0 && !menuItems.value.some(i => i.category === selectedCategory.value)) {
        selectedCategory.value = 'Tất Cả'
      }
      isLoadingMenu.value = false
    }
  } catch (e) {
    console.warn('Cache parse ignored', e)
  }

  // 2. Làm mới dữ liệu thực đơn & cấu hình ngân hàng song song dưới nền
  try {
    const [resMenu, resSettings] = await Promise.all([
      fetch(`${API_BASE}/menu-items`),
      fetch(`${API_BASE}/settings`).catch(() => null)
    ])

    if (resMenu && resMenu.ok) {
      const data = await resMenu.json()
      menuItems.value = data.menu_items || []
      toppings.value = data.toppings || []
      localStorage.setItem(POS_CACHE_KEY, JSON.stringify({
        menu_items: menuItems.value,
        toppings: toppings.value,
        ts: Date.now()
      }))
      if (menuItems.value.length > 0 && !menuItems.value.some(i => i.category === selectedCategory.value)) {
        selectedCategory.value = 'Tất Cả'
      }
    } else if (menuItems.value.length === 0) {
      showToast('Không tải được thực đơn từ máy chủ', 'error')
    }

    if (resSettings && resSettings.ok) {
      const s = await resSettings.json()
      bankSettings.value = {
        bank_bin: s.bank_bin || '',
        bank_short_name: s.bank_short_name || '',
        account_no: s.account_no || '',
        account_name: s.account_name || ''
      }
    }
  } catch (error) {
    console.error('Error fetching POS data:', error)
    if (menuItems.value.length === 0) {
      showToast('Không thể kết nối đến máy chủ Backend!', 'error')
    }
  } finally {
    isLoadingMenu.value = false
  }
})

// Lọc món thông minh: Có từ khóa thì tìm xuyên suốt toàn bộ danh mục (bỏ dấu tiếng Việt)
const filteredItems = computed(() => {
  const q = removeAccents(searchQuery.value)
  if (q) {
    return menuItems.value.filter(i =>
      removeAccents(i.name).includes(q) || removeAccents(i.category).includes(q)
    )
  }
  if (selectedCategory.value === 'Tất Cả') {
    return menuItems.value
  }
  return menuItems.value.filter(i => i.category === selectedCategory.value)
})

// Gom nhóm Công thức cho Pha chế (Category -> Món -> Các Size)
const groupedRecipeCategories = computed(() => {
  const q = removeAccents(recipeSearch.value)
  const filtered = menuItems.value.filter(item => {
    const matchCat = recipeCategory.value === 'Tất Cả' || item.category === recipeCategory.value
    if (!q) return matchCat
    return removeAccents(item.name).includes(q) || removeAccents(item.category).includes(q)
  })

  const map = new Map()
  for (const item of filtered) {
    const cat = item.category || 'Khác'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(item)
  }

  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
})

const openRecipeDrawer = () => {
  recipeSearch.value = ''
  recipeCategory.value = 'Tất Cả'
  showRecipeModal.value = true
}

// Đếm số lượng từng món đang có trong giỏ để hiển thị badge trên thẻ món
const itemQtyInCartMap = computed(() => {
  const map = {}
  for (const c of cart.value) {
    map[c.id] = (map[c.id] || 0) + c.quantity
  }
  return map
})

const cartItemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))

const subtotalAmount = computed(() => cart.value.reduce((sum, item) => sum + item.itemTotal, 0))

const computedDiscountAmount = computed(() => {
  const raw = Math.max(0, Number(discountInput.value) || 0)
  if (raw === 0) return 0
  if (discountMode.value === 'percent') {
    const pct = Math.min(100, raw)
    return Math.round((subtotalAmount.value * pct) / 100)
  }
  return Math.min(subtotalAmount.value, Math.round(raw))
})

const finalPayableAmount = computed(() => Math.max(0, subtotalAmount.value - computedDiscountAmount.value))

watch(finalPayableAmount, (newVal) => {
  if (showPaymentModal.value && selectedPaymentMethod.value === 'cash') {
    customerGiven.value = newVal
  }
})

const quickCashAmounts = computed(() => {
  const currentTotal = finalPayableAmount.value
  const standard = [20000, 50000, 100000, 200000, 500000]
  const filtered = standard.filter(amt => amt >= currentTotal)
  if (currentTotal > 0 && !filtered.includes(currentTotal)) {
    filtered.unshift(currentTotal)
  }
  return filtered
})

const changeAmount = computed(() => (Number(customerGiven.value) || 0) - finalPayableAmount.value)

// VietQR Dynamic URL
const hasBankConfig = computed(() => Boolean(bankSettings.value.bank_bin && bankSettings.value.account_no))

const vietQrUrl = computed(() => {
  if (!hasBankConfig.value) return ''
  const bin = encodeURIComponent(bankSettings.value.bank_bin.trim())
  const acc = encodeURIComponent(bankSettings.value.account_no.trim())
  const amt = Math.round(finalPayableAmount.value)
  const memo = encodeURIComponent(`Em Bong ${cartItemCount.value} ly`)
  const accName = encodeURIComponent((bankSettings.value.account_name || '').trim())
  return `https://img.vietqr.io/image/${bin}-${acc}-compact2.png?amount=${amt}&addInfo=${memo}&accountName=${accName}`
})

const onBankSelectChange = () => {
  const found = VIETQR_BANKS.find(b => b.bin === bankSettings.value.bank_bin)
  if (found) bankSettings.value.bank_short_name = found.shortName
}

const saveBankSettings = async () => {
  if (!bankSettings.value.bank_bin || !bankSettings.value.account_no) {
    showToast('Vui lòng chọn Ngân hàng và nhập Số tài khoản', 'warning')
    return
  }
  onBankSelectChange()
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bankSettings.value)
    })
    if (res.ok) {
      isEditingBank.value = false
      showToast('Đã lưu tài khoản VietQR thành công!')
    }
  } catch (e) {
    showToast('Lỗi lưu cấu hình ngân hàng', 'error')
  }
}

// =========================================================================
// Thao tác thêm nhanh 1 chạm & tùy chỉnh món
// =========================================================================
const buildCartSignature = (id, size, toppingsArr, noteStr) => {
  const topSig = [...toppingsArr]
    .filter(t => t.quantity > 0)
    .sort((a, b) => a.id - b.id)
    .map(t => `${t.id}:${t.quantity}`)
    .join(',')
  return `${id}__${size}__${topSig}__${(noteStr || '').trim().toLowerCase()}`
}

const quickAddSize = (item, size, price) => {
  const unitPrice = parseFloat(price) || 0
  const sig = buildCartSignature(item.id, size, [], '')
  const existingIdx = cart.value.findIndex(c => c.signature === sig)

  if (existingIdx > -1) {
    cart.value[existingIdx].quantity++
    cart.value[existingIdx].itemTotal = cart.value[existingIdx].quantity * cart.value[existingIdx].unitPriceTotal
  } else {
    cart.value.push({
      signature: sig,
      id: item.id,
      name: item.name,
      size,
      basePrice: unitPrice,
      toppings: [],
      note: '',
      quantity: 1,
      unitPriceTotal: unitPrice,
      itemTotal: unitPrice
    })
  }
  showToast(`+1 ${item.name} (${size})`, 'success', 1400)
}

const openItemModal = (item) => {
  editingCartIndex.value = null
  selectedItem.value = item
  const defaultSize = Object.keys(item.prices_sizes_map)[0]
  tempSelection.value = {
    size: defaultSize,
    price: item.prices_sizes_map[defaultSize],
    cupQty: 1,
    toppings: [],
    noteTags: [],
    customNote: ''
  }
  showModal.value = true
}

const editCartItem = (index) => {
  const cartItem = cart.value[index]
  const foundMenu = menuItems.value.find(m => m.id === cartItem.id)
  if (!foundMenu) return

  editingCartIndex.value = index
  selectedItem.value = foundMenu

  // Tách note thành các tag nhanh và phần tự gõ
  const parts = cartItem.note ? cartItem.note.split(',').map(s => s.trim()).filter(Boolean) : []
  const matchedTags = parts.filter(p => QUICK_ITEM_NOTES.includes(p))
  const remainingCustom = parts.filter(p => !QUICK_ITEM_NOTES.includes(p)).join(', ')

  tempSelection.value = {
    size: cartItem.size,
    price: foundMenu.prices_sizes_map[cartItem.size] ?? cartItem.basePrice,
    cupQty: cartItem.quantity,
    toppings: JSON.parse(JSON.stringify(cartItem.toppings || [])),
    noteTags: matchedTags,
    customNote: remainingCustom
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedItem.value = null
  editingCartIndex.value = null
}

const toggleNoteTag = (tag) => {
  const idx = tempSelection.value.noteTags.indexOf(tag)
  if (idx > -1) {
    tempSelection.value.noteTags.splice(idx, 1)
  } else {
    tempSelection.value.noteTags.push(tag)
  }
}

const getTempToppingQty = (toppingId) => {
  const found = tempSelection.value.toppings.find(x => x.id === toppingId)
  return found ? found.quantity : 0
}

const changeTempToppingQty = (toppingObj, delta) => {
  const idx = tempSelection.value.toppings.findIndex(x => x.id === toppingObj.id)
  if (idx > -1) {
    const nextQty = tempSelection.value.toppings[idx].quantity + delta
    if (nextQty <= 0) {
      tempSelection.value.toppings.splice(idx, 1)
    } else {
      tempSelection.value.toppings[idx].quantity = nextQty
    }
  } else if (delta > 0) {
    tempSelection.value.toppings.push({
      id: toppingObj.id,
      name: toppingObj.name,
      price: parseFloat(toppingObj.price) || 0,
      quantity: delta
    })
  }
}

const setTempToppingExactQty = (toppingObj, rawVal) => {
  const qty = Math.max(0, parseInt(rawVal, 10) || 0)
  const idx = tempSelection.value.toppings.findIndex(x => x.id === toppingObj.id)
  if (qty <= 0) {
    if (idx > -1) tempSelection.value.toppings.splice(idx, 1)
  } else if (idx > -1) {
    tempSelection.value.toppings[idx].quantity = qty
  } else {
    tempSelection.value.toppings.push({
      id: toppingObj.id,
      name: toppingObj.name,
      price: parseFloat(toppingObj.price) || 0,
      quantity: qty
    })
  }
}

const selectedToppingCountPerCup = computed(() =>
  tempSelection.value.toppings.reduce((sum, t) => sum + (t.quantity || 0), 0)
)

const calculateTempTotal = () => {
  let total = parseFloat(tempSelection.value.price) || 0
  for (const t of tempSelection.value.toppings) {
    total += (parseFloat(t.price) || 0) * (t.quantity || 0)
  }
  return total
}

const confirmAddToCart = () => {
  const unitPriceTotal = calculateTempTotal()
  const toppingsCopy = JSON.parse(JSON.stringify(tempSelection.value.toppings.filter(t => t.quantity > 0)))
  const cupQty = Math.max(1, parseInt(tempSelection.value.cupQty, 10) || 1)

  const allNotes = [...tempSelection.value.noteTags]
  if (tempSelection.value.customNote && tempSelection.value.customNote.trim()) {
    allNotes.push(tempSelection.value.customNote.trim())
  }
  const combinedNote = allNotes.join(', ')
  const sig = buildCartSignature(selectedItem.value.id, tempSelection.value.size, toppingsCopy, combinedNote)

  const newEntry = {
    signature: sig,
    id: selectedItem.value.id,
    name: selectedItem.value.name,
    size: tempSelection.value.size,
    basePrice: parseFloat(tempSelection.value.price) || 0,
    toppings: toppingsCopy,
    note: combinedNote,
    quantity: cupQty,
    unitPriceTotal,
    itemTotal: unitPriceTotal * cupQty
  }

  if (editingCartIndex.value !== null) {
    cart.value.splice(editingCartIndex.value, 1, newEntry)
  } else {
    const existingIndex = cart.value.findIndex(c => c.signature === sig)
    if (existingIndex > -1) {
      cart.value[existingIndex].quantity += cupQty
      cart.value[existingIndex].itemTotal = cart.value[existingIndex].quantity * unitPriceTotal
    } else {
      cart.value.push(newEntry)
    }
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
    if (cart.value.length === 0) isMobileCartOpen.value = false
  }
}

const clearCart = () => {
  if (cart.value.length === 0) return
  if (confirm('Xóa toàn bộ các món đang chọn trong giỏ hàng?')) {
    cart.value = []
    isMobileCartOpen.value = false
  }
}

const openPaymentModal = () => {
  if (cart.value.length === 0 || isCheckingOut.value) return
  selectedPaymentMethod.value = 'cash'
  discountInput.value = 0
  orderNote.value = ''
  customerGiven.value = subtotalAmount.value
  showPaymentModal.value = true
}

const executeCheckout = async () => {
  if (cart.value.length === 0 || isCheckingOut.value) return
  isCheckingOut.value = true

  try {
    const payload = {
      payment_method: selectedPaymentMethod.value,
      discount_amount: computedDiscountAmount.value,
      order_note: orderNote.value,
      cart_items: cart.value.map(item => ({
        id: item.id,
        size: item.size,
        quantity: item.quantity,
        note: item.note || '',
        toppings: item.toppings.map(t => ({
          id: t.id,
          quantity: t.quantity || 1
        }))
      }))
    }

    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      const data = await res.json()
      // Phát âm thanh "Ting-ting" báo hiệu thanh toán thành công!
      playCheckoutSound()
      const methodLabel = selectedPaymentMethod.value === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'
      showToast(`Thanh toán thành công đơn #${data.id} · ${formatPrice(finalPayableAmount.value)} (${methodLabel})!`)
      cart.value = []
      discountInput.value = 0
      orderNote.value = ''
      showPaymentModal.value = false
      isMobileCartOpen.value = false
    } else {
      const errData = await res.json()
      showToast('Lỗi thanh toán: ' + (errData.error || 'Lỗi máy chủ'), 'error')
    }
  } catch (error) {
    console.error('Lỗi kết nối khi thanh toán:', error)
    showToast('Không thể kết nối máy chủ! Vui lòng kiểm tra mạng trước khi giao đơn.', 'error', 4000)
  } finally {
    isCheckingOut.value = false
  }
}
</script>
