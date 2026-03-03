import { useCallback, useState, useEffect, useRef } from 'react'
import { apiUrl } from '../api'

const VNC_URL = 'http://localhost:6080/vnc.html?autoconnect=true&resize=remote&password=password'
const CHANGE_CHECK_INTERVAL = 2000 // Check for URL/content changes every 2s

/**
 * Browser-in-browser via noVNC iframe.
 * Triggers only on clicks and URL changes.
 */
export default function NoVNCViewer({ onTrigger }) {
  const [status, setStatus] = useState('Ready')
  const [autoDetect, setAutoDetect] = useState(false)
  const [lastActivity, setLastActivity] = useState(null)
  const [lastUrlBarHash, setLastUrlBarHash] = useState('')
  const [lastScreenHash, setLastScreenHash] = useState('')
  const changeCheckInterval = useRef(null)

  // Check for changes - triggers on clicks or URL bar changes
  const checkForChanges = useCallback(async (triggerType = 'click') => {
    try {
      const response = await fetch(apiUrl('/check-changes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastUrlBarHash, lastScreenHash })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.changed) {
          setLastScreenHash(data.screenHash || lastScreenHash)
          setLastUrlBarHash(data.urlBarHash || lastUrlBarHash)
          
          // Determine actual trigger type
          const actualTrigger = data.urlChanged ? 'url_change' : triggerType
          setLastActivity(actualTrigger)
          
          // Trigger Gemini on clicks OR URL changes
          if (triggerType === 'click' || data.urlChanged) {
            onTrigger(actualTrigger, data.screenshot)
          }
        }
      }
    } catch (error) {
      console.error('[NoVNC] Change detection failed:', error)
    }
  }, [lastUrlBarHash, lastScreenHash, onTrigger])

  // Handle click on iframe container - triggers Gemini
  const handleContainerClick = useCallback(() => {
    setLastActivity('click')
    setTimeout(() => checkForChanges('click'), 500)
  }, [checkForChanges])

  // Auto-detect URL changes (only triggers Gemini if URL bar changed)
  useEffect(() => {
    if (autoDetect) {
      changeCheckInterval.current = setInterval(() => {
        checkForChanges('auto')
      }, CHANGE_CHECK_INTERVAL)
    }
    return () => {
      if (changeCheckInterval.current) {
        clearInterval(changeCheckInterval.current)
      }
    }
  }, [autoDetect, checkForChanges])

  // Manual capture button - force capture and send to Gemini automatically
  const handleCapture = useCallback(() => {
    setLastActivity('capturing...')
    fetch(apiUrl('/force-capture'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLastActivity('manual')
          console.log('[NoVNC] ✓ Capture complete, Gemini analyzing')
        } else {
          setLastActivity('error')
          console.error('[NoVNC] Capture failed:', data.error)
        }
      })
      .catch(err => {
        setLastActivity('error')
        console.error('[NoVNC] Manual capture failed:', err)
      })
  }, [])

  const handleLoad = () => {
    setStatus('Connected')
  }

  const handleError = () => {
    setStatus('Connection failed - is Docker running?')
  }

  const toggleAutoDetect = () => {
    setAutoDetect(prev => !prev)
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Browser Session</span>
        <span style={styles.status}>{status}</span>
        {lastActivity && <span style={styles.activity}>Last: {lastActivity}</span>}
        <button 
          style={{...styles.captureBtn, background: autoDetect ? '#2a5' : '#333'}} 
          onClick={toggleAutoDetect}
        >
          {autoDetect ? 'Auto-Detect: ON' : 'Auto-Detect: OFF'}
        </button>
        <button style={styles.captureBtn} onClick={handleCapture}>
          Capture
        </button>
      </div>
      <div 
        style={styles.iframeWrapper}
        onClick={handleContainerClick}
      >
        <iframe
          src={VNC_URL}
          style={styles.viewer}
          onLoad={handleLoad}
          onError={handleError}
          title="VNC Session"
        />
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#000'
  },
  header: {
    padding: '8px 12px',
    background: '#1a1a1a',
    color: '#fff',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  status: {
    flex: 1,
    fontSize: '11px',
    color: '#888'
  },
  activity: {
    fontSize: '10px',
    color: '#6a6',
    padding: '2px 6px',
    background: '#1a2a1a',
    borderRadius: '3px'
  },
  captureBtn: {
    padding: '4px 8px',
    fontSize: '11px',
    background: '#333',
    border: '1px solid #555',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  iframeWrapper: {
    flex: 1,
    position: 'relative'
  },
  viewer: {
    width: '100%',
    height: '100%',
    border: 'none',
    position: 'absolute',
    top: 0,
    left: 0
  }
}
