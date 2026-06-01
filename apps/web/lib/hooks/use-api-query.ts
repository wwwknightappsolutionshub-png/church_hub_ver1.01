import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';

export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<T, AxiosError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, AxiosError>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<T>(url);
      return data;
    },
    retry: 1,
    staleTime: 30_000,
    ...options,
  });
}

export function useApiMutation<TBody, TResult>(
  method: 'post' | 'patch' | 'put' | 'delete',
  url: string | ((body: TBody) => string),
) {
  return async (body?: TBody): Promise<TResult> => {
    const endpoint = typeof url === 'function' ? url(body as TBody) : url;
    const { data } = await api[method]<TResult>(endpoint, body);
    return data;
  };
}
