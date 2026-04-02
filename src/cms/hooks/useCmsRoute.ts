import { useState, useEffect } from 'react'

function getRouteFromHash(hash: string): string {
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  return path || 'cms'
}

export function useCmsRoute(): [string, (route: string) => void] {
  const [route, setRoute] = useState<string>(() =>
    getRouteFromHash(window.location.hash),
  )

  useEffect(() => {
    function onHashChange() {
      setRoute(getRouteFromHash(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (newRoute: string) => {
    window.location.hash = newRoute
  }

  return [route, navigate]
}
