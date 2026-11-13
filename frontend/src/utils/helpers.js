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

// Hệ thống âm thanh "Cha-Ching! Tiếng Tiền Kêu" thanh toán POS bằng Web Audio API (to, rõ, không cần MP3 ngoài)
export const isSoundMuted = ref(localStorage.getItem('embong_pos_muted') === 'true')

export function toggleSoundMute() {
  isSoundMuted.value = !isSoundMuted.value
  localStorage.setItem('embong_pos_muted', isSoundMuted.value ? 'true' : 'false')
  if (!isSoundMuted.value) {
    playCheckoutSound(true)
  }
}

let sharedAudioCtx = null

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

// Gọi đồng bộ ngay khi bấm nút thanh toán để mở khóa AudioContext trên iOS/Android trước khi chờ API
export function unlockCheckoutAudio() {
  if (isSoundMuted.value) return
  try {
    getOrCreateAudioContext()
  } catch (e) {}
}

export function playCheckoutSound(force = false) {
  if (isSoundMuted.value && !force) return
  try {
    const ctx = getOrCreateAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Compressor + Master Gain giúp âm thanh TO, ĐANH và RÕ trong môi trường quán ồn mà không bị rè
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-12, now)
    compressor.knee.setValueAtTime(12, now)
    compressor.ratio.setValueAtTime(6, now)
    compressor.attack.setValueAtTime(0.002, now)
    compressor.release.setValueAtTime(0.15, now)

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.95, now)

    compressor.connect(masterGain)
    masterGain.connect(ctx.destination)

    // 1. Tiếng bật chốt ngăn kéo két tiền ("Ka-")
    const bufferSize = Math.floor(ctx.sampleRate * 0.035)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25))
    }
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuffer

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(2600, now)
    bandpass.Q.setValueAtTime(1.8, now)

    const latchGain = ctx.createGain()
    latchGain.gain.setValueAtTime(0.9, now)
    latchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.035)

    noiseSrc.connect(bandpass)
    bandpass.connect(latchGain)
    latchGain.connect(compressor)
    noiseSrc.start(now)

    // Hàm phát tiếng kim loại / đồng xu / chuông máy tính tiền với hòa âm kim loại sắc nét
    const playMetallicHit = (baseFreq, startTime, duration, volume) => {
      const partials = [
        { ratio: 1.0, amp: 1.0, dec: 1.0 },
        { ratio: 2.0, amp: 0.65, dec: 0.85 },
        { ratio: 2.756, amp: 0.45, dec: 0.65 },
        { ratio: 4.12, amp: 0.3, dec: 0.45 }
      ]
      for (const p of partials) {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = p.ratio === 1.0 ? 'triangle' : 'sine'
        osc.frequency.setValueAtTime(baseFreq * p.ratio, startTime)

        g.gain.setValueAtTime(0.0001, startTime)
        g.gain.linearRampToValueAtTime(volume * p.amp, startTime + 0.004)
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * p.dec)

        osc.connect(g)
        g.connect(compressor)
        osc.start(startTime)
        osc.stop(startTime + duration * p.dec + 0.02)
      }
    }

    // 2. Tiếng chuông két tiền "-CHING!" đanh & vang
    playMetallicHit(1567.98, now + 0.03, 0.22, 0.48) // G6 bật lên
    playMetallicHit(2093.0, now + 0.09, 0.55, 0.65)  // C7 vang ngân

    // 3. Chuỗi tiếng đồng xu leng keng ("keng - keng - keng!")
    playMetallicHit(3135.96, now + 0.17, 0.24, 0.35) // G7 coin 1
    playMetallicHit(3951.07, now + 0.23, 0.28, 0.32) // B7 coin 2
    playMetallicHit(4186.01, now + 0.30, 0.42, 0.38) // C8 coin 3
  } catch (e) {
    console.warn('Audio playback skipped:', e)
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

