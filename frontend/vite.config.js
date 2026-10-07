import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpg'],
      manifest: {
        name: 'Em Bông POS',
        short_name: 'POS',
        description: 'Hệ thống quản lý bán hàng Em Bông',
        theme_color: '#4A6741',
        background_color: '#FAF9F6',
        display: 'standalone',
        icons: [
          {
            src: 'logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
})
