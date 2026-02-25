let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let connectedElement: HTMLAudioElement | null = null

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

export function getAnalyser(): AnalyserNode {
  const ctx = getAudioContext()
  if (!analyser) {
    analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.8
    analyser.connect(ctx.destination)
  }
  return analyser
}

export function connectAudioElement(el: HTMLAudioElement): void {
  if (connectedElement === el) return
  const ctx = getAudioContext()
  const node = getAnalyser()

  if (sourceNode && connectedElement !== el) {
    sourceNode.disconnect()
    sourceNode = null
    connectedElement = null
  }

  if (!sourceNode) {
    try {
      sourceNode = ctx.createMediaElementSource(el)
      sourceNode.connect(node)
      connectedElement = el
    } catch (e) {
      console.warn('[AudioVisualizer] Could not connect audio element:', e)
    }
  }
}

export function getFrequencyData(): Uint8Array | null {
  if (!analyser) return null
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  return data
}

export function resumeAudioContext(): void {
  audioCtx?.resume()
}
