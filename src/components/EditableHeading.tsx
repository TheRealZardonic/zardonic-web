import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'

interface EditableHeadingProps {
  text: string
  defaultText: string
  editMode: boolean
  onChange: (value: string) => void
  className?: string
  dataText?: string
  glitchEnabled?: boolean
  glitchIntervalMs?: number
  glitchDurationMs?: number
}

/**
 * Editable heading that shows custom text with periodic glitch
 * flashing of the original default text.
 */
export default function EditableHeading({
  text,
  defaultText,
  editMode,
  onChange,
  className = '',
  dataText,
  glitchEnabled = true,
  glitchIntervalMs,
  glitchDurationMs,
}: EditableHeadingProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const displayText = text || defaultText
  const isCustom = text && text !== defaultText

  // Periodic glitch flash showing original text
  useEffect(() => {
    if (!isCustom || !glitchEnabled) return
    const duration = glitchDurationMs ?? 120
    const baseInterval = glitchIntervalMs ?? 8000
    const interval = setInterval(() => {
      setShowOriginal(true)
      setTimeout(() => setShowOriginal(false), duration)
    }, baseInterval + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [isCustom, glitchEnabled, glitchIntervalMs, glitchDurationMs])

  if (editMode) {
    return (
      <div className="inline-flex items-center gap-2">
        <Input
          value={text || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultText}
          className="bg-transparent border-border font-mono text-2xl md:text-4xl uppercase tracking-tighter w-64"
        />
      </div>
    )
  }

  return (
    <span className="relative inline-block" data-text={dataText || displayText}>
      <AnimatePresence mode="wait">
        {showOriginal && isCustom ? (
          <motion.span
            key="original"
            initial={{ opacity: 0, filter: 'blur(2px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(2px)' }}
            transition={{ duration: 0.06 }}
            className={className}
            style={{ color: 'inherit' }}
          >
            {defaultText}
          </motion.span>
        ) : (
          <motion.span
            key="custom"
            initial={{ opacity: 1 }}
            className={className}
          >
            {displayText}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
