/// <reference types="vite/client" />

// Build-time defines injected by vite.config.ts
declare const __APP_VERSION__: string
declare const __GIT_HASH__: string

declare module '*.glb' {
  const src: string
  export default src
}

declare module 'three/addons/loaders/GLTFLoader.js' {
  import { Loader, LoadingManager, Group } from 'three'
  
  export interface GLTF {
    scene: Group
    scenes: Group[]
    animations: unknown[]
    cameras: unknown[]
    asset: unknown
    parser: unknown
    userData: Record<string, unknown>
  }

  export class GLTFLoader extends Loader {
    constructor(manager?: LoadingManager)
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void
  }
}