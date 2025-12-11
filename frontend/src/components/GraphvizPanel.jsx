import { useEffect, useRef, useState } from 'react'

/**
 * Graphviz flowchart display panel.
 * Renders DOT notation as interactive SVG.
 * Updates are upserted without page reload.
 */
export default function GraphvizPanel({ dot }) {
  const containerRef = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  // Render DOT to SVG using viz.js (loaded via CDN)
  useEffect(() => {
    const renderGraph = async () => {
      try {
        if (!window.Viz) {
          // Load viz.js dynamically
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/viz.js@2.1.2/viz.js'
          script.onload = async () => {
            const script2 = document.createElement('script')
            script2.src = 'https://unpkg.com/viz.js@2.1.2/full.render.js'
            script2.onload = () => renderDot()
            document.head.appendChild(script2)
          }
          document.head.appendChild(script)
        } else {
          renderDot()
        }
      } catch (e) {
        setError(e.message)
      }
    }

    const renderDot = async () => {
      if (window.Viz) {
        const viz = new window.Viz()
        const result = await viz.renderString(dot)
        setSvg(result)
        setError(null)
      }
    }

    renderGraph()
  }, [dot])

  return (
    <div style={styles.container}>
      <div style={styles.header}>Interaction Flow</div>
      <div 
        ref={containerRef}
        style={styles.graph}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {error && <div style={styles.error}>{error}</div>}
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff'
  },
  header: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #eee',
    color: '#666'
  },
  graph: {
    flex: 1,
    padding: '12px',
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  error: {
    padding: '8px',
    color: '#c00',
    fontSize: '12px'
  }
}

