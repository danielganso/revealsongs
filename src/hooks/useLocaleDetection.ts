import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export function useLocaleDetection() {
  const router = useRouter()
  const [isDetecting, setIsDetecting] = useState(false)

  useEffect(() => {
    // Check if user has a saved preference
    const savedLocale = localStorage.getItem('user-preferred-locale')
    
    if (savedLocale && savedLocale !== router.locale && router.locales?.includes(savedLocale)) {
      // Redirect to saved preference
      const currentPath = router.asPath
      router.push(currentPath, currentPath, { 
        locale: savedLocale,
        shallow: false 
      })
    }
    
    setIsDetecting(false)
  }, [router])

  const changeLocale = async (locale: string) => {
    // Save user preference
    localStorage.setItem('user-preferred-locale', locale)
    
    const currentPath = router.asPath
    await router.push(currentPath, currentPath, { 
      locale,
      shallow: false 
    })
  }

  return {
    isDetecting,
    currentLocale: router.locale,
    availableLocales: router.locales || [],
    changeLocale,
  }
}