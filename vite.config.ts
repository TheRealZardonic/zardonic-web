import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'dev'
  }
}

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf-8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

// https://vite.dev/config/
// Use Vite's `mode` parameter (reliable) instead of process.env.NODE_ENV to
// detect production builds — mode is 'production' for `vite build` and
// 'development' for `vite dev`/`vite preview`.
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(getPackageVersion()),
      __GIT_HASH__: JSON.stringify(getGitHash()),
    },
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src')
      }
    },
    assetsInclude: ['**/*.glb', '**/*.gltf'],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom')) return 'vendor-react'
            if (id.includes('/node_modules/framer-motion')) return 'vendor-motion'
            if (id.includes('/node_modules/three')) return 'vendor-three'
            if (id.includes('/node_modules/@phosphor-icons')) return 'vendor-icons'
            if (id.includes('/node_modules/@tanstack/react-query')) return 'vendor-query'
            if (id.includes('/node_modules/lucide-react')) return 'vendor-lucide'
            if (id.includes('/node_modules/d3') || id.includes('/node_modules/d3-')) return 'vendor-d3'
            if (id.includes('/node_modules/recharts')) return 'vendor-recharts'
            if (
              id.includes('/node_modules/@tiptap/') ||
              id.includes('/node_modules/prosemirror')
            ) return 'vendor-tiptap'
            if (
              id.includes('/node_modules/@radix-ui/react-dialog') ||
              id.includes('/node_modules/@radix-ui/react-separator') ||
              id.includes('/node_modules/@radix-ui/react-slot')
            ) return 'vendor-ui'
          },
        },
      },
      // All gzipped chunks are under the 500 kB threshold required by AGENTS.md.
      chunkSizeWarningLimit: 500,
      minify: 'esbuild',
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        '@phosphor-icons/react',
      ],
    },
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
            const artist = params.get('artist') || ''
            params.delete('artist')
            return `/artists/${encodeURIComponent(artist)}/events?${params.toString()}`
          },
        },
        '/api/spotify': {
          target: 'https://api.spotify.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/spotify/, ''),
        },
        '/api/sanity': {
          target: 'https://unz85dqo.apicdn.sanity.io',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/sanity/, ''),
        },
      },
    },
  };
});
