import { useEffect, useState, useMemo } from 'react'
import type React from 'react'
import { useRealMetrics } from '@/hooks/use-real-metrics'
import type { DecorativeTexts } from '@/lib/types'
import { resolveTemplate, buildTemplateContext } from '@/lib/decorative-template'

// HUD configuration defaults
const HUD_METADATA_ENABLED = true
const HUD_METADATA_UPDATE_INTERVAL_MS = 1000

interface SystemMetrics {
  timestamp: string
  uptime: string
  scrollSpeed: number
}

interface SystemMonitorHUDProps {
  decorativeTexts?: DecorativeTexts
  dataCounts?: { releases: number; gigs: number; tracks: number; members: number }
}

/**
 * SystemMonitorHUD - Displays real system metadata in corners like an active CRT monitor.
 * Shows real timestamp, session ID (hashed), timezone region, uptime, and scroll speed.
 */
export function SystemMonitorHUD({ decorativeTexts, dataCounts }: SystemMonitorHUDProps) {
  const realMetrics = useRealMetrics()

  const [metrics, setMetrics] = useState<SystemMetrics>({
    timestamp: '',
    uptime: '00:00:00',
    scrollSpeed: 0,
  })

  const [startTime] = useState(() => Date.now())
  const [lastScrollPos, setLastScrollPos] = useState(0)
  const [lastScrollTime, setLastScrollTime] = useState(() => Date.now())

  const templateCtx = useMemo(
    () => buildTemplateContext(realMetrics, dataCounts ?? { releases: 0, gigs: 0, tracks: 0, members: 0 }),
    [realMetrics, dataCounts],
  )

  // Resolve configurable labels with fallback defaults
  const timeLabel = decorativeTexts?.hudTimeLabel
    ? resolveTemplate(decorativeTexts.hudTimeLabel, templateCtx)
    : 'SYS_TIME:'
  const sessionLabel = decorativeTexts?.hudSessionLabel
    ? resolveTemplate(decorativeTexts.hudSessionLabel, templateCtx)
    : 'SESSION:'
  const uptimeLabel = decorativeTexts?.hudUptimeLabel
    ? resolveTemplate(decorativeTexts.hudUptimeLabel, templateCtx)
    : 'UPTIME:'
  const sectorLabel = decorativeTexts?.hudSectorLabel
    ? resolveTemplate(decorativeTexts.hudSectorLabel, templateCtx)
    : 'SECTOR:'
  const dataRateLabel = decorativeTexts?.hudDataRateLabel
    ? resolveTemplate(decorativeTexts.hudDataRateLabel, templateCtx)
    : 'DATA_RATE:'

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
      const timeDiff = (now - lastScrollTime) / 1000
      const scrollDiff = Math.abs(currentScrollPos - lastScrollPos)

      if (timeDiff > 0.1) {
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
      <div
        className="pointer-events-none fixed left-2 top-2 font-mono text-xs leading-tight tracking-wider text-primary/60 sm:left-4 sm:top-4 sm:text-xs"
        style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}
        data-theme-color="primary"
      >
        <div className="animate-pulse">
          <span className="text-primary/40">{timeLabel}</span> {metrics.timestamp}
        </div>
        <div className="mt-1">
          <span className="text-primary/40">{sessionLabel}</span> {realMetrics.sessionId}
        </div>
      </div>

      {/* Top Right Corner */}
      <div
        className="pointer-events-none fixed right-2 top-2 font-mono text-xs leading-tight tracking-wider text-primary/60 sm:right-4 sm:top-4 sm:text-xs"
        style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}
        data-theme-color="primary"
      >
        <div className="text-right">
          <span className="text-primary/40">{uptimeLabel}</span> {metrics.uptime}
        </div>
        <div className="mt-1 text-right">
          <span className="text-primary/40">{sectorLabel}</span> {realMetrics.sector}
        </div>
      </div>

      {/* Bottom Right Corner */}
      <div
        className="pointer-events-none fixed bottom-2 right-2 font-mono text-xs leading-tight tracking-wider text-primary/60 sm:bottom-4 sm:right-4 sm:text-xs"
        style={{ zIndex: 'var(--z-hud)' } as React.CSSProperties}
        data-theme-color="primary"
      >
        <div className="text-right">
          <span className="text-primary/40">{dataRateLabel}</span> {metrics.scrollSpeed} KB/s
        </div>
      </div>
    </>
  )
}
