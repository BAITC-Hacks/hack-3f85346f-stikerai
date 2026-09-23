export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15000)
  try {
    const response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'stikerai' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) throw new ApiError(data.detail?.code ?? 'HTTP_ERROR', data.detail?.message ?? 'Не удалось выполнить запрос.')
    return data as T
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof ApiError) throw error
    throw new ApiError('NETWORK_ERROR', 'Нет ответа сервера. Проверьте подключение и повторите запрос.')
  }
}
