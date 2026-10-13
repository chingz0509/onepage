import { useLayoutEffect, useRef, useState } from 'react'

/** Fit an unscaled editorial composition inside the available preview height. */
export function useWindowFit(compositionWidth?: number) {
  const contentRef = useRef<HTMLElement>(null)
  const [fitScale, setFitScale] = useState(1)
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const fit = () => setFitScale(Math.min(1,
      compositionWidth ? window.innerWidth / compositionWidth : 1,
      Math.max(1, window.innerHeight - 24) / Math.max(1, content.offsetHeight)))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(content)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [compositionWidth])
  return { contentRef, fitScale }
}
