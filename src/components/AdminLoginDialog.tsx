import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AdminLoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'login' | 'setup'
  onLogin?: (password: string, totpCode?: string) => Promise<{ success: boolean; totpRequired?: boolean }>
  onSetPassword: (password: string) => Promise<void>
}

export default function AdminLoginDialog({ open, onOpenChange, mode, onLogin, onSetPassword }: AdminLoginDialogProps) {
  const isLoginMode = mode === 'login'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [totpStep, setTotpStep] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    if (!onLogin) {
      setError('Login handler not provided')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const result = await onLogin(password, totpStep ? totpCode : undefined)
      if (result.success) {
        toast.success('ADMIN ACCESS GRANTED', {
          description: 'Edit mode is now available'
        })
        setPassword('')
        setTotpCode('')
        setTotpStep(false)
        onOpenChange(false)
      } else if (result.totpRequired) {
        // Password was correct, need TOTP code
        setTotpStep(true)
        setError('')
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await onSetPassword(password)
      toast.success('ADMIN PASSWORD SET', {
        description: 'You can now use this password to access edit mode'
      })
      setPassword('')
      setConfirmPassword('')
      onOpenChange(false)
    } catch {
      setError('Failed to set password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPassword('')
      setConfirmPassword('')
      setTotpCode('')
      setTotpStep(false)
      setError('')
      setShowPassword(false)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-admin-ui="true" className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-primary">
            {isLoginMode
              ? (totpStep ? 'TWO-FACTOR AUTHENTICATION' : 'ADMIN LOGIN')
              : 'SET ADMIN PASSWORD'
            }
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isLoginMode
              ? (totpStep
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Enter your admin password to access edit mode.'
              )
              : 'Set a password to protect the admin edit mode. You will need this password to edit the page content.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={isLoginMode ? handleLogin : handleSetPassword} className="space-y-4">
          {isLoginMode && totpStep ? (
            <div className="space-y-2">
              <Label htmlFor="totp-code">Authenticator Code</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="000000"
                className="bg-secondary border-input text-center tracking-widest text-lg"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder={isLoginMode ? 'Enter password...' : 'Choose a password (min. 8 characters)...'}
                  className="bg-secondary border-input pr-10"
                  autoFocus
                  autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
          )}

          {!isLoginMode && (
            <div className="space-y-2">
              <Label htmlFor="admin-confirm-password">Confirm Password</Label>
              <Input
                id="admin-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                placeholder="Confirm password..."
                className="bg-secondary border-input"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {isLoginMode && totpStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setTotpStep(false); setTotpCode(''); setError('') }}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading || (!totpStep && !password.trim()) || (totpStep && totpCode.length !== 6) || (!isLoginMode && !confirmPassword.trim())}
            >
              {isLoading ? 'Processing...' : (totpStep ? 'Verify' : (isLoginMode ? 'Login' : 'Set Password'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
