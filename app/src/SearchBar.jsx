import { useState, useEffect, useRef } from 'react'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [cacheStatus, setCacheStatus] = useState(null) // 'HIT' | 'MISS' | null
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [searched, setSearched] = useState(false)

  // Rate limit state
  const [remaining, setRemaining] = useState(null)
  const [resetAt, setResetAt] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!resetAt) return
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [resetAt])

  useEffect(() => {
    clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setCacheStatus(null)
      setErrorMsg(null)
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(() => search(query.trim()), 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function search(q) {
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const xCache = res.headers.get('X-Cache')
      const xRemaining = res.headers.get('X-RateLimit-Remaining')
      const xReset = res.headers.get('X-RateLimit-Reset')

      if (xRemaining !== null) setRemaining(Number(xRemaining))
      if (xReset !== null) setResetAt(Number(xReset))

      setCacheStatus(xCache)
      setSearched(true)

      if (res.status === 429) {
        const data = await res.json()
        setErrorMsg(data.message ?? 'Rate limit excedido')
        setResults([])
        return
      }

      if (!res.ok) {
        setErrorMsg('Error al buscar')
        setResults([])
        return
      }

      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setErrorMsg('No se pudo conectar con la API')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Formato mm:ss para el timer
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="search-bar">
      <div className="search-input-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar frases…"
        />
      </div>

      {/* Widget de rate limit: se muestra en cuanto hay info del servidor */}
      {remaining !== null && (
        <div className={`rate-limit-widget ${remaining === 0 ? 'exhausted' : remaining <= 3 ? 'warning' : ''}` }>
          <div className="rl-attempts">
            <span className="rl-label">Búsquedas restantes</span>
            <span className="rl-count">{remaining}</span>
          </div>
          <div className="rl-timer">
            <span className="rl-label">Resetea en</span>
            <span className="rl-countdown">{mins}:{secs}</span>
          </div>
        </div>
      )}

      {/* Indicadores de búsqueda */}
      {searched && !errorMsg && (
        <div className="search-meta">
          {loading ? (
            <span>Buscando…</span>
          ) : (
            <>
              <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
              {cacheStatus && (
                <span className={`cache-badge ${cacheStatus.toLowerCase()}`}>
                  Cache {cacheStatus}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Error de rate limit */}
      {errorMsg && (
        <p className="rate-limit-error">{errorMsg}</p>
      )}

      {/* Lista de resultados */}
      {!errorMsg && searched && !loading && (
        results.length > 0 ? (
          <ul className="results-list">
            {results.map((item) => (
              <li key={item.id}>
                <div>{item.text}</div>
                <div className="phrase-date">{item.created_at}</div>
              </li>
            ))}
          </ul>
        ) : (
          query.trim() && (
            <p className="no-results">Sin resultados para «{query}»</p>
          )
        )
      )}
    </div>
  )
}
