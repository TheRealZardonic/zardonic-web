/// <reference types="vite/client" />

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