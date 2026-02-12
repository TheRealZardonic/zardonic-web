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
    animations: any[]
    cameras: any[]
    asset: any
    parser: any
    userData: any
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