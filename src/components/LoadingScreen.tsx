import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useMemo, memo } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import modelFile from '@/assets/models/ZARDONICHEAD.glb'

interface LoadingScreenProps {
  onLoadComplete: () => void
}

export const LoadingScreen = memo(function LoadingScreen({ onLoadComplete }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState(0)
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 100)
    }, 2000)

    return () => clearInterval(glitchInterval)
  }, [])

  useEffect(() => {
    if (loadingProgress > 20 && loadingStage < 1) setLoadingStage(1)
    if (loadingProgress > 40 && loadingStage < 2) setLoadingStage(2)
    if (loadingProgress > 60 && loadingStage < 3) setLoadingStage(3)
    if (loadingProgress > 80 && loadingStage < 4) setLoadingStage(4)
    if (loadingProgress === 100 && loadingStage < 5) setLoadingStage(5)
  }, [loadingProgress, loadingStage])

  // Memoize messages to prevent recreation
  const messages = useMemo(() => [
    'INITIALIZING NEURAL INTERFACE',
    'LOADING CORE SYSTEMS',
    'SYNCHRONIZING WETWARE',
    'ESTABLISHING CONNECTION',
    'SYSTEM READY'
  ], [])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      })
      renderer.setSize(500, 500)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    } catch (err) {
      console.error('Failed to create renderer:', err)
      setTimeout(() => onLoadComplete(), 1000)
      return
    }

    camera.position.z = 5

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xff6464, 1.5)
    directionalLight1.position.set(5, 5, 5)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0x64ffff, 1.0)
    directionalLight2.position.set(-5, -5, 5)
    scene.add(directionalLight2)

    const pointLight = new THREE.PointLight(0xffffff, 1.0)
    pointLight.position.set(0, 0, 3)
    scene.add(pointLight)

    let model: THREE.Object3D | null = null
    let animationFrameId: number
    let hasCompleted = false

    const loader = new GLTFLoader()
    loader.load(
      modelFile,
      (gltf) => {
        if (!gltf?.scene) {
          console.error('Invalid GLTF data')
          if (!hasCompleted) {
            hasCompleted = true
            setTimeout(() => onLoadComplete(), 1000)
          }
          return
        }

        try {
          model = gltf.scene
          
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center)
          
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 3 / maxDim
          model.scale.setScalar(scale)
          
          scene.add(model)
          setLoadingProgress(100)

          if (!hasCompleted) {
            hasCompleted = true
            setTimeout(() => {
              onLoadComplete()
            }, 2000)
          }
        } catch (err) {
          console.error('Failed to process model:', err)
          if (!hasCompleted) {
            hasCompleted = true
            setTimeout(() => onLoadComplete(), 1000)
          }
        }
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = Math.min((progress.loaded / progress.total) * 100, 95)
          setLoadingProgress(percent)
        }
      },
      (error) => {
        console.error('Error loading model:', error)
        if (!hasCompleted) {
          hasCompleted = true
          setTimeout(() => {
            onLoadComplete()
          }, 1000)
        }
      }
    )

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      if (model) {
        try {
          model.rotation.y += 0.01
          model.rotation.x = Math.sin(Date.now() * 0.001) * 0.1
        } catch (err) {
          console.error('Animation error:', err)
        }
      }

      try {
        renderer.render(scene, camera)
      } catch (err) {
        console.error('Render error:', err)
      }
    }

    animate()

    return () => {
      try {
        cancelAnimationFrame(animationFrameId)
        renderer.dispose()
        scene.clear()
      } catch (err) {
        console.error('Cleanup error:', err)
      }
    }
  }, [onLoadComplete, messages])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
    >
      <div className="full-page-noise periodic-noise-glitch" />
      <div className="scanline-effect absolute inset-0" />
      <div className="crt-overlay" />
      <div className="crt-vignette" />
      
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-32 bg-gradient-to-b from-transparent via-primary/30 to-transparent"
          style={{
            left: `${Math.random() * 100}%`,
            top: -128,
          }}
          animate={{
            top: ['0vh', '100vh'],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-20">
          <motion.div
            className="data-label text-center"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            {'>'} ZARDONIC.SYS v2.077 {'<'}
          </motion.div>
        </div>

        <div className="relative">
          <motion.div
            className="absolute inset-0 border-2 border-primary/20"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
          
          <canvas
            ref={canvasRef}
            className={`w-[500px] h-[500px] max-w-full ${glitchActive ? 'logo-glitch' : ''}`}
            style={{
              filter: glitchActive ? 'contrast(1.2) saturate(1.5)' : 'none',
            }}
          />

          <motion.div
            className="absolute top-0 left-0 w-1 h-1 bg-primary"
            animate={{
              boxShadow: [
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
                '0 0 20px 4px rgba(180, 50, 50, 0.8)',
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
          <motion.div
            className="absolute top-0 right-0 w-1 h-1 bg-primary"
            animate={{
              boxShadow: [
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
                '0 0 20px 4px rgba(180, 50, 50, 0.8)',
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.3,
            }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-1 h-1 bg-primary"
            animate={{
              boxShadow: [
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
                '0 0 20px 4px rgba(180, 50, 50, 0.8)',
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.6,
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-1 h-1 bg-primary"
            animate={{
              boxShadow: [
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
                '0 0 20px 4px rgba(180, 50, 50, 0.8)',
                '0 0 10px 2px rgba(180, 50, 50, 0.5)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.9,
            }}
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center w-full max-w-2xl px-4"
        >
          <div className="mb-6 h-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStage}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="text-primary font-mono text-sm uppercase tracking-widest text-chromatic"
              >
                {'// '}{messages[loadingStage]}
              </motion.p>
            </AnimatePresence>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute -top-6 left-0 font-mono text-xs text-muted-foreground">
                0x0000
              </div>
              <div className="absolute -top-6 right-0 font-mono text-xs text-muted-foreground">
                0xFFFF
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <div className="flex-1 h-2 bg-border/20 relative overflow-hidden border border-primary/20">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: loadingProgress / 100 }}
                    style={{ transformOrigin: 'left' }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                  
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-background/50"
                      style={{ left: `${i * 10}%` }}
                    />
                  ))}
                </div>
                <motion.span
                  className="text-primary font-mono text-sm min-w-[4ch] tabular-nums"
                  animate={{
                    textShadow: [
                      '0 0 10px rgba(180, 50, 50, 0.5)',
                      '0 0 20px rgba(180, 50, 50, 0.8)',
                      '0 0 10px rgba(180, 50, 50, 0.5)',
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  {Math.floor(loadingProgress)}%
                </motion.span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6 font-mono text-xs text-muted-foreground">
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: loadingProgress > 10 ? 1 : 0.3 }}
              >
                <motion.span
                  animate={{
                    color: loadingProgress > 10 ? 'oklch(0.55 0.25 25)' : 'oklch(0.6 0 0)',
                  }}
                >
                  ▸
                </motion.span>
                <span>WETWARE</span>
                {loadingProgress > 10 && <span className="text-primary">✓</span>}
              </motion.div>
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: loadingProgress > 40 ? 1 : 0.3 }}
              >
                <motion.span
                  animate={{
                    color: loadingProgress > 40 ? 'oklch(0.55 0.25 25)' : 'oklch(0.6 0 0)',
                  }}
                >
                  ▸
                </motion.span>
                <span>NEURAL</span>
                {loadingProgress > 40 && <span className="text-primary">✓</span>}
              </motion.div>
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: loadingProgress > 70 ? 1 : 0.3 }}
              >
                <motion.span
                  animate={{
                    color: loadingProgress > 70 ? 'oklch(0.55 0.25 25)' : 'oklch(0.6 0 0)',
                  }}
                >
                  ▸
                </motion.span>
                <span>CYBERDECK</span>
                {loadingProgress > 70 && <span className="text-primary">✓</span>}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-8 font-mono text-xs text-muted-foreground opacity-50">
        <div>BUILD: 2077.v1.23</div>
        <div>PLATFORM: WEB.NEURAL</div>
      </div>

      <div className="absolute bottom-8 right-8 font-mono text-xs text-muted-foreground opacity-50">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          CONNECTION: SECURE
        </motion.div>
      </div>
    </motion.div>
  )
})
