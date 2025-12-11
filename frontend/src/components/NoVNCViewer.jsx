import { useCallback, useState, useEffect, useRef } from 'react'

const VNC_URL = 'http://localhost:6080/vnc.html?autoconnect=true&resize=remote&password=password'
const SCROLL_DELAY = 500
const CHANGE_CHECK_INTERVAL = 1000 // Check for changes every 1s (but only trigger Gemini on actual changes)

/**
 * Browser-in-browser via noVNC iframe.
 * Displays VNC session from Docker container.
 * Only triggers Gemini on actual URL or content changes (not timer-based).
 */
export default function NoVNCViewer({ onTrigger }) {
  const [status, setStatus] = useState('Ready')
  const [autoDetect, setAutoDetect] = useState(true)
  const [lastActivity, setLastActivity] = useState(null)
  const [lastUrl, setLastUrl] = useState('')
  const [lastScreenHash, setLastScreenHash] = useState('')
  const scrollTimeout = useRef(null)
  const changeCheckInterval = useRef(null)

  // Track mouse activity on the iframe container (won't capture inside iframe, but detects focus)
  const handleContainerClick = useCallback(() => {
    setLastActivity('click')
    // Delay capture to allow VNC to process the click, then check for changes
    setTimeout(() => checkForChanges('click'), 500)
  }, [])

  const handleContainerScroll = useCallback(() => {
    setLastActivity('scroll')
    // 500ms delay after scroll completion
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      checkForChanges('scroll')
    }, SCROLL_DELAY)
  }, [])

  // Hash function for screenshot comparison
  const simpleHash = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString()
  }

  // Check for actual changes before triggering Gemini
  const checkForChanges = useCallback(async (triggerType = 'auto') => {
    try {
      // In a real implementation, we'd query the VNC browser's URL and screenshot
      // For now, we'll request a screenshot and compare it
      const response = await fetch('http://localhost:8000/check-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastUrl, lastScreenHash })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.changed) {
          setLastUrl(data.url || lastUrl)
          setLastScreenHash(data.screenHash || lastScreenHash)
          setLastActivity(triggerType)
          onTrigger(triggerType, data.screenshot)
        }
      }
    } catch (error) {
      console.error('[NoVNC] Change detection failed:', error)
    }
  }, [lastUrl, lastScreenHash, onTrigger])

  // Auto-detect changes when enabled
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
    fetch('http://localhost:8000/force-capture', {
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
        onWheel={handleContainerScroll}
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
