import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Interactive Graphviz flowchart display panel.
 * Features: zoom, pan, scroll, collapsible nodes, fullscreen, auto-fit.
 * Updates are upserted without page reload.
 */
export default function GraphvizPanel({ dot }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [collapsedNodes, setCollapsedNodes] = useState(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
        // Auto-fit when new graph arrives
        setTimeout(() => handleZoomFit(), 100)
      }
    }

    renderGraph()
  }, [dot])

  // Add interactive behaviors to SVG
  useEffect(() => {
    if (!svgRef.current) return
    
    const svgElement = svgRef.current.querySelector('svg')
    if (!svgElement) return

    // Make nodes clickable to collapse/expand
    const nodes = svgElement.querySelectorAll('.node')
    nodes.forEach(node => {
      node.style.cursor = 'pointer'
      node.addEventListener('click', handleNodeClick)
    })

    return () => {
      nodes.forEach(node => {
        node.removeEventListener('click', handleNodeClick)
      })
    }
  }, [svg])

  const handleNodeClick = useCallback((e) => {
    e.stopPropagation()
    const node = e.currentTarget
    const title = node.querySelector('title')?.textContent
    if (title) {
      setCollapsedNodes(prev => {
        const next = new Set(prev)
        if (next.has(title)) {
          next.delete(title)
        } else {
          next.add(title)
        }
        return next
      })
    }
  }, [])

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.3))
  const handleZoomReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }
  
  const handleZoomFit = useCallback(() => {
    if (!containerRef.current || !svgRef.current) return
    
    const svgElement = svgRef.current.querySelector('svg')
    if (!svgElement) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const svgRect = svgElement.getBBox()
    
    // Calculate scale to fit with padding
    const padding = 40
    const scaleX = (containerRect.width - padding) / svgRect.width
    const scaleY = (containerRect.height - padding) / svgRect.height
    const newScale = Math.min(scaleX, scaleY, 2) // Cap at 2x zoom
    
    setScale(newScale)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Pan controls
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(s => Math.max(0.3, Math.min(3, s + delta)))
  }

  if (isCollapsed) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span>Interaction Flow</span>
          <button onClick={() => setIsCollapsed(false)} style={styles.btn} title="Expand">
            ▼
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...styles.container,
      ...(isFullscreen ? styles.fullscreen : {})
    }}>
      <div style={styles.header}>
        <span>Interaction Flow</span>
        <div style={styles.controls}>
          <button onClick={handleZoomOut} style={styles.btn} title="Zoom Out">−</button>
          <button onClick={handleZoomReset} style={styles.btn} title="Reset Zoom">{Math.round(scale * 100)}%</button>
          <button onClick={handleZoomIn} style={styles.btn} title="Zoom In">+</button>
          <button onClick={handleZoomFit} style={styles.btn} title="Fit to Screen">⊡</button>
          <span style={styles.divider}>|</span>
          <button onClick={() => setIsFullscreen(!isFullscreen)} style={styles.btn} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? '⊟' : '⊞'}
          </button>
          <button onClick={() => setIsCollapsed(true)} style={styles.btn} title="Collapse">
            ▲
          </button>
        </div>
      </div>
      <div 
        ref={containerRef}
        style={styles.graph}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={svgRef}
          style={{
            ...styles.svgWrapper,
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.footer}>
        Click nodes to expand/collapse • Drag to pan • Scroll to zoom
      </div>
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
  fullscreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    width: '100vw',
    height: '100vh'
  },
  header: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #eee',
    color: '#666',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  controls: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  divider: {
    color: '#ccc',
    margin: '0 4px',
    fontSize: '10px'
  },
  btn: {
    padding: '2px 8px',
    fontSize: '11px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif',
    minWidth: '24px',
    transition: 'background 0.15s'
  },
  graph: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    background: '#fafafa'
  },
  svgWrapper: {
    transformOrigin: 'center center',
    transition: 'transform 0.1s ease-out',
    display: 'inline-block',
    position: 'absolute',
    top: '50%',
    left: '50%'
  },
  footer: {
    padding: '6px 12px',
    fontSize: '10px',
    color: '#999',
    borderTop: '1px solid #eee',
    textAlign: 'center'
  },
  error: {
    padding: '8px',
    color: '#c00',
    fontSize: '12px'
  }
}

