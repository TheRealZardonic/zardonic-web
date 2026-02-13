import { describe, it, expect } from 'vitest'
import { contactFormSchema } from './contact'

describe('contactFormSchema', () => {
  const validData = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Hello',
    message: 'This is a test message.',
  }

  it('accepts valid data', () => {
    const result = contactFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('trims whitespace from fields', () => {
    const result = contactFormSchema.safeParse({
      ...validData,
      name: '  Jane Doe  ',
      email: '  jane@example.com  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe')
      expect(result.data.email).toBe('jane@example.com')
    }
  })

  it('rejects empty name', () => {
    const result = contactFormSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding max length', () => {
    const result = contactFormSchema.safeParse({ ...validData, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = contactFormSchema.safeParse({ ...validData, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = contactFormSchema.safeParse({ ...validData, email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty subject', () => {
    const result = contactFormSchema.safeParse({ ...validData, subject: '' })
    expect(result.success).toBe(false)
  })

  it('rejects subject exceeding max length', () => {
    const result = contactFormSchema.safeParse({ ...validData, subject: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects empty message', () => {
    const result = contactFormSchema.safeParse({ ...validData, message: '' })
    expect(result.success).toBe(false)
  })

  it('rejects message exceeding max length', () => {
    const result = contactFormSchema.safeParse({ ...validData, message: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('accepts empty honeypot field', () => {
    const result = contactFormSchema.safeParse({ ...validData, _hp: '' })
    expect(result.success).toBe(true)
  })

  it('rejects non-empty honeypot field', () => {
    const result = contactFormSchema.safeParse({ ...validData, _hp: 'bot-filled' })
    expect(result.success).toBe(false)
  })

  it('accepts missing honeypot field', () => {
    const result = contactFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})
