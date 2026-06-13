import { useQuery } from '@tanstack/react-query'
import { getFilieres } from '../api/config'

export function useFilieres({ activeOnly = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ['filieres', activeOnly],
    queryFn: () => getFilieres(activeOnly ? { active: 'true' } : {}),
    staleTime: 5 * 60 * 1000,
  })
  const filieres = data?.data?.data ?? data?.data ?? []
  return { filieres, isLoading }
}
