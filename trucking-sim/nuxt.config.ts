import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: false,
  srcDir: '.',

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
      ],
    },
  },

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],

  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  pwa: {
    strategies: 'injectManifest',
    srcDir: '.',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'Trucking Empire',
      short_name: 'TruckingEmpire',
      description: 'Realistic truck dispatching game — start with a van in Utica, build a logistics empire.',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait-primary',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    },
  },

  nitro: {
    preset: 'cloudflare-module',
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '*/2 * * * *': ['push:check'],
    },
  },

  css: ['leaflet/dist/leaflet.css', '~/assets/css/main.css'],

  compatibilityDate: '2025-08-15',
})
