import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">C123 Scoring</h1>
        <div className="connection-status connection-status--disconnected">
          Disconnected
        </div>
      </header>
      <main className="main">
        <p className="placeholder">
          Penalty scoring application for canoe slalom timing
        </p>
      </main>
      <footer className="footer">
        <span className="footer-text">
          C123 Scoring v0.1.0 &bull; Open Canoe Timing
        </span>
      </footer>
    </div>
  )
}

export default App
