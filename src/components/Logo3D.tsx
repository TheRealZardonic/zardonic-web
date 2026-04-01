import { useRef, Suspense, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, PerspectiveCamera, Center } from '@react-three/drei'
import { Group } from 'three'
import * as THREE from 'three'
import modelFile from '@/assets/models/ZARDONICTEXT.glb'

function FallbackLogo({ scrollY }: { scrollY: number }) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = scrollY * 0.0015
      groupRef.current.rotation.x = Math.sin(scrollY * 0.001) * 0.15
      groupRef.current.position.y = scrollY * -0.003
      groupRef.current.position.z = scrollY * 0.002
    }
  })

  return (
    <group ref={groupRef}>
      <Center>
        <mesh>
          <boxGeometry args={[5, 1.2, 0.4]} />
          <meshStandardMaterial 
            color="#b43232" 
            metalness={0.8} 
            roughness={0.2}
            emissive="#b43232"
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, 0, 0.25]}>
          <planeGeometry args={[4.8, 1]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </Center>
    </group>
  )
}

function GLBModel({ scrollY }: { scrollY: number }) {
  const groupRef = useRef<Group>(null)
  const [model, setModel] = useState<THREE.Object3D | null>(null)
  const [error, setError] = useState(false)
  const [gltf, setGltf] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    const loadModel = async () => {
      try {
        const loadedGltf = await useGLTF.preload(modelFile)
        if (mounted) {
          setGltf(loadedGltf)
        }
      } catch (err) {
        console.error('Failed to load model:', err)
        if (mounted) {
          setError(true)
        }
      }
    }

    loadModel()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!gltf?.scene) {
      return
    }

    try {
      const clonedScene = gltf.scene.clone()
      
      clonedScene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            materials.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.metalness = 0.9
                mat.roughness = 0.2
                mat.emissive = new THREE.Color('#b43232')
                mat.emissiveIntensity = 0.2
              }
            })
          }
        }
      })

      const box = new THREE.Box3().setFromObject(clonedScene)
      const center = box.getCenter(new THREE.Vector3())
      clonedScene.position.sub(center)
      
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 4 / maxDim
      clonedScene.scale.setScalar(scale)

      setModel(clonedScene)
    } catch (err) {
      console.error('Failed to process model:', err)
      setError(true)
    }
  }, [gltf])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = scrollY * 0.0015
      groupRef.current.rotation.x = Math.sin(scrollY * 0.001) * 0.15
      groupRef.current.position.y = scrollY * -0.003
      groupRef.current.position.z = scrollY * 0.002
    }
  })

  if (error || !model) {
    return <FallbackLogo scrollY={scrollY} />
  }

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  )
}

function ZardonicModel({ scrollY }: { scrollY: number }) {
  return (
    <Suspense fallback={<FallbackLogo scrollY={scrollY} />}>
      <GLBModel scrollY={scrollY} />
    </Suspense>
  )
}

function Scene({ scrollY }: { scrollY: number }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={2} color="#ff6464" />
      <directionalLight position={[-10, -10, -5]} intensity={1.2} color="#64ffff" />
      <pointLight position={[0, 0, 5]} intensity={1.5} color="#b43232" />
      <spotLight 
        position={[0, 5, 5]} 
        intensity={2} 
        angle={0.5} 
        penumbra={1} 
        color="#ff6464"
      />
      <ZardonicModel scrollY={scrollY} />
    </>
  )
}

export function Logo3D() {
  const [scrollY, setScrollY] = useState(0)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (hasError) {
    return (
      <div className="w-full h-[350px] md:h-[450px] relative flex items-center justify-center">
        <div className="text-4xl md:text-6xl font-bold uppercase tracking-tighter text-foreground font-mono text-chromatic">
          ZARDONIC
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[350px] md:h-[450px] relative">
      <Canvas 
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 0)
        }}
        onError={(error) => {
          console.error('Canvas error:', error)
          setHasError(true)
        }}
      >
        <Scene scrollY={scrollY} />
      </Canvas>
    </div>
  )
}

