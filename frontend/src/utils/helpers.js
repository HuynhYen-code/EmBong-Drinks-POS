import { ref } from 'vue'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const POS_CACHE_KEY = 'embong_pos_cache_v3'

// Bỏ dấu tiếng Việt để tìm kiếm siêu tốc không phân biệt hoa thường/dấu
export function removeAccents(str) {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export function formatPrice(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0)
}

export function formatShortPrice(val) {
  const num = Number(val) || 0
  if (num >= 1000 && num % 1000 === 0) {
    return `${num / 1000}k`
  }
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ'
}

export function getTodayVN() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCurrentMonthVN() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// Hệ thống Toast thông báo mượt mà thay cho alert() chặn màn hình giờ cao điểm
export const toasts = ref([])
let toastSeq = 0

export function showToast(message, type = 'success', duration = 2600) {
  const id = ++toastSeq
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

export function dismissToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// Hệ thống âm thanh thanh toán POS dùng tệp /pay_sound.mp3 kết hợp khuếch đại Web Audio API (to, rõ khi quán ồn)
export const isSoundMuted = ref(localStorage.getItem('embong_pos_muted') === 'true')

export function toggleSoundMute() {
  isSoundMuted.value = !isSoundMuted.value
  localStorage.setItem('embong_pos_muted', isSoundMuted.value ? 'true' : 'false')
  if (!isSoundMuted.value) {
    playCheckoutSound(true)
  }
}

const PAY_SOUND_URL = '/pay_sound.mp3'
let sharedAudioCtx = null
let cachedAudioArrayBuffer = null
let decodedPayBuffer = null
let fetchSoundPromise = null
let decodeSoundPromise = null

export function preloadPaySound() {
  if (cachedAudioArrayBuffer) return Promise.resolve(cachedAudioArrayBuffer)
  if (fetchSoundPromise) return fetchSoundPromise

  fetchSoundPromise = fetch(PAY_SOUND_URL, { cache: 'force-cache' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.arrayBuffer()
    })
    .then(buf => {
      cachedAudioArrayBuffer = buf
      return buf
    })
    .catch(err => {
      fetchSoundPromise = null
      console.warn('Preload pay_sound failed:', err)
      return null
    })

  return fetchSoundPromise
}

function getOrCreateAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx()
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {})
  }
  return sharedAudioCtx
}

async function ensureDecodedPayBuffer(ctx) {
  if (decodedPayBuffer) return decodedPayBuffer
  if (decodeSoundPromise) return decodeSoundPromise

  decodeSoundPromise = (async () => {
    const rawBuf = await preloadPaySound()
    if (!rawBuf || !ctx) return null
    const decoded = await ctx.decodeAudioData(rawBuf.slice(0))
    decodedPayBuffer = decoded
    return decoded
  })().catch(err => {
    decodeSoundPromise = null
    console.warn('Decode pay_sound failed:', err)
    return null
  })

  return decodeSoundPromise
}

// Gọi đồng bộ ngay khi bấm nút thanh toán để mở khóa AudioContext & giải mã sẵn file MP3 trên iOS/Android
export function unlockCheckoutAudio() {
  if (isSoundMuted.value) return
  try {
    const ctx = getOrCreateAudioContext()
    if (ctx) {
      ensureDecodedPayBuffer(ctx)
    } else {
      preloadPaySound()
    }
  } catch (e) {}
}

function playFallbackHtmlAudio() {
  try {
    const audio = new Audio(PAY_SOUND_URL)
    audio.volume = 1.0
    audio.play().catch(() => {})
  } catch (e) {}
}

export async function playCheckoutSound(force = false) {
  if (isSoundMuted.value && !force) return
  try {
    const ctx = getOrCreateAudioContext()
    if (!ctx) {
      playFallbackHtmlAudio()
      return
    }

    const buffer = await ensureDecodedPayBuffer(ctx)
    if (!buffer) {
      playFallbackHtmlAudio()
      return
    }

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Khuếch đại âm lượng x2.8 lần (~ +9dB) qua bộ nén DynamicsCompressor để phát thật TO & RÕ trong quán ồn mà không bị rè vỡ tiếng
    const boostGain = ctx.createGain()
    boostGain.gain.setValueAtTime(2.8, now)

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.setValueAtTime(-10, now)
    limiter.knee.setValueAtTime(10, now)
    limiter.ratio.setValueAtTime(12, now)
    limiter.attack.setValueAtTime(0.002, now)
    limiter.release.setValueAtTime(0.12, now)

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(1.0, now)

    source.connect(boostGain)
    boostGain.connect(limiter)
    limiter.connect(masterGain)
    masterGain.connect(ctx.destination)

    source.start(now)
  } catch (e) {
    console.warn('Web Audio playback fallback:', e)
    playFallbackHtmlAudio()
  }
}

// Danh sách ghi chú nhanh chuẩn quán trà sữa / nước mát
export const QUICK_ITEM_NOTES = [
  'Ít đá',
  'Không đá',
  'Đá riêng',
  'Ít ngọt',
  'Không đường',
  'Thêm ngọt',
  'Ngọt vừa',
  'Mang về'
]

// Danh sách ngân hàng phổ biến chuẩn VietQR Napas
export const VIETQR_BANKS = [
  { bin: '970422', shortName: 'MBBank', name: 'MB Bank (Quân Đội)' },
  { bin: '970436', shortName: 'Vietcombank', name: 'Vietcombank (VCB)' },
  { bin: '970407', shortName: 'Techcombank', name: 'Techcombank (TCB)' },
  { bin: '970415', shortName: 'VietinBank', name: 'VietinBank (CTG)' },
  { bin: '970418', shortName: 'BIDV', name: 'BIDV' },
  { bin: '970416', shortName: 'ACB', name: 'ACB (Á Châu)' },
  { bin: '970403', shortName: 'Sacombank', name: 'Sacombank (STB)' },
  { bin: '970432', shortName: 'VPBank', name: 'VPBank' },
  { bin: '970423', shortName: 'TPBank', name: 'TPBank (Tiên Phong)' },
  { bin: '970405', shortName: 'Agribank', name: 'Agribank' },
  { bin: '970441', shortName: 'VIB', name: 'VIB (Quốc Tế)' },
  { bin: '970437', shortName: 'HDBank', name: 'HDBank' },
  { bin: '970443', shortName: 'SHB', name: 'SHB' },
  { bin: '970426', shortName: 'MSB', name: 'MSB (Hàng Hải)' },
  { bin: '970448', shortName: 'OCB', name: 'OCB (Phương Đông)' },
  { bin: '546034', shortName: 'CAKE', name: 'CAKE by VPBank' },
  { bin: '963388', shortName: 'Timo', name: 'Timo Digital Bank' }
]

export const DEFAULT_MENU_CATEGORIES = [
  'Món Bán Chạy',
  'Rau Má',
  'Trà Sữa - Sữa Tươi',
  'Trà Trái Cây',
  'Cà Phê - Cacao',
  'Trái Cây Tô',
  'Khác'
]

