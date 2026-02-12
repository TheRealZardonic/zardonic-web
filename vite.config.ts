import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    proxy: {
      '/api/odesli': {
        target: 'https://api.song.link',
        changeOrigin: true,
        rewrite: (path: string) => {
          const url = new URL(path, 'http://localhost')
          const params = url.searchParams
          return `/v1-alpha.1/links?${params.toString()}`
        },
      },
      '/api/itunes': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        rewrite: (path: string) => {
          const url = new URL(path, 'http://localhost')
          const params = url.searchParams
          return `/search?${params.toString()}`
        },
      },
      '/api/bandsintown': {
        target: 'https://rest.bandsintown.com',
        changeOrigin: true,
        rewrite: (path: string) => {
          const url = new URL(path, 'http://localhost')
          const params = url.searchParams
          const artist = params.get('artist') || 'Zardonic'
          params.delete('artist')
          return `/artists/${encodeURIComponent(artist)}/events?${params.toString()}`
        },
      },
    },
  },
});
