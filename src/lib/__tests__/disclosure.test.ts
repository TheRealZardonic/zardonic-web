import { describe, it, expect } from 'vitest'
import { isFieldVisible } from '../admin-settings'

describe('isFieldVisible (filterByDisclosure)', () => {
  it('basic field is visible at basic level', () => {
    expect(isFieldVisible('basic', 'basic')).toBe(true)
  })

  it('advanced field is NOT visible at basic level', () => {
    expect(isFieldVisible('advanced', 'basic')).toBe(false)
  })

  it('advanced field is visible at advanced level', () => {
    expect(isFieldVisible('advanced', 'advanced')).toBe(true)
  })

  it('advanced field is visible at expert level', () => {
    expect(isFieldVisible('advanced', 'expert')).toBe(true)
  })

  it('expert field is NOT visible at basic level', () => {
    expect(isFieldVisible('expert', 'basic')).toBe(false)
  })

  it('expert field is NOT visible at advanced level', () => {
    expect(isFieldVisible('expert', 'advanced')).toBe(false)
  })

  it('expert field is visible at expert level', () => {
    expect(isFieldVisible('expert', 'expert')).toBe(true)
  })

  it('basic field is visible at advanced level', () => {
    expect(isFieldVisible('basic', 'advanced')).toBe(true)
  })

  it('basic field is visible at expert level', () => {
    expect(isFieldVisible('basic', 'expert')).toBe(true)
  })
})
