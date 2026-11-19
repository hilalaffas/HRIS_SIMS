import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // [BARU] Browser modern saja (2023+): bundle lebih kecil, tanpa polyfill yang tidak perlu.
    target: 'es2022',
    // [BARU] Source map tidak ikut ke production (jangan bocorkan source code asli).
    sourcemap: false,
    // [BARU] Library besar dipisah dari kode aplikasi supaya di-cache browser terpisah:
    // deploy baru tidak memaksa user mengunduh ulang React/Router/axios.
    // jsPDF & html2canvas sengaja TIDAK dimasukkan group: keduanya sudah di-import dinamis
    // (hanya diunduh saat user menekan tombol ekspor PDF).
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-http',
              test: /node_modules[\\/](axios|follow-redirects|form-data)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-sanitize',
              test: /node_modules[\\/]dompurify[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})
