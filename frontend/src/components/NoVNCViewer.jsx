import { useCallback, useState } from 'react'

const VNC_URL = 'http://localhost:6080/vnc.html?autoconnect=true&resize=remote&password=password'

/**
 * Browser-in-browser via noVNC iframe.
 * Displays VNC session from Docker container.
 */
export default function NoVNCViewer({ onTrigger }) {
  const [status, setStatus] = useState('Ready')

  // Manual capture button
  const handleCapture = useCallback(() => {
    onTrigger('manual', null)
  }, [onTrigger])

  const handleLoad = () => {
    setStatus('Connected')
  }

  const handleError = () => {
    setStatus('Connection failed - is Docker running?')
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Browser Session</span>
        <span style={styles.status}>{status}</span>
        <button style={styles.captureBtn} onClick={handleCapture}>
          Capture
        </button>
      </div>
      <iframe
        src={VNC_URL}
        style={styles.viewer}
        onLoad={handleLoad}
        onError={handleError}
        title="VNC Session"
      />
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
  captureBtn: {
    padding: '4px 8px',
    fontSize: '11px',
    background: '#333',
    border: '1px solid #555',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif'
  },
  viewer: {
    flex: 1,
    border: 'none',
    width: '100%'
  }
}
