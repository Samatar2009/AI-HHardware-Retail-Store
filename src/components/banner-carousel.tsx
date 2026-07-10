'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

interface Banner {
  id: string
  imageUrl: string
  linkUrl?: string | null
  altText: string
}

interface BannerCarouselProps {
  banners: Banner[]
  autoPlayMs?: number
}

function BannerCarousel({ banners, autoPlayMs = 5000 }: BannerCarouselProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), autoPlayMs)
    return () => clearInterval(timer)
  }, [banners.length, autoPlayMs])

  if (banners.length === 0) return null

  return (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg bg-stone-100">
      <div
        className="flex h-full transition-transform duration-500 ease-in-out motion-reduce:transition-none motion-reduce:duration-0"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner) => {
          const image = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner.imageUrl} alt={banner.altText} className="h-full w-full shrink-0 object-cover" />
          )
          return (
            <div key={banner.id} className="h-full w-full shrink-0">
              {banner.linkUrl ? <Link href={banner.linkUrl}>{image}</Link> : image}
            </div>
          )
        })}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'size-2 rounded-full transition-colors duration-150 motion-reduce:transition-none motion-reduce:duration-0',
                i === index ? 'bg-orange-500' : 'bg-white/70 hover:bg-white'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { BannerCarousel }
