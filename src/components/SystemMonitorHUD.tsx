import { useEffect, useState } from 'react'
import type React from 'react'

// HUD configuration defaults — these keys are not in config.ts so we define them here
const HUD_METADATA_ENABLED = true
const HUD_METADATA_UPDATE_INTERVAL_MS = 1000
const HUD_SHOW_TIMESTAMP = true
const HUD_SHOW_PSEUDO_IP = true
const HUD_SHOW_UPTIME = true
const HUD_SHOW_SECTOR = true
const HUD_SHOW_SCROLL_SPEED = true

interface SystemMetrics {
  timestamp: string
  pseudoIp: string
  uptime: string
  sector: string
  scrollSpeed: number
}

/**
 * SystemMonitorHUD - Displays system metadata in corners like an active CRT monitor.
 * Shows timestamps, pseudo-IP, uptime, sector designation, and scroll speed.
 */
export function SystemMonitorHUD() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    timestamp: '',
    pseudoIp: '192.168.7.42',
    uptime: '00:00:00',
    sector: '7-B',
    scrollSpeed: 0,
  })

  const [startTime] = useState(() => Date.now())
  const [lastScrollPos, setLastScrollPos] = useState(0)
  const [lastScrollTime, setLastScrollTime] = useState(() => Date.now())

  useEffect(() => {
    if (!HUD_METADATA_ENABLED) return

    const updateMetrics = () => {
      const now = new Date()
      const uptime = Date.now() - startTime
      const hours = Math.floor(uptime / 3600000)
      const minutes = Math.floor((uptime % 3600000) / 60000)
      const seconds = Math.floor((uptime % 60000) / 1000)

      setMetrics((prev) => ({
        ...prev,
        timestamp: now.toISOString().replace('T', ' ').substring(0, 19),
        uptime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      }))
    }

    const intervalId = setInterval(updateMetrics, HUD_METADATA_UPDATE_INTERVAL_MS)
    updateMetrics()

    return () => clearInterval(intervalId)
  }, [startTime])

  useEffect(() => {
    if (!HUD_METADATA_ENABLED) return

    const handleScroll = () => {
      const now = Date.now()
      const currentScrollPos = window.scrollY
      const timeDiff = (now - lastScrollTime) / 1000 // convert to seconds
      const scrollDiff = Math.abs(currentScrollPos - lastScrollPos)

      if (timeDiff > 0.1) {
        // Calculate scroll speed in pixels/s, convert to "KB/s" aesthetic
        const speed = Math.round((scrollDiff / timeDiff) / 10)
        setMetrics((prev) => ({
          ...prev,
          scrollSpeed: speed,
        }))
        setLastScrollPos(currentScrollPos)
        setLastScrollTime(now)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollPos, lastScrollTime])

  if (!HUD_METADATA_ENABLED) return null

  return (
    <>
      {/* Top Left Corner */}
      <div className="pointer-events-none fixed left-2 top-2 font-mono text-xs leading-tight tracking-wider text-primary/60 sm:left-4 sm:top-4 sm:text-xs" style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}>
        {HUD_SHOW_TIMESTAMP && (
          <div className="animate-pulse">
            <span className="text-primary/40">SYS_TIME:</span> {metrics.timestamp}
          </div>
        )}
        {HUD_SHOW_PSEUDO_IP && (
          <div className="mt-1">
            <span className="text-primary/40">NODE_IP:</span> {metrics.pseudoIp}
          </div>
        )}
      </div>

      {/* Top Right Corner */}
      <div className="pointer-events-none fixed right-2 top-2 font-mono text-xs leading-tight tracking-wider text-primary/60 sm:right-4 sm:top-4 sm:text-xs" style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}>
        {HUD_SHOW_UPTIME && (
          <div className="text-right">
            <span className="text-primary/40">UPTIME:</span> {metrics.uptime}
          </div>
        )}
        {HUD_SHOW_SECTOR && (
          <div className="mt-1 text-right">
            <span className="text-primary/40">SECTOR:</span> {metrics.sector}
          </div>
        )}
      </div>

      {/* Bottom Right Corner */}
      {HUD_SHOW_SCROLL_SPEED && (
        <div className="pointer-events-none fixed bottom-2 right-2 font-mono text-xs leading-tight tracking-wider text-primary/60 sm:bottom-4 sm:right-4 sm:text-xs" style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}>
          <div className="text-right">
            <span className="text-primary/40">DATA_RATE:</span> {metrics.scrollSpeed} KB/s
          </div>
        </div>
      )}
    </>
  )
}
