import { ref } from 'vue'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

// Hệ thống âm thanh "Ting-ting" thanh toán POS bằng Web Audio API (không cần file MP3 ngoài)
export const isSoundMuted = ref(localStorage.getItem('embong_pos_muted') === 'true')

export function toggleSoundMute() {
  isSoundMuted.value = !isSoundMuted.value
  localStorage.setItem('embong_pos_muted', isSoundMuted.value ? 'true' : 'false')
  if (!isSoundMuted.value) {
    playCheckoutSound(true)
  }
}

let sharedAudioCtx = null

export function playCheckoutSound(force = false) {
  if (isSoundMuted.value && !force) return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume()
    }

    const now = sharedAudioCtx.currentTime

    // Nốt 1: E6 (1318.5 Hz) + họa âm chuông nhẹ
    const playBellNote = (freq, startTime, duration, peakGain) => {
      const osc1 = sharedAudioCtx.createOscillator()
      const osc2 = sharedAudioCtx.createOscillator()
      const gain = sharedAudioCtx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freq, startTime)

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(freq * 2, startTime)

      const subGain2 = sharedAudioCtx.createGain()
      subGain2.gain.setValueAtTime(0.22, startTime)

      osc1.connect(gain)
      osc2.connect(subGain2)
      subGain2.connect(gain)
      gain.connect(sharedAudioCtx.destination)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration)

      osc1.start(startTime)
      osc2.start(startTime)
      osc1.stop(startTime + duration + 0.02)
      osc2.stop(startTime + duration + 0.02)
    }

    // Âm thanh "Ting - Ting!" trong trẻo kiểu máy POS thu ngân
    playBellNote(1318.51, now, 0.22, 0.28)        // E6
    playBellNote(1975.53, now + 0.11, 0.45, 0.34) // B6
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

