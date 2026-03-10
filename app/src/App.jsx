import './App.css'
import PhraseForm from './PhraseForm'
import SearchBar from './SearchBar'

function App() {
  return (
    <>
      <header className="app-header">
        <h1>Cloudflare Workers Demo</h1>
        <p>Workers + D1 + Cache API + Rate Limit</p>
        <a href='https://jschile.org' target='_blank' rel='noopener noreferrer'>
          jschile.org
        </a>
      </header>

      <section>
        <p className="section-title">Guardar tu frase aquí:</p>
        <PhraseForm />
      </section>

      <hr className="divider" />

      <section>
        <p className="section-title">Busca tu frase aquí:</p>
        <SearchBar />
      </section>
    </>
  )
}

export default App
