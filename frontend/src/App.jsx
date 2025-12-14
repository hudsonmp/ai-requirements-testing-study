import { useState, useEffect, useCallback, useRef } from 'react'
import MarkdownEditor from './components/MarkdownEditor'
import NoVNCViewer from './components/NoVNCViewer'
import TreePanel from './components/TreePanel'

export default function App() {
  const [tree, setTree] = useState({ name: 'User Session', children: [] })
  const [notes, setNotes] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [participantMode, setParticipantMode] = useState(false)
  const [showNamePopup, setShowNamePopup] = useState(false)
  const [participantName, setParticipantName] = useState({ first: '', last: '' })
  const [participantNotes, setParticipantNotes] = useState('')
  const [participantTree, setParticipantTree] = useState({ name: 'User Session', children: [] })
  const [showParticipantTree, setShowParticipantTree] = useState(false)
  const wsRef = useRef(null)

  // Load saved state on startup
  useEffect(() => {
    fetch('http://localhost:8000/state')
      .then(res => res.json())
      .then(data => {
        if (data.tree) setTree(data.tree)
        if (data.notes) setNotes(data.notes)
      })
      .catch(err => console.error('[ERROR] Failed to load state:', err))
  }, [])

  // WebSocket connection
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws')
    socket.onopen = () => { wsRef.current = socket }
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'tree_update') {
          const newTree = JSON.parse(JSON.stringify(data.tree))
          setTree(newTree)
          // Also update participant tree if in participant mode
          setParticipantTree(newTree)
        }
      } catch (error) {
        console.error('[ERROR] WebSocket parse:', error)
      }
    }
    socket.onerror = (e) => console.error('[ERROR] WebSocket:', e)
    socket.onclose = () => { wsRef.current = null }
    return () => socket.close()
  }, [])

  // Send trigger event to backend (click or url_change)
  const sendTrigger = useCallback((trigger, screenshot = null) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN && (trigger === 'click' || trigger === 'url_change')) {
      ws.send(JSON.stringify({
        type: 'trigger',
        trigger,
        screenshot,
        timestamp: Date.now()
      }))
    }
  }, [])

  // Save notes to backend
  const handleNotesChange = useCallback((content) => {
    setNotes(content)
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'notes', content }))
    }
  }, [])

  // Save participant notes (separate from researcher notes)
  const handleParticipantNotesChange = useCallback((content) => {
    setParticipantNotes(content)
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'participant_notes', content }))
    }
  }, [])

  // Start participant session
  const startParticipantMode = async () => {
    if (!participantName.first.trim() || !participantName.last.trim()) return
    
    try {
      const res = await fetch('http://localhost:8000/start-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: participantName.first.trim(), 
          lastName: participantName.last.trim() 
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowNamePopup(false)
        setParticipantMode(true)
        setParticipantNotes('')
        setParticipantTree({ name: 'User Session', children: [] })
      }
    } catch (err) {
      console.error('[ERROR] Failed to start participant session:', err)
    }
  }

  // End participant session
  const endParticipantMode = async () => {
    try {
      await fetch('http://localhost:8000/end-participant', { method: 'POST' })
      setParticipantMode(false)
      setParticipantName({ first: '', last: '' })
      setParticipantNotes('')
      setShowParticipantTree(false)
    } catch (err) {
      console.error('[ERROR] Failed to end participant session:', err)
    }
  }

  return (
    <div style={styles.container}>
      {/* Name Popup Modal */}
      {showNamePopup && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <h2 style={styles.popupTitle}>Enter Participant Name</h2>
            <input
              type="text"
              placeholder="First Name"
              value={participantName.first}
              onChange={(e) => setParticipantName(p => ({ ...p, first: e.target.value }))}
              style={styles.input}
              autoFocus
            />
            <input
              type="text"
              placeholder="Last Name"
              value={participantName.last}
              onChange={(e) => setParticipantName(p => ({ ...p, last: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && startParticipantMode()}
              style={styles.input}
            />
            <div style={styles.popupButtons}>
              <button style={styles.cancelBtn} onClick={() => setShowNamePopup(false)}>
                Cancel
              </button>
              <button style={styles.startBtn} onClick={startParticipantMode}>
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Participant Tree View */}
      {showParticipantTree && (
        <div style={styles.treeOverlay}>
          <div style={styles.treeFullscreen}>
            <div style={styles.treeHeader}>
              <span>Your Interaction Flow</span>
              <button style={styles.closeTreeBtn} onClick={() => setShowParticipantTree(false)}>
                ✕ Close
              </button>
            </div>
            <div style={styles.treeContent}>
              <TreePanel tree={participantTree} />
            </div>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <h1 style={styles.title}>Requirements Analysis Tool</h1>
        <span style={styles.subtitle}>User Interaction Documentation Study</span>
        {participantMode ? (
          <>
            <button style={styles.viewTreeBtn} onClick={() => setShowParticipantTree(true)}>
              View Interactions
            </button>
            <button style={styles.participantActiveBtn} onClick={endParticipantMode}>
              End Session
            </button>
          </>
        ) : (
          <>
            <button 
              style={styles.focusBtn} 
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
            <button 
              style={styles.participantBtn} 
              onClick={() => setShowNamePopup(true)}
            >
              Participant Mode
            </button>
          </>
        )}
      </header>
      <main style={styles.main}>
        {participantMode ? (
          // Participant mode: notes on left (1/4), browser on right (3/4)
          <>
            <aside style={styles.participantLeftPanel}>
              <MarkdownEditor value={participantNotes} onChange={handleParticipantNotesChange} />
            </aside>
            <section style={styles.participantRightPanel}>
              <NoVNCViewer onTrigger={sendTrigger} />
            </section>
          </>
        ) : focusMode ? (
          <>
            <aside style={styles.halfPanel}>
              <MarkdownEditor value={notes} onChange={handleNotesChange} />
            </aside>
            <aside style={styles.halfPanel}>
              <TreePanel tree={tree} />
            </aside>
          </>
        ) : (
          <>
            <aside style={styles.leftPanel}>
              <MarkdownEditor value={notes} onChange={handleNotesChange} />
            </aside>
            <section style={styles.centerPanel}>
              <NoVNCViewer onTrigger={sendTrigger} />
            </section>
            <aside style={styles.rightPanel}>
              <TreePanel tree={tree} />
            </aside>
          </>
        )}
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
    color: '#666',
    flex: 1
  },
  focusBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    background: '#333',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  participantBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    background: '#1a5f7a',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  participantActiveBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    background: '#c94c4c',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  viewTreeBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    background: '#2e7d32',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
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
  },
  halfPanel: {
    width: '50%',
    borderRight: '1px solid #ccc',
    overflow: 'auto'
  },
  fullPanel: {
    width: '100%',
    background: '#000'
  },
  participantLeftPanel: {
    width: '25%',
    borderRight: '1px solid #ccc',
    overflow: 'auto'
  },
  participantRightPanel: {
    width: '75%',
    background: '#000'
  },
  treeOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  },
  treeFullscreen: {
    background: '#fff',
    width: '90vw',
    height: '90vh',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  treeHeader: {
    padding: '12px 20px',
    borderBottom: '1px solid #ccc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  closeTreeBtn: {
    padding: '6px 14px',
    fontSize: '12px',
    background: '#333',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  treeContent: {
    flex: 1,
    overflow: 'auto'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  },
  popup: {
    background: '#fff',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '300px'
  },
  popupTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'normal',
    textAlign: 'center',
    color: '#333'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: '"Times New Roman", Times, serif',
    outline: 'none'
  },
  popupButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px'
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: '12px',
    background: '#f5f5f5',
    border: '1px solid #ccc',
    color: '#333',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  startBtn: {
    padding: '8px 16px',
    fontSize: '12px',
    background: '#1a5f7a',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  }
}
