import { motion } from 'framer-motion'

interface CyberCloseButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

/** Cyberpunk-styled close button used across all overlays instead of plain X */
export default function CyberCloseButton({ onClick, label = 'CLOSE', className = '' }: CyberCloseButtonProps) {
  return (
    <motion.button
      className={`group relative flex items-center gap-2 px-3 py-1.5 border border-primary/40 bg-black/60 hover:bg-primary/20 hover:border-primary transition-all duration-200 font-mono text-[10px] tracking-widest text-primary/70 hover:text-primary z-[60] flex-shrink-0 ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Close"
    >
      <span className="relative">
        <span className="inline-block w-2 h-[1px] bg-primary/60 group-hover:bg-primary rotate-45 absolute top-1/2 left-0" />
        <span className="inline-block w-2 h-[1px] bg-primary/60 group-hover:bg-primary -rotate-45 absolute top-1/2 left-0" />
        <span className="w-2 inline-block" />
      </span>
      <span>{label}</span>
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-primary/50" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-primary/50" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-primary/50" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-primary/50" />
    </motion.button>
  )
}
