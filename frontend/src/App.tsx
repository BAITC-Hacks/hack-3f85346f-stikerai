import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('Проверяем подключение…')

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    let active = true
    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal })
        if (!response.ok) throw new Error('API unavailable')
        const data = await response.json()
        if (data.status !== 'ok') throw new Error('Unexpected health response')
        if (active) setStatus('Соединение с сервером установлено')
      } catch {
        if (active) setStatus('Сервер недоступен. Попробуйте обновить страницу.')
      } finally {
        window.clearTimeout(timeout)
      }
    }
    void checkHealth()
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return (
    <main>
      <p className="eyebrow">STIKERAI</p>
      <h1>Начинаем создавать.</h1>
      <p>Здесь появится ваше приложение.</p>
      <p className="status" role="status">{status}</p>
    </main>
  )
}
