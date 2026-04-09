import { describe, it, expect } from 'vitest'
import { resolveTemplate, buildTemplateContext } from '@/lib/decorative-template'
import type { RealMetrics } from '@/hooks/use-real-metrics'

describe('decorative-template', () => {
  const mockMetrics: RealMetrics = {
    browser: 'CHROME.131',
    os: 'MACOS',
    platform: 'CHROME.131 // MACOS',
    sector: 'EU-CENTRAL',
    sessionId: 'A1B2C3D4',
    downlink: 10.5,
    buildVersion: '1.0.0.abc1234',
    isSecure: true,
    connectionStatus: 'HTTPS // SECURE',
  }

  const dataCounts = { releases: 42, gigs: 7, tracks: 120, members: 3 }

  describe('buildTemplateContext', () => {
    it('maps metrics and data counts correctly', () => {
      const ctx = buildTemplateContext(mockMetrics, dataCounts)
      expect(ctx.session.id).toBe('A1B2C3D4')
      expect(ctx.session.sector).toBe('EU-CENTRAL')
      expect(ctx.session.browser).toBe('CHROME.131')
      expect(ctx.session.os).toBe('MACOS')
      expect(ctx.session.platform).toBe('CHROME.131 // MACOS')
      expect(ctx.session.downlink).toBe('10.5')
      expect(ctx.session.build).toBe('1.0.0.abc1234')
      expect(ctx.session.connection).toBe('HTTPS // SECURE')
      expect(ctx.data.releases).toBe('42')
      expect(ctx.data.gigs).toBe('7')
      expect(ctx.data.tracks).toBe('120')
      expect(ctx.data.members).toBe('3')
    })

    it('handles null downlink', () => {
      const metrics: RealMetrics = { ...mockMetrics, downlink: null }
      const ctx = buildTemplateContext(metrics, dataCounts)
      expect(ctx.session.downlink).toBe('?')
    })
  })

  describe('resolveTemplate', () => {
    const ctx = buildTemplateContext(mockMetrics, dataCounts)

    it('replaces session variables', () => {
      expect(resolveTemplate('SESSION: {session.id}', ctx)).toBe('SESSION: A1B2C3D4')
      expect(resolveTemplate('SECTOR: {session.sector}', ctx)).toBe('SECTOR: EU-CENTRAL')
      expect(resolveTemplate('BUILD: {session.build}', ctx)).toBe('BUILD: 1.0.0.abc1234')
    })

    it('replaces data variables', () => {
      expect(resolveTemplate('{data.releases} RELEASES.INDEXED', ctx)).toBe('42 RELEASES.INDEXED')
      expect(resolveTemplate('{data.gigs} EVENTS', ctx)).toBe('7 EVENTS')
      expect(resolveTemplate('{data.tracks} TRACKS', ctx)).toBe('120 TRACKS')
    })

    it('replaces multiple variables in one string', () => {
      expect(resolveTemplate('{data.releases} RELEASES // {session.sector}', ctx)).toBe(
        '42 RELEASES // EU-CENTRAL',
      )
    })

    it('leaves unknown variables unchanged', () => {
      expect(resolveTemplate('{unknown.var}', ctx)).toBe('{unknown.var}')
      expect(resolveTemplate('{session.nonexistent}', ctx)).toBe('{session.nonexistent}')
    })

    it('returns string unchanged when no template vars present', () => {
      expect(resolveTemplate('// STATIC.LABEL', ctx)).toBe('// STATIC.LABEL')
    })

    it('handles empty string', () => {
      expect(resolveTemplate('', ctx)).toBe('')
    })
  })
})
