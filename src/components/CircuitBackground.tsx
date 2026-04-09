import { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

interface CircuitLine {
  id: number
  x: string
  y: string
  width?: string
  height?: string
  horizontal: boolean
  depth: number
}

interface CircuitNode {
  id: number
  x: string
  y: string
  depth: number
}

interface DataPulse {
  key: number
  lineId: number
  x: string
  y: string
  width: string
  height: string
  horizontal: boolean
  depth: number
}

export const CircuitBackground = memo(function CircuitBackground({
  speed = 1,
  glow = 0.8,
}: {
  /** Pulse spawn speed multiplier: 0.5 (slow) – 3 (fast). Default 1. */
  speed?: number
  /** Glow intensity: 0–1. Default 0.8. */
  glow?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  // Smooth out the raw scroll value so parallax layers ease to their target
  // position rather than stopping abruptly when the user stops scrolling.
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, restDelta: 0.001 })
  const [pulses, setPulses] = useState<DataPulse[]>([])
  const pulseCounter = useRef(0)
  
  // Optimize transforms with reduced motion sensitivity
  const layer1Y = useTransform(smoothProgress, [0, 1], ['0%', '10%'])
  const layer2Y = useTransform(smoothProgress, [0, 1], ['0%', '25%'])
  const layer3Y = useTransform(smoothProgress, [0, 1], ['0%', '40%'])

  // Memoize line and node arrays to prevent recreation on every render
  const lines: CircuitLine[] = useMemo(() => [
    { id: 1, x: '5%', y: '8%', width: '15%', horizontal: true, depth: 1 },
    { id: 2, x: '20%', y: '8%', height: '12%', horizontal: false, depth: 1 },
    { id: 3, x: '20%', y: '20%', width: '25%', horizontal: true, depth: 1 },
    { id: 4, x: '45%', y: '20%', height: '8%', horizontal: false, depth: 1 },
    { id: 5, x: '45%', y: '28%', width: '18%', horizontal: true, depth: 1 },
    { id: 6, x: '70%', y: '15%', height: '20%', horizontal: false, depth: 1 },
    { id: 7, x: '70%', y: '35%', width: '12%', horizontal: true, depth: 1 },
    { id: 8, x: '82%', y: '12%', height: '23%', horizontal: false, depth: 1 },
    { id: 9, x: '10%', y: '42%', width: '20%', horizontal: true, depth: 1 },
    { id: 10, x: '30%', y: '42%', height: '15%', horizontal: false, depth: 1 },
    
    { id: 11, x: '8%', y: '55%', width: '12%', horizontal: true, depth: 2 },
    { id: 12, x: '20%', y: '55%', height: '18%', horizontal: false, depth: 2 },
    { id: 13, x: '20%', y: '73%', width: '22%', horizontal: true, depth: 2 },
    { id: 14, x: '42%', y: '60%', height: '13%', horizontal: false, depth: 2 },
    { id: 15, x: '55%', y: '52%', width: '15%', horizontal: true, depth: 2 },
    { id: 16, x: '55%', y: '52%', height: '25%', horizontal: false, depth: 2 },
    { id: 17, x: '55%', y: '77%', width: '20%', horizontal: true, depth: 2 },
    { id: 18, x: '75%', y: '55%', height: '22%', horizontal: false, depth: 2 },
    { id: 19, x: '12%', y: '85%', width: '18%', horizontal: true, depth: 2 },
    { id: 20, x: '88%', y: '65%', height: '15%', horizontal: false, depth: 2 },
    
    { id: 21, x: '15%', y: '10%', width: '8%', horizontal: true, depth: 3 },
    { id: 22, x: '35%', y: '5%', height: '10%', horizontal: false, depth: 3 },
    { id: 23, x: '50%', y: '18%', width: '12%', horizontal: true, depth: 3 },
    { id: 24, x: '62%', y: '22%', height: '8%', horizontal: false, depth: 3 },
    { id: 25, x: '78%', y: '8%', width: '10%', horizontal: true, depth: 3 },
    { id: 26, x: '25%', y: '32%', width: '15%', horizontal: true, depth: 3 },
    { id: 27, x: '40%', y: '38%', height: '12%', horizontal: false, depth: 3 },
    { id: 28, x: '65%', y: '45%', width: '8%', horizontal: true, depth: 3 },
    { id: 29, x: '18%', y: '62%', width: '10%', horizontal: true, depth: 3 },
    { id: 30, x: '48%', y: '68%', height: '10%', horizontal: false, depth: 3 },
    { id: 31, x: '72%', y: '72%', width: '12%', horizontal: true, depth: 3 },
    { id: 32, x: '32%', y: '88%', width: '15%', horizontal: true, depth: 3 },
    { id: 33, x: '85%', y: '82%', height: '8%', horizontal: false, depth: 3 },
    { id: 34, x: '92%', y: '25%', height: '15%', horizontal: false, depth: 3 },
    { id: 35, x: '5%', y: '75%', width: '8%', horizontal: true, depth: 3 },
  ], [])

  const nodes: CircuitNode[] = useMemo(() => [
    { id: 1, x: '5%', y: '8%', depth: 1 },
    { id: 2, x: '20%', y: '8%', depth: 1 },
    { id: 3, x: '20%', y: '20%', depth: 1 },
    { id: 4, x: '45%', y: '20%', depth: 1 },
    { id: 5, x: '45%', y: '28%', depth: 1 },
    { id: 6, x: '63%', y: '28%', depth: 1 },
    { id: 7, x: '70%', y: '15%', depth: 1 },
    { id: 8, x: '70%', y: '35%', depth: 1 },
    { id: 9, x: '82%', y: '35%', depth: 1 },
    { id: 10, x: '82%', y: '12%', depth: 1 },
    { id: 11, x: '10%', y: '42%', depth: 1 },
    { id: 12, x: '30%', y: '42%', depth: 1 },
    { id: 13, x: '30%', y: '57%', depth: 1 },
    
    { id: 14, x: '8%', y: '55%', depth: 2 },
    { id: 15, x: '20%', y: '55%', depth: 2 },
    { id: 16, x: '20%', y: '73%', depth: 2 },
    { id: 17, x: '42%', y: '73%', depth: 2 },
    { id: 18, x: '42%', y: '60%', depth: 2 },
    { id: 19, x: '55%', y: '52%', depth: 2 },
    { id: 20, x: '70%', y: '52%', depth: 2 },
    { id: 21, x: '55%', y: '77%', depth: 2 },
    { id: 22, x: '75%', y: '77%', depth: 2 },
    { id: 23, x: '75%', y: '55%', depth: 2 },
    { id: 24, x: '12%', y: '85%', depth: 2 },
    { id: 25, x: '30%', y: '85%', depth: 2 },
    { id: 26, x: '88%', y: '65%', depth: 2 },
    { id: 27, x: '88%', y: '80%', depth: 2 },
    
    { id: 28, x: '15%', y: '10%', depth: 3 },
    { id: 29, x: '23%', y: '10%', depth: 3 },
    { id: 30, x: '35%', y: '5%', depth: 3 },
    { id: 31, x: '35%', y: '15%', depth: 3 },
    { id: 32, x: '50%', y: '18%', depth: 3 },
    { id: 33, x: '62%', y: '18%', depth: 3 },
    { id: 34, x: '62%', y: '30%', depth: 3 },
    { id: 35, x: '78%', y: '8%', depth: 3 },
    { id: 36, x: '88%', y: '8%', depth: 3 },
    { id: 37, x: '25%', y: '32%', depth: 3 },
    { id: 38, x: '40%', y: '32%', depth: 3 },
    { id: 39, x: '40%', y: '38%', depth: 3 },
    { id: 40, x: '40%', y: '50%', depth: 3 },
    { id: 41, x: '65%', y: '45%', depth: 3 },
    { id: 42, x: '73%', y: '45%', depth: 3 },
    { id: 43, x: '18%', y: '62%', depth: 3 },
    { id: 44, x: '28%', y: '62%', depth: 3 },
    { id: 45, x: '48%', y: '68%', depth: 3 },
    { id: 46, x: '48%', y: '78%', depth: 3 },
    { id: 47, x: '72%', y: '72%', depth: 3 },
    { id: 48, x: '84%', y: '72%', depth: 3 },
    { id: 49, x: '32%', y: '88%', depth: 3 },
    { id: 50, x: '47%', y: '88%', depth: 3 },
    { id: 51, x: '85%', y: '82%', depth: 3 },
    { id: 52, x: '85%', y: '90%', depth: 3 },
    { id: 53, x: '92%', y: '25%', depth: 3 },
    { id: 54, x: '92%', y: '40%', depth: 3 },
    { id: 55, x: '5%', y: '75%', depth: 3 },
    { id: 56, x: '13%', y: '75%', depth: 3 },
  ], [])

  // Memoize filtered arrays
  const depth3Lines = useMemo(() => lines.filter(l => l.depth === 3), [lines])
  const depth3Nodes = useMemo(() => nodes.filter(n => n.depth === 3), [nodes])
  const depth2Lines = useMemo(() => lines.filter(l => l.depth === 2), [lines])
  const depth2Nodes = useMemo(() => nodes.filter(n => n.depth === 2), [nodes])
  const depth1Lines = useMemo(() => lines.filter(l => l.depth === 1), [lines])
  const depth1Nodes = useMemo(() => nodes.filter(n => n.depth === 1), [nodes])

  // Spawn random data pulses along circuit lines
  const spawnPulse = useCallback(() => {
    if (lines.length === 0) return
    const line = lines[Math.floor(Math.random() * lines.length)]
    const key = ++pulseCounter.current
    setPulses(prev => [...prev, {
      key,
      lineId: line.id,
      x: line.x,
      y: line.y,
      width: line.horizontal ? (line.width || '10%') : '2px',
      height: line.horizontal ? '2px' : (line.height || '10%'),
      horizontal: line.horizontal,
      depth: line.depth,
    }])

    // Remove pulse after animation completes
    setTimeout(() => {
      setPulses(prev => prev.filter(p => p.key !== key))
    }, 1400)
  }, [lines])

  useEffect(() => {
    // Check prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const scheduleNext = () => {
      // speed=1 → 3-11s; speed=2 → 1.5-5.5s; speed=0.5 → 6-22s
      const base = 3000 / speed
      const variance = 8000 / speed
      const delay = base + Math.random() * variance
      return setTimeout(() => {
        spawnPulse()
        timerId = scheduleNext()
      }, delay)
    }

    let timerId = scheduleNext()
    return () => clearTimeout(timerId)
  }, [spawnPulse, speed])

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden pointer-events-none"
      >
        <motion.div
          className="absolute inset-0 opacity-[0.15]"
          style={{ y: layer3Y, filter: `brightness(${0.5 + glow * 0.8})`, top: '-50%', bottom: '-50%' }}
        >
          {depth3Lines.map((line) => (
            <div
              key={line.id}
              className="circuit-line"
              style={{
                left: line.x,
                top: line.y,
                width: line.horizontal ? line.width : '2px',
                height: line.horizontal ? '2px' : line.height,
                willChange: 'auto'
              }}
            />
          ))}
          {depth3Nodes.map((node) => (
            <div
              key={node.id}
              className="circuit-node"
              style={{
                left: node.x,
                top: node.y,
                animationDelay: `${node.id * 0.15}s`,
                willChange: 'auto'
              }}
            />
          ))}
          {pulses.filter(p => p.depth === 3).map((pulse) => (
            <div
              key={pulse.key}
              className={`circuit-line-pulse ${pulse.horizontal ? 'horizontal' : 'vertical'}`}
              style={{
                left: pulse.x,
                top: pulse.y,
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ y: layer2Y, willChange: 'transform' }}
      >
        <div className="absolute inset-0 opacity-[0.25]">
          {depth2Lines.map((line) => (
            <div
              key={line.id}
              className="circuit-line"
              style={{
                left: line.x,
                top: line.y,
                width: line.horizontal ? line.width : '2px',
                height: line.horizontal ? '2px' : line.height,
                willChange: 'auto'
              }}
            />
          ))}
          {depth2Nodes.map((node) => (
            <div
              key={node.id}
              className="circuit-node"
              style={{
                left: node.x,
                top: node.y,
                animationDelay: `${node.id * 0.1}s`,
                willChange: 'auto'
              }}
            />
          ))}
          {pulses.filter(p => p.depth === 2).map((pulse) => (
            <div
              key={pulse.key}
              className={`circuit-line-pulse ${pulse.horizontal ? 'horizontal' : 'vertical'}`}
              style={{
                left: pulse.x,
                top: pulse.y,
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ y: layer1Y, willChange: 'transform' }}
      >
        <div className="absolute inset-0 opacity-[0.35]">
          {depth1Lines.map((line) => (
            <div
              key={line.id}
              className="circuit-line"
              style={{
                left: line.x,
                top: line.y,
                width: line.horizontal ? line.width : '2px',
                height: line.horizontal ? '2px' : line.height,
                willChange: 'auto'
              }}
            />
          ))}
          {depth1Nodes.map((node) => (
            <div
              key={node.id}
              className="circuit-node"
              style={{
                left: node.x,
                top: node.y,
                animationDelay: `${node.id * 0.08}s`,
                willChange: 'auto'
              }}
            />
          ))}
          {pulses.filter(p => p.depth === 1).map((pulse) => (
            <div
              key={pulse.key}
              className={`circuit-line-pulse ${pulse.horizontal ? 'horizontal' : 'vertical'}`}
              style={{
                left: pulse.x,
                top: pulse.y,
              }}
            />
          ))}
        </div>
      </motion.div>
    </>
  )
})
