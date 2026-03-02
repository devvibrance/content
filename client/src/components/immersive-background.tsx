import { useEffect, useState } from "react"

interface ImmersiveBackgroundProps {
  isEnabled: boolean
  backgroundUrl?: string
  brightness: number
  blur?: number
}

function isGifUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  // Check for .gif extension in regular URLs or image/gif MIME type in data URLs
  return lowerUrl.endsWith('.gif') || 
         lowerUrl.includes('.gif?') || 
         lowerUrl.includes('image/gif')
}

export function ImmersiveBackground({ 
  isEnabled, backgroundUrl, brightness, blur = 0 
}: ImmersiveBackgroundProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  
  const isGif = backgroundUrl ? isGifUrl(backgroundUrl) : false

  useEffect(() => {
    if (backgroundUrl) {
      // For GIFs, skip preloading and show immediately to ensure animation works
      if (isGifUrl(backgroundUrl)) {
        setImageLoaded(true)
        return
      }
      
      const img = new Image()
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setImageLoaded(false)
      img.src = backgroundUrl
    } else {
      setImageLoaded(false)
    }
  }, [backgroundUrl])

  if (!isEnabled || !backgroundUrl || !imageLoaded) {
    return null
  }

  const overlayOpacity = (100 - brightness) / 100

  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none" 
      style={{ willChange: 'opacity' }}
    >
      {isGif ? (
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: 'translate3d(0,0,0)',
            willChange: 'transform, filter',
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            transform: 'translate3d(0,0,0)',
            willChange: 'transform, filter',
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        />
      )}

      <div 
        className="absolute inset-0 bg-black transition-opacity duration-200" 
        style={{ 
          opacity: overlayOpacity,
          willChange: 'opacity'
        }} 
      />

      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
    </div>
  )
}
