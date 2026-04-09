import type { RealMetrics } from '@/hooks/use-real-metrics'

export interface TemplateContext {
  session: {
    id: string
    sector: string
    browser: string
    os: string
    platform: string
    downlink: string
    build: string
    connection: string
  }
  data: {
    releases: string
    gigs: string
    tracks: string
    members: string
  }
}

/**
 * Build a TemplateContext from real metrics and site data counts.
 */
export function buildTemplateContext(
  metrics: RealMetrics,
  dataCounts: { releases: number; gigs: number; tracks: number; members: number },
): TemplateContext {
  return {
    session: {
      id: metrics.sessionId,
      sector: metrics.sector,
      browser: metrics.browser,
      os: metrics.os,
      platform: metrics.platform,
      downlink: metrics.downlink !== null ? `${metrics.downlink}` : '?',
      build: metrics.buildVersion,
      connection: metrics.connectionStatus,
    },
    data: {
      releases: String(dataCounts.releases),
      gigs: String(dataCounts.gigs),
      tracks: String(dataCounts.tracks),
      members: String(dataCounts.members),
    },
  }
}

/**
 * Resolve template variables in a string.
 * Supports `{session.id}`, `{data.releases}`, etc.
 * Unknown variables are left unchanged.
 */
export function resolveTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{(\w+)\.(\w+)\}/g, (_match, group: string, key: string) => {
    const section = ctx[group as keyof TemplateContext]
    if (section && typeof section === 'object' && key in section) {
      return (section as Record<string, string>)[key]
    }
    return _match
  })
}
