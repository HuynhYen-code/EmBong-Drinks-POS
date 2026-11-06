<template>
  <div class="space-y-5 pb-10">
    <!-- Top Header & Controls -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-gray-100 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-extrabold text-textmain">Thực Đơn & Định Mức Công Thức (BOM)</h2>
          <p class="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Các size của cùng một món được gom chung giúp dễ tra cứu công thức và so sánh giá vốn
          </p>
        </div>
        <button
          @click="openCreate()"
          class="bg-brand-500 text-white px-5 py-2.5 rounded-2xl font-extrabold text-sm hover:bg-brand-600 transition shadow-sm shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>+ Thêm Món Mới</span>
        </button>
      </div>

      <!-- Search + Category Filter -->
      <div class="flex flex-col md:flex-row gap-3">
        <div class="relative flex-1">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm nhanh tên món hoặc nguyên liệu trong công thức..."
            class="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-brand-500 outline-none"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        <button
          v-for="cat in filterCategories"
          :key="cat"
          @click="selectedCat = cat"
          :class="[
            'px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition',
            selectedCat === cat
              ? 'bg-brand-500 text-white shadow-2xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="groupedByCat.length === 0" class="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 text-gray-400 font-bold">
      Chưa có món nào phù hợp. Hãy bấm "+ Thêm Món Mới" để tạo thực đơn!
    </div>

    <!-- Grouped Categories -> Grouped Drink Cards -> Side-by-side Sizes -->
    <div v-for="catGroup in groupedByCat" :key="catGroup.category" class="space-y-3">
      <div class="flex items-center gap-3 px-1">
        <span class="px-3.5 py-1 rounded-full bg-brand-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-2xs">
          {{ catGroup.category }}
        </span>
        <span class="text-xs font-bold text-gray-400">{{ catGroup.drinks.length }} món</span>
        <div class="h-px flex-1 bg-gray-200"></div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          v-for="drink in catGroup.drinks"
          :key="drink.id"
          class="bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border border-gray-100 flex flex-col gap-4"
        >
          <!-- Drink Header -->
          <div class="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
                <img v-if="drink.image_url" :src="drink.image_url" class="w-full h-full object-cover" />
                <span v-else class="text-2xl">🧋</span>
              </div>
              <div class="min-w-0">
                <h3 class="text-base sm:text-lg font-extrabold text-textmain leading-snug">{{ drink.name }}</h3>
                <p class="text-xs font-semibold text-gray-400 mt-0.5">{{ drink.sizes.length }} kích thước đang bán</p>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                @click="openAddSizeForDrink(drink)"
                class="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80 text-xs font-bold transition"
                title="Thêm Size khác cho món này (kế thừa sẵn công thức)"
              >
                + Thêm Size
              </button>
              <button
                @click="deleteWholeDrink(drink)"
                class="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold transition"
                title="Xóa toàn bộ món này"
              >
                🗑
              </button>
            </div>
          </div>

          <!-- Sizes Grid inside Drink Card -->
          <div :class="['grid gap-3', drink.sizes.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1']">
            <div
              v-for="sz in drink.sizes"
              :key="sz.id"
              class="rounded-2xl bg-surface p-3.5 border border-gray-200/80 flex flex-col justify-between gap-3"
            >
              <div>
                <!-- Size Top Row -->
                <div class="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-dashed border-gray-200">
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-lg bg-brand-500 text-white font-extrabold text-xs">
                      {{ sz.size }}
                    </span>
                    <span class="font-extrabold text-sm text-textmain">{{ formatPrice(sz.price) }}</span>
                  </div>

                  <span
                    :class="[
                      'px-2 py-0.5 rounded-md text-[11px] font-extrabold',
                      getFoodCostPct(sz.cogs, sz.price) > 35
                        ? 'bg-red-100 text-red-600'
                        : getFoodCostPct(sz.cogs, sz.price) > 28
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    ]"
                  >
                    FC: {{ getFoodCostPct(sz.cogs, sz.price).toFixed(1) }}%
                  </span>
                </div>

                <!-- BOM Recipe List -->
                <div v-if="sz.ingredients && sz.ingredients.length > 0" class="space-y-1 mb-2">
                  <div
                    v-for="(ing, iIdx) in sz.ingredients"
                    :key="iIdx"
                    class="flex items-center justify-between text-xs gap-2"
                  >
                    <span class="text-gray-600 font-semibold truncate">• {{ ing.name }}</span>
                    <span class="font-extrabold text-gray-800 whitespace-nowrap">{{ ing.quantity }} {{ ing.unit }}</span>
                  </div>
                </div>
                <div v-else class="text-xs text-gray-400 italic mb-2">Chưa có công thức BOM</div>
              </div>

              <!-- Size Footer: COGS & Actions -->
              <div class="pt-2 border-t border-gray-200/70 flex items-center justify-between gap-2">
                <div class="text-[11px] font-bold text-gray-500">
                  Vốn: <strong class="text-brand-600">{{ formatPrice(sz.cogs) }}</strong>
                </div>
                <div class="flex items-center gap-1.5">
                  <button
                    @click="openEdit(sz)"
                    class="px-3 py-1 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs transition"
                  >
                    Sửa
                  </button>
                  <button
                    @click="deleteSingleSize(sz)"
                    class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 font-bold text-xs transition"
                    title="Xóa size này"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: Thêm / Sửa Món & Trình Soạn Công Thức BOM Thông Minh               -->
    <!-- ========================================================================= -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94dvh]">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-surface shrink-0">
          <div>
            <h2 class="text-lg sm:text-xl font-extrabold text-textmain">
              {{ isEditing ? 'Cập Nhật Món & Công Thức (Size)' : 'Thêm Món / Size Mới' }}
            </h2>
            <p class="text-xs text-gray-500 font-medium">Tự động tính giá vốn (COGS) & tỷ lệ Food Cost ngay khi nhập định lượng</p>
          </div>
          <button @click="showModal = false" class="w-9 h-9 bg-gray-100 rounded-full font-bold text-gray-600 hover:bg-gray-200">✕</button>
        </div>

        <!-- Body -->
        <div class="p-5 space-y-4 overflow-y-auto">
          <!-- Tên món & Phân loại -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Tên Món *</label>
              <input
                v-model="form.name"
                list="existing-drink-names"
                type="text"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:border-brand-500 outline-none"
                placeholder="VD: Trà Sữa Olong Lài"
              />
              <datalist id="existing-drink-names">
                <option v-for="g in groupedRaw" :key="g.id" :value="g.name" />
              </datalist>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Phân Loại (Chọn nhanh hoặc tự nhập)</label>
              <input
                v-model="form.category"
                list="menu-category-options"
                type="text"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:border-brand-500 outline-none"
                placeholder="VD: Trà Sữa - Sữa Tươi, Cà Phê - Cacao"
              />
              <datalist id="menu-category-options">
                <option v-for="c in allCategorySuggestions" :key="c" :value="c" />
              </datalist>

              <!-- Quick category chips -->
              <div class="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  v-for="catOpt in ['Rau Má', 'Trà Sữa - Sữa Tươi', 'Trà Trái Cây', 'Cà Phê - Cacao', 'Món Bán Chạy', 'Trái Cây Tô', 'Khác']"
                  :key="catOpt"
                  @click="form.category = catOpt"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                    form.category === catOpt
                      ? 'bg-brand-500 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  {{ catOpt }}
                </button>
              </div>
            </div>
          </div>

          <!-- Size, Giá bán & Ảnh -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Kích Thước (Size) *</label>
              <input
                v-model="form.size"
                type="text"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:border-brand-500 outline-none"
                placeholder="VD: 700ml, 1000ml, M, L"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Giá Bán (VNĐ) *</label>
              <input
                v-model.number="form.price"
                type="number"
                class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:border-brand-500 outline-none"
                placeholder="VD: 25000"
              />
            </div>

            <div class="col-span-2 sm:col-span-1">
              <label class="block text-xs font-bold text-gray-600 mb-1">Ảnh đại diện món</label>
              <div class="flex gap-2">
                <input
                  v-model="form.image_url"
                  type="text"
                  class="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none"
                  placeholder="Link ảnh hoặc tải lên..."
                />
                <button
                  @click.prevent="triggerUpload"
                  type="button"
                  class="bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 rounded-xl font-bold text-xs text-gray-700 shrink-0"
                >
                  {{ isUploading ? '...' : '📷 Tải' }}
                </button>
              </div>
              <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" accept="image/*" />
            </div>
          </div>

          <!-- TRÌNH SOẠN CÔNG THỨC (BOM) TIỆN LỢI -->
          <div class="pt-3 border-t border-gray-100 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label class="font-extrabold text-sm text-textmain">🧪 Định Mức Công Thức Pha Chế (BOM)</label>

              <!-- Sao chép nhanh công thức từ món có sẵn -->
              <div class="flex items-center gap-2">
                <select
                  v-model="copySourceSizeId"
                  @change="copyBomFromSelected"
                  class="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 outline-none max-w-[230px]"
                >
                  <option value="">📋 Sao chép công thức từ món...</option>
                  <option v-for="m in flatMenu" :key="'cp-' + m.id" :value="m.id">
                    {{ m.name }} ({{ m.size }})
                  </option>
                </select>
              </div>
            </div>

            <!-- Thanh tìm & thêm nguyên liệu 1 dòng (hỗ trợ phím Enter) -->
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200/80 space-y-2.5">
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <!-- Lọc nhanh tên NL / Prep -->
                <div class="sm:col-span-3">
                  <input
                    v-model="ingFilterText"
                    type="text"
                    placeholder="🔍 Lọc tên NL/Prep..."
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white outline-none focus:border-brand-500"
                  />
                </div>

                <!-- Dropdown chọn NL / Prep -->
                <div class="sm:col-span-5">
                  <select
                    v-model="tempIngKey"
                    @change="onIngredientSelect"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold bg-white outline-none focus:border-brand-500"
                  >
                    <option value="">-- Chọn Nguyên Liệu / Bán Thành Phẩm ({{ filteredIngredientOptions.length }}) --</option>
                    <optgroup label="Bán Thành Phẩm (Prep)">
                      <option
                        v-for="p in filteredPrepOptions"
                        :key="'prep-' + p.id"
                        :value="`prep__${p.id}`"
                      >
                        [Prep] {{ p.name }} ({{ p.base_unit }} · {{ formatPrice(p.current_cost_per_unit) }}/{{ p.base_unit }})
                      </option>
                    </optgroup>
                    <optgroup label="Nguyên Liệu Thô">
                      <option
                        v-for="m in filteredMatOptions"
                        :key="'mat-' + m.id"
                        :value="`material__${m.id}`"
                      >
                        [NL] {{ m.name }} ({{ m.base_unit }} · {{ formatPrice(m.cost_per_base_unit) }}/{{ m.base_unit }})
                      </option>
                    </optgroup>
                  </select>
                </div>

                <!-- Nhập định lượng + Enter để thêm -->
                <div class="sm:col-span-4 flex gap-1.5">
                  <div class="relative flex-1">
                    <input
                      ref="qtyInputRef"
                      v-model.number="tempIngQty"
                      @keyup.enter="addIng"
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Định lượng..."
                      class="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-xs font-extrabold bg-white outline-none focus:border-brand-500"
                    />
                    <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">
                      {{ selectedOptionObj?.unit || '' }}
                    </span>
                  </div>
                  <button
                    type="button"
                    @click="addIng"
                    class="bg-brand-500 hover:bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              <!-- Thanh nhân tỷ lệ định lượng khi làm Size lớn/nhỏ -->
              <div v-if="form.ingredients.length > 0" class="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-gray-200/60">
                <span class="text-[11px] font-bold text-gray-500">⚡ Nhân nhanh định lượng toàn công thức (khi đổi Size):</span>
                <div class="flex items-center gap-1 flex-wrap">
                  <button
                    v-for="ratio in [0.5, 0.7, 1.2, 1.4, 1.5, 2]"
                    :key="ratio"
                    type="button"
                    @click="scaleAllIngredients(ratio)"
                    class="px-2 py-0.5 rounded-lg bg-white border border-gray-200 hover:border-brand-500 hover:text-brand-600 text-[11px] font-extrabold text-gray-600 transition"
                  >
                    x{{ ratio }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Danh sách thành phần đã thêm -->
            <div v-if="form.ingredients.length === 0" class="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-xs font-semibold text-gray-400">
              Chưa có thành phần nào. Hãy chọn nguyên liệu ở trên và bấm Enter hoặc "+ Thêm".
            </div>

            <div v-else class="space-y-1.5">
              <div
                v-for="(ing, i) in form.ingredients"
                :key="i"
                class="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-xs"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <span :class="[
                    'px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0',
                    ing.ingredient_type === 'prep' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  ]">
                    {{ ing.ingredient_type === 'prep' ? 'Prep' : 'NL' }}
                  </span>
                  <span class="font-bold text-gray-800 truncate">{{ ing.name }}</span>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <input
                    v-model.number="ing.quantity"
                    type="number"
                    min="0"
                    step="any"
                    class="w-20 px-2 py-1 text-right font-extrabold border border-gray-200 rounded-lg bg-white focus:border-brand-500 outline-none"
                  />
                  <span class="w-9 font-bold text-gray-500">{{ ing.unit }}</span>
                  <span class="w-20 text-right font-bold text-brand-600 hidden sm:inline-block">
                    {{ formatPrice(getIngredientLineCost(ing)) }}
                  </span>
                  <button
                    type="button"
                    @click="form.ingredients.splice(i, 1)"
                    class="w-6 h-6 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-bold flex items-center justify-center"
                  >✕</button>
                </div>
              </div>
            </div>

            <!-- Live Preview Giá vốn & Lợi nhuận ngay tức thì -->
            <div class="p-3.5 rounded-2xl bg-brand-50 border border-brand-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-[11px] font-bold text-brand-700 uppercase">Giá vốn dự tính (COGS)</div>
                <div class="text-lg font-black text-brand-700">{{ formatPrice(livePreviewCogs) }}</div>
              </div>
              <div>
                <div class="text-[11px] font-bold text-gray-500 uppercase">Lợi nhuận gộp / ly</div>
                <div class="text-lg font-black text-emerald-600">{{ formatPrice((Number(form.price) || 0) - livePreviewCogs) }}</div>
              </div>
              <div class="text-right">
                <div class="text-[11px] font-bold text-gray-500 uppercase">Tỷ lệ Food Cost</div>
                <div :class="[
                  'text-lg font-black',
                  getFoodCostPct(livePreviewCogs, form.price) > 35 ? 'text-red-600' : 'text-emerald-600'
                ]">
                  {{ getFoodCostPct(livePreviewCogs, form.price).toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <button
            v-if="isEditing"
            type="button"
            @click="duplicateItem"
            class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
          >
            📋 Nhân bản tạo Size khác
          </button>
          <div class="flex gap-2.5 ml-auto">
            <button @click="showModal = false" class="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-100">Hủy</button>
            <button @click="saveMenu" class="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white bg-brand-500 hover:bg-brand-600 shadow-sm">
              {{ isEditing ? 'Lưu Cập Nhật' : 'Lưu Món Mới' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { API_BASE, removeAccents, formatPrice, showToast, DEFAULT_MENU_CATEGORIES } from '../../utils/helpers'

const groupedRaw = ref([])
const flatMenu = ref([])
const materials = ref([])
const preps = ref([])

const searchQuery = ref('')
const selectedCat = ref('Tất Cả')

const showModal = ref(false)
const isEditing = ref(false)
const currentEditId = ref(null)
const fileInput = ref(null)
const qtyInputRef = ref(null)
const isUploading = ref(false)

const form = ref({ name: '', category: 'Trà Sữa - Sữa Tươi', image_url: '', size: '', price: '', ingredients: [] })

const ingFilterText = ref('')
const tempIngKey = ref('')
const tempIngQty = ref('')
const copySourceSizeId = ref('')

const allCategorySuggestions = computed(() => {
  const s = new Set(DEFAULT_MENU_CATEGORIES)
  for (const g of groupedRaw.value) {
    if (g.category) s.add(g.category)
  }
  return Array.from(s)
})

const filterCategories = computed(() => {
  const cats = ['Tất Cả']
  for (const c of allCategorySuggestions.value) {
    if (groupedRaw.value.some(g => g.category === c)) cats.push(c)
  }
  return cats
})

const groupedByCat = computed(() => {
  const q = removeAccents(searchQuery.value)
  const map = new Map()

  for (const drink of groupedRaw.value) {
    if (selectedCat.value !== 'Tất Cả' && drink.category !== selectedCat.value) continue

    if (q) {
      const nameMatch = removeAccents(drink.name).includes(q) || removeAccents(drink.category).includes(q)
      const ingMatch = (drink.sizes || []).some(sz =>
        (sz.ingredients || []).some(ing => removeAccents(ing.name).includes(q))
      )
      if (!nameMatch && !ingMatch) continue
    }

    const cat = drink.category || 'Khác'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(drink)
  }

  return Array.from(map.entries()).map(([category, drinks]) => ({ category, drinks }))
})

const getFoodCostPct = (cogs, price) => {
  const p = Number(price) || 0
  const c = Number(cogs) || 0
  return p > 0 ? (c / p) * 100 : 0
}

// Lọc danh sách nguyên liệu trong BOM picker
const filteredPrepOptions = computed(() => {
  const q = removeAccents(ingFilterText.value)
  if (!q) return preps.value
  return preps.value.filter(p => removeAccents(p.name).includes(q))
})

const filteredMatOptions = computed(() => {
  const q = removeAccents(ingFilterText.value)
  if (!q) return materials.value
  return materials.value.filter(m => removeAccents(m.name).includes(q))
})

const filteredIngredientOptions = computed(() => [
  ...filteredPrepOptions.value,
  ...filteredMatOptions.value
])

const resolveIngredientMeta = (type, id) => {
  if (type === 'prep') {
    const p = preps.value.find(x => Number(x.id) === Number(id))
    return p ? { name: p.name, unit: p.base_unit, unit_cost: Number(p.current_cost_per_unit) || 0 } : null
  }
  const m = materials.value.find(x => Number(x.id) === Number(id))
  return m ? { name: m.name, unit: m.base_unit, unit_cost: Number(m.cost_per_base_unit) || 0 } : null
}

const selectedOptionObj = computed(() => {
  if (!tempIngKey.value) return null
  const [type, id] = tempIngKey.value.split('__')
  const meta = resolveIngredientMeta(type, id)
  return meta ? { type, id: Number(id), ...meta } : null
})

const getIngredientLineCost = (ing) => {
  const meta = resolveIngredientMeta(ing.ingredient_type, ing.ingredient_id)
  const unitCost = meta ? meta.unit_cost : (Number(ing.unit_cost) || 0)
  return (Number(ing.quantity) || 0) * unitCost
}

const livePreviewCogs = computed(() =>
  form.value.ingredients.reduce((sum, ing) => sum + getIngredientLineCost(ing), 0)
)

const onIngredientSelect = async () => {
  if (tempIngKey.value && qtyInputRef.value) {
    await nextTick()
    qtyInputRef.value.focus()
  }
}

const addIng = () => {
  const opt = selectedOptionObj.value
  const qty = parseFloat(tempIngQty.value)
  if (!opt || !qty || qty <= 0) {
    showToast('Vui lòng chọn thành phần và nhập định lượng > 0', 'warning')
    return
  }

  const existing = form.value.ingredients.find(
    x => x.ingredient_type === opt.type && Number(x.ingredient_id) === Number(opt.id)
  )
  if (existing) {
    existing.quantity = Number((Number(existing.quantity) + qty).toFixed(2))
  } else {
    form.value.ingredients.push({
      ingredient_type: opt.type,
      ingredient_id: opt.id,
      name: opt.name,
      quantity: qty,
      unit: opt.unit,
      unit_cost: opt.unit_cost
    })
  }

  tempIngKey.value = ''
  tempIngQty.value = ''
  ingFilterText.value = ''
}

const copyBomFromSelected = () => {
  if (!copySourceSizeId.value) return
  const src = flatMenu.value.find(m => Number(m.id) === Number(copySourceSizeId.value))
  if (src && Array.isArray(src.ingredients)) {
    form.value.ingredients = JSON.parse(JSON.stringify(src.ingredients))
    showToast(`Đã sao chép ${src.ingredients.length} thành phần từ ${src.name} (${src.size})`)
  }
  copySourceSizeId.value = ''
}

const scaleAllIngredients = (ratio) => {
  form.value.ingredients.forEach(ing => {
    ing.quantity = Number(((Number(ing.quantity) || 0) * ratio).toFixed(1))
  })
  showToast(`Đã nhân định lượng công thức x${ratio}`)
}

const triggerUpload = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleFileUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  isUploading.value = true
  const formData = new FormData()
  formData.append('image', file)

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (res.ok) {
      form.value.image_url = data.image_url
      showToast('Tải ảnh lên thành công!')
    } else {
      showToast('Lỗi tải ảnh: ' + (data.error || 'Không xác định'), 'error')
    }
  } catch (err) {
    showToast('Lỗi mạng khi tải ảnh lên máy chủ', 'error')
  } finally {
    isUploading.value = false
    e.target.value = ''
  }
}

const openCreate = () => {
  isEditing.value = false
  currentEditId.value = null
  form.value = { name: '', category: 'Trà Sữa - Sữa Tươi', image_url: '', size: '700ml', price: '', ingredients: [] }
  ingFilterText.value = ''
  tempIngKey.value = ''
  tempIngQty.value = ''
  showModal.value = true
}

const openAddSizeForDrink = (drink) => {
  isEditing.value = false
  currentEditId.value = null
  const baseSize = drink.sizes && drink.sizes[0] ? drink.sizes[0] : null
  form.value = {
    name: drink.name,
    category: drink.category || 'Món Bán Chạy',
    image_url: drink.image_url || '',
    size: '',
    price: baseSize ? baseSize.price : '',
    ingredients: baseSize ? JSON.parse(JSON.stringify(baseSize.ingredients || [])) : []
  }
  showModal.value = true
}

const openEdit = (item) => {
  isEditing.value = true
  currentEditId.value = item.id
  form.value = {
    name: item.name,
    category: item.category || 'Món Bán Chạy',
    image_url: item.image_url || '',
    size: item.size,
    price: item.price,
    ingredients: JSON.parse(JSON.stringify(item.ingredients || []))
  }
  showModal.value = true
}

const duplicateItem = () => {
  isEditing.value = false
  currentEditId.value = null
  form.value.size = ''
  showToast('Đã chuyển sang tạo Size mới! Hãy nhập tên Size, nhân hệ số nếu cần rồi bấm Lưu.')
}

const fetchData = async () => {
  try {
    const [resMenu, resMats, resPreps] = await Promise.all([
      fetch(`${API_BASE}/menu-items`),
      fetch(`${API_BASE}/materials`),
      fetch(`${API_BASE}/preps`)
    ])
    if (resMenu.ok) {
      const data = await resMenu.json()
      flatMenu.value = data.admin_items || []
      groupedRaw.value = data.grouped_items || []
    }
    if (resMats.ok) materials.value = await resMats.json()
    if (resPreps.ok) preps.value = await resPreps.json()
  } catch (e) {
    showToast('Không thể tải dữ liệu thực đơn', 'error')
  }
}

onMounted(() => fetchData())

const saveMenu = async () => {
  if (!form.value.name || !form.value.size) {
    showToast('Vui lòng nhập đầy đủ Tên món và Size!', 'warning')
    return
  }

  try {
    const url = isEditing.value ? `${API_BASE}/menu-items/${currentEditId.value}` : `${API_BASE}/menu-items`
    const method = isEditing.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })

    if (res.ok) {
      localStorage.removeItem('embong_pos_cache_v2')
      showToast(isEditing.value ? 'Đã cập nhật món thành công!' : 'Đã thêm món / size mới!')
      showModal.value = false
      await fetchData()
    } else {
      const errData = await res.json()
      showToast(errData.error || 'Có lỗi xảy ra khi lưu món', 'error')
    }
  } catch (e) {
    showToast('Không thể kết nối đến Backend!', 'error')
  }
}

const deleteSingleSize = async (sz) => {
  if (!confirm(`Xóa size "${sz.size}" của món "${sz.name}"? (Lịch sử hóa đơn cũ vẫn được bảo toàn)`)) return
  try {
    const res = await fetch(`${API_BASE}/menu-items/size/${sz.id}`, { method: 'DELETE' })
    if (res.ok) {
      localStorage.removeItem('embong_pos_cache_v2')
      showToast(`Đã xóa size ${sz.size} của ${sz.name}`)
      await fetchData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Không thể xóa size', 'error')
    }
  } catch (e) {
    showToast('Lỗi kết nối máy chủ', 'error')
  }
}

const deleteWholeDrink = async (drink) => {
  if (!confirm(`Xóa toàn bộ món "${drink.name}" (gồm tất cả các size) khỏi thực đơn bán hàng?`)) return
  try {
    const res = await fetch(`${API_BASE}/menu-items/item/${drink.id}`, { method: 'DELETE' })
    if (res.ok) {
      localStorage.removeItem('embong_pos_cache_v2')
      showToast(`Đã xóa món "${drink.name}" khỏi thực đơn`)
      await fetchData()
    } else {
      const err = await res.json()
      showToast(err.error || 'Không thể xóa món', 'error')
    }
  } catch (e) {
    showToast('Lỗi kết nối máy chủ', 'error')
  }
}
</script>
