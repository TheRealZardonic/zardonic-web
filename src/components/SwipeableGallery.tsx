import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface SwipeableGalleryProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export const SwipeableGallery = memo(function SwipeableGallery({ images, initialIndex, onClose }: SwipeableGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [[page, direction], setPage] = useState([initialIndex, 0])

  const paginate = useCallback((newDirection: number) => {
    const newIndex = (currentIndex + newDirection + images.length) % images.length
    setCurrentIndex(newIndex)
    setPage([newIndex, newDirection])
  }, [currentIndex, images.length])

  const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    const swipe = swipeConfidenceThreshold(offset.x, velocity.x)

    if (swipe < -swipeConfidenceTolerance) {
      paginate(1)
    } else if (swipe > swipeConfidenceTolerance) {
      paginate(-1)
    }
  }, [paginate])

  const handleDotClick = useCallback((index: number) => {
    const newDirection = index > currentIndex ? 1 : -1
    setCurrentIndex(index)
    setPage([index, newDirection])
  }, [currentIndex])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-foreground hover:text-accent z-10"
          onClick={onClose}
        >
          <X className="w-8 h-8" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-foreground hover:text-accent z-10"
          onClick={() => paginate(-1)}
        >
          <CaretLeft className="w-12 h-12" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-foreground hover:text-accent z-10"
          onClick={() => paginate(1)}
        >
          <CaretRight className="w-12 h-12" />
        </Button>

        <div className="relative w-full max-w-5xl h-[80vh] overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={page}
              src={images[currentIndex]}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="absolute w-full h-full object-contain cursor-grab active:cursor-grabbing"
            />
          </AnimatePresence>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <div
              key={index}
              className={`swipe-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div>
      </div>
    </>
  )
})

const swipeConfidenceTolerance = 10000
const swipeConfidenceThreshold = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity
}

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }
  },
}

export default SwipeableGallery
