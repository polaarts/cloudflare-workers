import { useState } from 'react'

export default function PhraseForm() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('¡Frase guardada en D1!')
        setText('')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Error al guardar')
      }
    } catch {
      setStatus('error')
      setMessage('No se pudo conectar con la API')
    }
  }

  return (
    <form className="phrase-form" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe una frase, cita o cualquier texto…"
        disabled={status === 'loading'}
      />
      <button type="submit" disabled={status === 'loading' || !text.trim()}>
        {status === 'loading' ? 'Guardando…' : 'Enviar frase'}
      </button>
      {message && (
        <p className={`feedback ${status === 'success' ? 'success' : 'error'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
