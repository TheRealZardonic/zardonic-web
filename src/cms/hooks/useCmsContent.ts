import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ContentResponse<T> {
  value: T | null
  source: 'draft' | 'published' | 'none'
}

interface UseCmsContentResult<T> {
  data: T | null
  isDraft: boolean
  isLoading: boolean
  error: Error | null
  save: (value: T, asDraft?: boolean) => Promise<void>
  publish: () => Promise<void>
  revert: () => Promise<void>
}

async function fetchContent<T>(key: string): Promise<ContentResponse<T>> {
  const params = new URLSearchParams({ key, draft: 'true' })
  const res = await fetch(`/api/cms/content?${params.toString()}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Failed to load content: ${res.status}`)
  return res.json() as Promise<ContentResponse<T>>
}

async function saveContent<T>(key: string, value: T, draft: boolean): Promise<void> {
  const res = await fetch('/api/cms/content', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, draft }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Save failed: ${res.status}`)
  }
}

async function publishContent(key: string, revert = false): Promise<void> {
  const res = await fetch('/api/cms/publish', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, revert }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Publish failed: ${res.status}`)
  }
}

export function useCmsContent<T>(key: string): UseCmsContentResult<T> {
  const queryClient = useQueryClient()
  const queryKey = ['cms-content', key]

  const { data: response, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchContent<T>(key),
    staleTime: 30_000,
    retry: 1,
  })

  const saveMutation = useMutation({
    mutationFn: ({ value, asDraft }: { value: T; asDraft: boolean }) =>
      saveContent(key, value, asDraft),
    onSuccess: (_, { asDraft }) => {
      void queryClient.invalidateQueries({ queryKey })
      toast.success(asDraft ? 'Entwurf gespeichert.' : 'Inhalt veröffentlicht.')
    },
    onError: (err: Error) => {
      toast.error(`Speichern fehlgeschlagen: ${err.message}`)
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => publishContent(key, false),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      toast.success('Inhalt veröffentlicht.')
    },
    onError: (err: Error) => {
      toast.error(`Veröffentlichen fehlgeschlagen: ${err.message}`)
    },
  })

  const revertMutation = useMutation({
    mutationFn: () => publishContent(key, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      toast.success('Entwurf zurückgesetzt.')
    },
    onError: (err: Error) => {
      toast.error(`Zurücksetzen fehlgeschlagen: ${err.message}`)
    },
  })

  return {
    data: response?.value ?? null,
    isDraft: response?.source === 'draft',
    isLoading,
    error: error instanceof Error ? error : null,
    save: (value: T, asDraft = true) => saveMutation.mutateAsync({ value, asDraft }),
    publish: () => publishMutation.mutateAsync(),
    revert: () => revertMutation.mutateAsync(),
  }
}
