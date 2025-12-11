import { useState, useCallback, useEffect } from 'react'

/**
 * Expandable/collapsible tree panel for interaction flow visualization.
 * Displays hierarchical data as a vertical list with toggleable children.
 */
export default function TreePanel({ tree }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    console.log('[TreePanel] Received tree:', JSON.stringify(tree, null, 2))
    console.log('[TreePanel] Tree has name:', tree?.name)
    console.log('[TreePanel] Tree has children:', tree?.children?.length)
  }, [tree])

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
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            style={styles.btn} 
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? '⊟' : '⊞'}
          </button>
          <button onClick={() => setIsCollapsed(true)} style={styles.btn} title="Collapse Panel">
            ▲
          </button>
        </div>
      </div>
      <div style={styles.treeContainer}>
        {tree && tree.name ? (
          <TreeNode node={tree} depth={0} />
        ) : (
          <div style={styles.empty}>
            No interactions captured yet
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#bbb' }}>
              Tree state: {JSON.stringify(tree)}
            </div>
          </div>
        )}
      </div>
      <div style={styles.footer}>
        Click arrows to expand/collapse nodes
      </div>
    </div>
  )
}

function TreeNode({ node, depth }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  const toggleExpand = useCallback((e) => {
    e.stopPropagation()
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div 
        style={{
          ...styles.node,
          ...(hasChildren ? styles.nodeWithChildren : {})
        }}
        onClick={hasChildren ? toggleExpand : undefined}
      >
        {hasChildren && (
          <span style={styles.toggle}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={styles.bullet}>•</span>}
        <span style={styles.nodeName}>{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div style={styles.children}>
          {node.children.map((child, idx) => (
            <TreeNode key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
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
  btn: {
    padding: '2px 8px',
    fontSize: '11px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontFamily: '"Times New Roman", Times, serif',
    minWidth: '24px'
  },
  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
    background: '#fafafa'
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
    transition: 'background 0.15s, border-color 0.15s'
  },
  nodeWithChildren: {
    cursor: 'pointer'
  },
  toggle: {
    width: '16px',
    fontSize: '10px',
    color: '#666',
    marginRight: '6px',
    userSelect: 'none'
  },
  bullet: {
    width: '16px',
    fontSize: '10px',
    color: '#999',
    marginRight: '6px',
    textAlign: 'center'
  },
  nodeName: {
    flex: 1
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

