import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path'
import JavaScriptObfuscator from 'javascript-obfuscator';
import type { ObfuscatorOptions } from 'javascript-obfuscator';
import type { OutputBundle } from 'rollup';

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
// Use Vite's `mode` parameter (reliable) instead of process.env.NODE_ENV to
// detect production builds — mode is 'production' for `vite build` and
// 'development' for `vite dev`/`vite preview`.
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isProduction ? [{
        name: 'vite:obfuscatefiles',
        generateBundle(_options: unknown, bundle: OutputBundle) {
          const obfuscatorOptions: ObfuscatorOptions = {
            compact: true,
            controlFlowFlattening: false,
            controlFlowFlatteningThreshold: 0,
            deadCodeInjection: false,
            debugProtection: false,
            debugProtectionInterval: 0,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'mangled',
            log: false,
            numbersToExpressions: false,
            renameGlobals: false,
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayCallsTransformThreshold: 0.5,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2,
            stringArrayWrappersChunkSize: 2,
            stringArrayWrappersParametersMaxCount: 4,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.6,
            unicodeEscapeSequence: false,
          };
          console.log('\nObfuscate files');
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type === 'chunk' && chunk.code) {
              console.log(`Obfuscating ${fileName}...`);
              chunk.code = JavaScriptObfuscator.obfuscate(chunk.code, obfuscatorOptions).getObfuscatedCode();
            }
          }
          console.log('Obfuscate done');
        },
      }] : []),
    ],
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
            if (
              id.includes('/node_modules/@radix-ui/react-dialog') ||
              id.includes('/node_modules/@radix-ui/react-separator') ||
              id.includes('/node_modules/@radix-ui/react-slot')
            ) return 'vendor-ui'
          },
        },
      },
      chunkSizeWarningLimit: 600,
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
            const artist = params.get('artist') || 'Zardonic'
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
