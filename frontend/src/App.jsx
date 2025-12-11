import { useState, useEffect, useRef, useCallback } from 'react'
import MarkdownEditor from './components/MarkdownEditor'
import NoVNCViewer from './components/NoVNCViewer'
import GraphvizPanel from './components/GraphvizPanel'

const SCROLL_DELAY = 500

export default function App() {
  const [ws, setWs] = useState(null)
  const [dot, setDot] = useState('digraph G { "Start" }')
  const [notes, setNotes] = useState('')
  const scrollTimeout = useRef(null)

  // WebSocket connection
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws')
    socket.onopen = () => console.log('WebSocket connected')
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'graph_update') setDot(data.dot)
    }
    socket.onerror = (e) => console.error('WebSocket error:', e)
    setWs(socket)
    return () => socket.close()
  }, [])

  // Send trigger event to backend
  const sendTrigger = useCallback((trigger, screenshot = null) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'trigger',
        trigger,
        url: window.location.href,
        screenshot,
        timestamp: Date.now()
      }))
    }
  }, [ws])

  // Handle scroll with 500ms delay
  const handleScroll = useCallback(() => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => sendTrigger('scroll'), SCROLL_DELAY)
  }, [sendTrigger])

  // Save notes to backend
  const handleNotesChange = useCallback((content) => {
    setNotes(content)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'notes', content }))
    }
  }, [ws])

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Requirements Analysis Tool</h1>
        <span style={styles.subtitle}>User Interaction Documentation Study</span>
      </header>
      <main style={styles.main}>
        <aside style={styles.leftPanel}>
          <MarkdownEditor value={notes} onChange={handleNotesChange} />
        </aside>
        <section style={styles.centerPanel}>
          <NoVNCViewer onTrigger={sendTrigger} />
        </section>
        <aside style={styles.rightPanel}>
          <GraphvizPanel dot={dot} />
        </aside>
      </main>
    </div>
  )
}

const styles = {
  container: {
    fontFamily: '"Times New Roman", Times, serif',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#fafafa',
    color: '#1a1a1a'
  },
  header: {
    padding: '12px 24px',
    borderBottom: '1px solid #ccc',
    background: '#fff',
    display: 'flex',
    alignItems: 'baseline',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'normal'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666'
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  leftPanel: {
    width: '16.67%',
    borderRight: '1px solid #ccc',
    overflow: 'auto'
  },
  centerPanel: {
    width: '66.66%',
    background: '#000'
  },
  rightPanel: {
    width: '16.67%',
    borderLeft: '1px solid #ccc',
    overflow: 'auto'
  }
}

