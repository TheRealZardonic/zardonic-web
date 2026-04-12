import React from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import type { Release } from '@/lib/app-types'

interface ReleasesSwipeLayoutProps {
  releases: Release[]
  renderCard: (release: Release, index: number) => React.ReactNode
}

export function ReleasesSwipeLayout({ releases, renderCard }: ReleasesSwipeLayoutProps) {
  const [api, setApi] = React.useState<import('@/components/ui/carousel').CarouselApi>()
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(true)

  React.useEffect(() => {
    if (!api) return
    const update = () => {
      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }
    update()
    api.on('select', update)
    api.on('reInit', update)
    return () => { api.off('select', update) }
  }, [api])

  return (
    <div className="relative">
      <Carousel
        opts={{ align: 'start', loop: false }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {releases.map((release, index) => (
            <CarouselItem
              key={release.id}
              className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
            >
              {renderCard(release, index)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={() => api?.scrollPrev()}
          disabled={!canScrollPrev}
          className="p-2 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
          aria-label="Previous releases"
        >
          <CaretLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => api?.scrollNext()}
          disabled={!canScrollNext}
          className="p-2 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
          aria-label="Next releases"
        >
          <CaretRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default ReleasesSwipeLayout
