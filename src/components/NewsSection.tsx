import { motion, useInView } from 'framer-motion'
import { Plus, Trash, PencilSimple, ArrowSquareOut } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ChromaticText } from '@/components/ChromaticText'
import ProgressiveImage from '@/components/ProgressiveImage'
import { useState, useRef, useEffect } from 'react'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { format } from 'date-fns'
import type { NewsItem, SectionLabels } from '@/lib/types'
import {
  TITLE_TYPING_SPEED_MS,
  TITLE_TYPING_START_DELAY_MS,
  SECTION_GLITCH_PROBABILITY,
  SECTION_GLITCH_DURATION_MS,
  SECTION_GLITCH_INTERVAL_MS,
} from '@/lib/config'

interface NewsSectionProps {
  news?: NewsItem[]
  editMode?: boolean
  onUpdate?: (news: NewsItem[]) => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

const INITIAL_VISIBLE_COUNT = 3

export default function NewsSection({ news = [], editMode, onUpdate, sectionLabels, onLabelChange }: NewsSectionProps) {
  const [glitchActive, setGlitchActive] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const titleText = sectionLabels?.news || 'NEWS'
  const headingPrefix = sectionLabels?.headingPrefix ?? '>'
  const { displayedText: displayedTitle } = useTypingEffect(
    isInView ? titleText : '',
    TITLE_TYPING_SPEED_MS,
    TITLE_TYPING_START_DELAY_MS
  )

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > SECTION_GLITCH_PROBABILITY) {
        setGlitchActive(true)
        setTimeout(() => setGlitchActive(false), SECTION_GLITCH_DURATION_MS)
      }
    }, SECTION_GLITCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const sortedNews = [...news].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const visibleNews = showAll || editMode ? sortedNews : sortedNews.slice(0, INITIAL_VISIBLE_COUNT)
  const hasMore = sortedNews.length > INITIAL_VISIBLE_COUNT

  const handleSave = (item: NewsItem) => {
    if (!onUpdate) return
    const existing = news.find(n => n.id === item.id)
    if (existing) {
      onUpdate(news.map(n => n.id === item.id ? item : n))
    } else {
      onUpdate([...news, item])
    }
    setEditingItem(null)
    setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    if (!onUpdate) return
    onUpdate(news.filter(n => n.id !== id))
  }

  if (!editMode && (!news || news.length === 0)) return null

  return (
    <section ref={sectionRef} className="py-24 px-4 bg-gradient-to-b from-secondary/5 via-background to-background" id="news">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <motion.h2
            className={`text-4xl md:text-5xl lg:text-6xl font-bold font-mono scanline-text dot-matrix-text ${glitchActive ? 'glitch-text-effect' : ''}`}
            data-text={`${headingPrefix} ${displayedTitle}`}
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6 }}
            style={{
              textShadow: '0 0 6px oklch(1 0 0 / 0.5), 0 0 12px oklch(0.50 0.22 25 / 0.3), 0 0 18px oklch(0.50 0.22 25 / 0.2)'
            }}
          >
            <ChromaticText intensity={1.5}>
              {headingPrefix} {displayedTitle}
            </ChromaticText>
            <span className="animate-pulse">_</span>
          </motion.h2>
          {editMode && (
            <div className="flex gap-2 items-center">
              {onLabelChange && (
                <input
                  type="text"
                  value={sectionLabels?.news || ''}
                  onChange={(e) => onLabelChange('news', e.target.value)}
                  placeholder="NEWS"
                  className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-32 focus:outline-none focus:border-primary"
                />
              )}
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-primary hover:bg-accent active:scale-95 transition-transform touch-manipulation"
              >
                <Plus className="mr-0 md:mr-2" size={20} />
                <span className="hidden md:inline">Add News</span>
              </Button>
            </div>
          )}
        </div>

        <Separator className="bg-gradient-to-r from-primary via-primary/50 to-transparent mb-12 h-0.5" />

        <div className="space-y-4">
          {visibleNews.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="border border-border hover:border-primary/50 bg-card/50 p-4 md:p-5 transition-all duration-300 hud-element hud-corner group"
            >
              <span className="corner-bl"></span>
              <span className="corner-br"></span>
              <div className="flex flex-col">
                <div className="font-mono text-[10px] text-primary/60 tracking-wider whitespace-nowrap flex-shrink-0 mb-3">
                  {(() => {
                    if (!item.date) return '---'
                    const d = new Date(item.date)
                    // Check if it's a valid date
                    if (isNaN(d.getTime())) {
                      // If date is in YYYY-MM format, show just month and year
                      if (/^\d{4}-\d{2}$/.test(item.date)) {
                        const [year, month] = item.date.split('-')
                        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
                        return `${monthNames[parseInt(month) - 1]} ${year}`
                      }
                      return item.date
                    }
                    return format(d, 'dd.MM.yyyy')
                  })()}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {item.photo && (
                    <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28">
                      <ProgressiveImage 
                        src={item.photo} 
                        alt={item.text}
                        className="w-full h-full object-cover rounded-sm border border-primary/20"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed">{item.text}</p>
                    {item.details && (
                      <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">{item.details}</p>
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary mt-2 font-mono tracking-wider transition-colors"
                      >
                        <ArrowSquareOut size={12} />
                        LINK
                      </a>
                    )}
                  </div>
                  {editMode && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {sortedNews.length === 0 && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-muted-foreground text-lg">No news yet.</p>
          </motion.div>
        )}

        {!editMode && hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="border-primary/30 hover:bg-primary/10 hover:border-primary transition-all"
            >
              {showAll ? 'Show Less' : `Show More (${sortedNews.length - INITIAL_VISIBLE_COUNT} more)`}
            </Button>
          </div>
        )}
      </div>

      {(editingItem || isAdding) && (
        <NewsEditDialog
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setEditingItem(null); setIsAdding(false) }}
        />
      )}
    </section>
  )
}

function NewsEditDialog({ item, onSave, onClose }: {
  item: NewsItem | null
  onSave: (item: NewsItem) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState<NewsItem>(
    item || { id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, date: new Date().toISOString().slice(0, 7), text: '' }
  )
  const [dateType, setDateType] = useState<'month' | 'date'>(() => {
    // Determine initial date type based on existing date format
    if (item?.date && /^\d{4}-\d{2}$/.test(item.date)) return 'month'
    return 'date'
  })

  const handleDateTypeChange = (newType: 'month' | 'date') => {
    setDateType(newType)
    // Convert date format when switching
    if (newType === 'month' && formData.date) {
      // Convert YYYY-MM-DD to YYYY-MM
      setFormData({ ...formData, date: formData.date.slice(0, 7) })
    } else if (newType === 'date' && formData.date) {
      // If we only have YYYY-MM, append -01 for first day of month
      if (formData.date.length === 7) {
        setFormData({ ...formData, date: `${formData.date}-01` })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-card border border-primary/30 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <h3 className="font-mono text-sm text-primary tracking-wider">{item ? 'EDIT NEWS' : 'ADD NEWS'}</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px]">Date Format</Label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => handleDateTypeChange('month')}
                className={`px-3 py-1 text-[10px] font-mono border transition-colors ${
                  dateType === 'month'
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                MONTH/YEAR
              </button>
              <button
                onClick={() => handleDateTypeChange('date')}
                className={`px-3 py-1 text-[10px] font-mono border transition-colors ${
                  dateType === 'date'
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                FULL DATE
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[10px]">{dateType === 'month' ? 'Month' : 'Date'}</Label>
            <Input
              type={dateType}
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Text</Label>
            <Input
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="text-xs"
              placeholder="News headline..."
            />
          </div>
          <div>
            <Label className="text-[10px]">Details (optional)</Label>
            <textarea
              value={formData.details || ''}
              onChange={(e) => setFormData({ ...formData, details: e.target.value || undefined })}
              className="flex w-full rounded-sm border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] resize-y"
              rows={3}
              placeholder="Additional details..."
            />
          </div>
          <div>
            <Label className="text-[10px]">Image URL (optional)</Label>
            <Input
              value={formData.photo || ''}
              onChange={(e) => setFormData({ ...formData, photo: e.target.value || undefined })}
              className="text-xs"
              placeholder="https://... or Google Drive link"
            />
            {formData.photo && (
              <div className="mt-2 w-24 h-24">
                <ProgressiveImage 
                  src={formData.photo} 
                  alt="Preview"
                  className="w-full h-full object-cover rounded-sm border border-primary/20"
                />
              </div>
            )}
          </div>
          <div>
            <Label className="text-[10px]">Link (optional)</Label>
            <Input
              value={formData.link || ''}
              onChange={(e) => setFormData({ ...formData, link: e.target.value || undefined })}
              className="text-xs"
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(formData)} className="flex-1">Save</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </div>
  )
}
