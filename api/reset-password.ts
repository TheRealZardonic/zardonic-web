import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import { timingSafeEqual } from './kv.js'
import { hashPassword } from './auth.js'
import { applyRateLimit } from './_ratelimit.js'
import { resetPasswordSchema, confirmResetPasswordSchema, validate } from './_schemas.js'
import { Resend } from 'resend'

// Check if KV is properly configured
const isKVConfigured = () => {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

const RESET_TOKEN_TTL = 600 // 10 minutes
const RESET_TOKEN_KEY = 'admin-reset-token'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Rate limiting — blocks brute-force password reset attempts (GDPR-compliant, IP is hashed)
  const allowed = await applyRateLimit(req, res)
  if (!allowed) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isKVConfigured()) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'KV storage is not configured.',
    })
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body is required' })
  }

  // --- Confirm reset flow: { token, newPassword } ---
  if (req.body.token) {
    const parsed = validate(confirmResetPasswordSchema, req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error })
    const { token, newPassword } = parsed.data

    try {
      const storedToken = await kv.get<string>(RESET_TOKEN_KEY)
      if (!storedToken || !timingSafeEqual(token, storedToken)) {
        return res.status(400).json({ error: 'Invalid or expired reset token' })
      }

      // Hash the new password server-side with scrypt
      const hashedPassword = await hashPassword(newPassword)

      // SECURITY: Delete the reset token atomically with the password update.
      // This ensures the token cannot be reused even under race conditions.
      const pipe = kv.pipeline()
      pipe.set('admin-password-hash', hashedPassword)
      pipe.del(RESET_TOKEN_KEY)
      await pipe.exec()

      return res.json({ success: true, message: 'Password has been reset successfully.' })
    } catch (error) {
      console.error('Password reset confirm error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // --- Request reset flow: { email } ---
  const resetEmail = process.env.ADMIN_RESET_EMAIL
  if (!resetEmail) {
    return res.status(503).json({ error: 'Password reset is not configured' })
  }

  // Zod validation — ensures email is a valid email format
  const parsed = validate(resetPasswordSchema, req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error })
  const { email } = parsed.data

  // Use timing-safe comparison to prevent email enumeration via timing
  const emailMatch = timingSafeEqual(email.trim().toLowerCase(), resetEmail.trim().toLowerCase())
  if (!emailMatch) {
    // Return same success message to prevent email enumeration
    return res.json({ success: true, message: 'If the email matches, a reset link has been generated.' })
  }

  try {
    // Generate a secure random reset token instead of deleting the password hash.
    // The password hash remains intact — no race condition window.
    const token = randomBytes(32).toString('hex')
    await kv.set(RESET_TOKEN_KEY, token, { ex: RESET_TOKEN_TTL })

    // Send password reset email if Resend is configured
    const resendApiKey = process.env.RESEND_API_KEY
    const siteUrl = process.env.SITE_URL || 'https://neuroklast.com'
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        const resetUrl = `${siteUrl}/admin?resetToken=${token}`
        
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@neuroklast.com',
          to: resetEmail,
          subject: 'Password Reset Request - NEUROKLAST Admin',
          html: `
            <h2>Password Reset Request</h2>
            <p>You have requested to reset your admin password.</p>
            <p>Click the link below to reset your password (expires in ${Math.floor(RESET_TOKEN_TTL / 60)} minutes):</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you did not request this reset, please ignore this email.</p>
            <p><strong>Security Note:</strong> This link can only be used once and will expire in ${Math.floor(RESET_TOKEN_TTL / 60)} minutes.</p>
          `,
        })
        
        console.log(`[SECURITY] Password reset email sent to ${resetEmail}`)
      } catch (emailError) {
        // Log email failure but still return success to prevent email enumeration
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
        console.error('[SECURITY] Failed to send reset email:', errorMessage)
        // Fall back to logging that a token was generated (without exposing the token itself)
        console.log(`[SECURITY] Password reset token generated (expires in ${RESET_TOKEN_TTL}s) - retrieve from KV: ${RESET_TOKEN_KEY}`)
      }
    } else {
      // No email service configured - log that token is available in KV
      console.log(`[SECURITY] Password reset token generated (expires in ${RESET_TOKEN_TTL}s) - retrieve from KV: ${RESET_TOKEN_KEY}`)
      console.log(`[SECURITY] Set RESEND_API_KEY environment variable to enable email delivery`)
    }

    return res.json({ success: true, message: 'If the email matches, a reset link has been generated.' })
  } catch (error) {
    console.error('Password reset error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
