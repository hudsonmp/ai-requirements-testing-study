import { useState, useEffect, useRef, useCallback } from 'react'
import MarkdownEditor from './components/MarkdownEditor'
import NoVNCViewer from './components/NoVNCViewer'
import TreePanel from './components/TreePanel'

const SCROLL_DELAY = 500

export default function App() {
  const [ws, setWs] = useState(null)
  const [tree, setTree] = useState({ name: 'User Session', children: [] })
  const [notes, setNotes] = useState('')
  const scrollTimeout = useRef(null)

  // WebSocket connection
  useEffect(() => {
    console.log('[App] Connecting to WebSocket...')
    const socket = new WebSocket('ws://localhost:8000/ws')
    socket.onopen = () => {
      console.log('[App] ✓ WebSocket connected')
      setWs(socket)
    }
    socket.onmessage = (e) => {
      console.log('[App] 📩 Message from backend:', e.data)
      try {
        const data = JSON.parse(e.data)
        console.log('[App] Parsed data type:', data.type)
        
        if (data.type === 'ack') {
          console.log('[App] ✓ Backend acknowledged trigger:', data.trigger)
        } else if (data.type === 'tree_update') {
          console.log('[App] 🌲 Tree update received!')
          console.log('[App] Tree name:', data.tree?.name)
          console.log('[App] Tree children count:', data.tree?.children?.length)
          console.log('[App] Full tree:', JSON.stringify(data.tree, null, 2))
          // Force new object reference to trigger React re-render
          const newTree = JSON.parse(JSON.stringify(data.tree))
          setTree(newTree)
          console.log('[App] ✓ Tree state updated')
        }
      } catch (error) {
        console.error('[App] ✗ Failed to parse WebSocket message:', error, e.data)
      }
    }
    socket.onerror = (e) => console.error('[App] WebSocket error:', e)
    socket.onclose = () => console.log('[App] WebSocket closed')
    return () => socket.close()
  }, [])

  // Send trigger event to backend
  const sendTrigger = useCallback((trigger, screenshot = null) => {
    console.log('[App] sendTrigger called:', trigger, 'WS ready:', ws?.readyState === WebSocket.OPEN)
    if (ws?.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'trigger',
        trigger,
        url: window.location.href,
        screenshot,
        timestamp: Date.now()
      }
      console.log('[App] Sending to backend:', payload)
      ws.send(JSON.stringify(payload))
    } else {
      console.error('[App] WebSocket not ready! State:', ws?.readyState)
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
          <TreePanel tree={tree} />
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

