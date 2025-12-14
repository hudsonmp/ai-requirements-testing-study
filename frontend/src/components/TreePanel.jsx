import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Editable tree panel with persistent highlighting.
 */
export default function TreePanel({ tree }) {
  const [localTree, setLocalTree] = useState(tree)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [highlightColor, setHighlightColor] = useState('#ffeb3b')
  const [highlights, setHighlights] = useState({})
  const containerRef = useRef(null)

  useEffect(() => {
    setLocalTree(tree)
  }, [tree])

  // Load highlights on mount
  useEffect(() => {
    fetch('http://localhost:8000/state')
      .then(res => res.json())
      .then(data => {
        if (data.highlights) {
          setHighlights(data.highlights)
        }
      })
  }, [])

  // Save highlights whenever they change
  useEffect(() => {
    if (Object.keys(highlights).length > 0) {
      fetch('http://localhost:8000/save-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlights })
      })
    }
  }, [highlights])

  const deleteNode = useCallback((path, nodeName) => {
    const needsConfirm = nodeName.includes('Interaction') || nodeName.includes('LOA')
    if (needsConfirm && !confirm(`Delete "${nodeName}"?`)) {
      return
    }

    const deleteFromTree = (node, pathArray, index = 0) => {
      if (index === pathArray.length - 1) {
        return {
          ...node,
          children: node.children.filter((_, idx) => idx !== pathArray[index])
        }
      }
      return {
        ...node,
        children: node.children.map((child, idx) => 
          idx === pathArray[index] 
            ? deleteFromTree(child, pathArray, index + 1)
            : child
        )
      }
    }

    const newTree = deleteFromTree(localTree, path)
    setLocalTree(newTree)
    
    // Also remove highlights for deleted paths
    const pathStr = path.join('-')
    const newHighlights = { ...highlights }
    Object.keys(newHighlights).forEach(key => {
      if (key.startsWith(pathStr)) {
        delete newHighlights[key]
      }
    })
    setHighlights(newHighlights)
    
    fetch('http://localhost:8000/save-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tree: newTree })
    })
  }, [localTree, highlights])

  const handleHighlight = useCallback(() => {
    if (!containerRef.current) return
    
    const selection = window.getSelection()
    if (!selection.rangeCount || selection.isCollapsed) return

    // Find which node element contains the selection
    let element = selection.anchorNode
    while (element && element !== containerRef.current) {
      if (element.dataset?.path) {
        const pathStr = element.dataset.path
        const selectedText = selection.toString()
        setHighlights(prev => ({
          ...prev,
          [pathStr]: {
            text: selectedText,
            color: highlightColor
          }
        }))
        break
      }
      element = element.parentElement
    }
    
    selection.removeAllRanges()
  }, [highlightColor])

  useEffect(() => {
    const handleMouseUp = (e) => {
      if (containerRef.current?.contains(e.target)) {
        setTimeout(handleHighlight, 10)
      }
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [handleHighlight])

  if (isCollapsed) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span>Interaction Flow</span>
          <button onClick={() => setIsCollapsed(false)} style={styles.btn}>▼</button>
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
          <select 
            style={styles.colorPicker} 
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            title="Highlight color"
          >
            <option value="#ffeb3b">Yellow</option>
            <option value="#81c784">Green</option>
            <option value="#64b5f6">Blue</option>
            <option value="#ffb74d">Orange</option>
            <option value="#f06292">Pink</option>
          </select>
          <button onClick={() => setIsFullscreen(!isFullscreen)} style={styles.btn}>
            {isFullscreen ? '⊟' : '⊞'}
          </button>
          <button onClick={() => setIsCollapsed(true)} style={styles.btn}>▲</button>
        </div>
      </div>
      
      <div ref={containerRef} style={styles.treeContainer}>
        {localTree && localTree.children?.length > 0 ? (
          localTree.children.map((child, idx) => (
            <TreeNode 
              key={`${child.name}-${idx}`} 
              node={child} 
              path={[idx]}
              onDelete={deleteNode}
              highlights={highlights}
            />
          ))
        ) : (
          <div style={styles.empty}>No interactions captured yet</div>
        )}
      </div>

      <div style={styles.footer}>
        Select text to highlight | Click × to delete | Saved to data/
      </div>
    </div>
  )
}

function TreeNode({ node, path, onDelete, highlights }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const pathStr = path.join('-')
  const highlight = highlights[pathStr]

  const renderNodeName = () => {
    if (highlight) {
      const text = node.name
      const highlightedText = highlight.text
      const index = text.indexOf(highlightedText)
      
      if (index !== -1) {
        return (
          <>
            {text.substring(0, index)}
            <span style={{ backgroundColor: highlight.color, padding: '2px 0' }}>
              {highlightedText}
            </span>
            {text.substring(index + highlightedText.length)}
          </>
        )
      }
    }
    return node.name
  }

  return (
    <div style={{ marginLeft: path.length > 1 ? 16 : 0 }}>
      <div 
        style={{
          ...styles.node,
          ...(hasChildren ? styles.nodeWithChildren : {})
        }}
        data-path={pathStr}
      >
        {hasChildren && (
          <span 
            style={styles.toggle} 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={styles.bullet}>•</span>}
        <span style={styles.nodeName}>{renderNodeName()}</span>
        <button 
          style={styles.deleteBtn}
          onClick={(e) => { 
            e.stopPropagation()
            onDelete(path, node.name)
          }}
          title="Delete this item"
        >
          ×
        </button>
      </div>
      {hasChildren && isExpanded && (
        <div style={styles.children}>
          {node.children.map((child, idx) => (
            <TreeNode 
              key={`${child.name}-${idx}`} 
              node={child} 
              path={[...path, idx]}
              onDelete={onDelete}
              highlights={highlights}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    fontFamily: '"Times New Roman", Times, serif'
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
    alignItems: 'center',
    flexShrink: 0
  },
  controls: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  colorPicker: {
    padding: '2px 4px',
    fontSize: '10px',
    border: '1px solid #ddd',
    background: '#f5f5f5',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  btn: {
    padding: '2px 8px',
    fontSize: '11px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
    background: '#fafafa',
    userSelect: 'text'
  },
  empty: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px'
  },
  node: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px',
    margin: '2px 0',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#333',
    background: '#fff',
    border: '1px solid #e8e8e8',
    userSelect: 'text'
  },
  nodeWithChildren: {
    cursor: 'pointer'
  },
  toggle: {
    width: '16px',
    fontSize: '10px',
    color: '#666',
    marginRight: '6px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  bullet: {
    width: '16px',
    fontSize: '10px',
    color: '#999',
    marginRight: '6px',
    textAlign: 'center',
    userSelect: 'none'
  },
  nodeName: {
    flex: 1,
    userSelect: 'text',
    cursor: 'text'
  },
  deleteBtn: {
    padding: '0 6px',
    fontSize: '16px',
    background: 'transparent',
    border: 'none',
    color: '#c00',
    cursor: 'pointer',
    opacity: 0.4,
    marginLeft: '8px',
    transition: 'opacity 0.2s'
  },
  children: {
    borderLeft: '1px dashed #ddd',
    marginLeft: '7px',
    paddingLeft: '4px'
  },
  footer: {
    padding: '6px 12px',
    fontSize: '10px',
    color: '#999',
    borderTop: '1px solid #eee',
    textAlign: 'center',
    flexShrink: 0
  }
}
