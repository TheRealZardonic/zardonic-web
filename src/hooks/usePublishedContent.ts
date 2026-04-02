import { useQuery } from '@tanstack/react-query'

interface ContentResponse<T> {
  value: T | null
  source: 'draft' | 'published' | 'none'
}

export function usePublishedContent<T>(key: string, fallback: T): T {
  const { data } = useQuery({
    queryKey: ['cms-published', key],
    queryFn: async (): Promise<ContentResponse<T>> => {
      const params = new URLSearchParams({ key, draft: 'false' })
      const res = await fetch(`/api/cms/content?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) return { value: null, source: 'none' }
      return res.json() as Promise<ContentResponse<T>>
    },
    staleTime: 5 * 60_000, // 5 minutes
    retry: 1,
  })

  return data?.value ?? fallback
}
