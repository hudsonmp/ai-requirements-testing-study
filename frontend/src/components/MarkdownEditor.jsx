import { useCallback, useRef, useEffect, useState } from 'react'

/**
 * Rich text editor with visual formatting and auto-save.
 */
export default function MarkdownEditor({ value, onChange }) {
  const editorRef = useRef(null)
  const saveTimerRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Set initial content only once when value first arrives
  useEffect(() => {
    if (editorRef.current && value && !isLoaded) {
      editorRef.current.innerHTML = value
      setIsLoaded(true)
    }
  }, [value, isLoaded])

  const handleKeyDown = useCallback((e) => {
    // Cmd+B for bold
    if (e.metaKey && e.key === 'b') {
      e.preventDefault()
      document.execCommand('bold', false)
    }
    
    // Tab for indent (nested bullets)
    if (e.key === 'Tab') {
      e.preventDefault()
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      
      // Check if we're in a list item
      let element = selection.anchorNode
      while (element && element !== editorRef.current) {
        if (element.nodeName === 'LI') {
          e.preventDefault()
          document.execCommand('indent')
          return
        }
        element = element.parentElement
      }
    }
    
    // "-" + space for list
    if (e.key === ' ') {
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      
      const range = selection.getRangeAt(0)
      const node = range.startContainer
      const text = node.textContent || ''
      const offset = range.startOffset
      
      const beforeCursor = text.substring(0, offset)
      const lineStart = beforeCursor.lastIndexOf('\n') + 1
      const lineText = beforeCursor.substring(lineStart)
      
      if (lineText === '-') {
        e.preventDefault()
        range.setStart(node, lineStart)
        range.setEnd(node, offset)
        range.deleteContents()
        document.execCommand('insertUnorderedList')
      }
    }

    // Enter in list - continue list without extra spacing
    if (e.key === 'Enter') {
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      
      let element = selection.anchorNode
      while (element && element !== editorRef.current) {
        if (element.nodeName === 'LI') {
          // Check if current list item is empty
          if (!element.textContent.trim()) {
            e.preventDefault()
            document.execCommand('outdent')
          }
          return
        }
        element = element.parentElement
      }
    }
  }, [])

  const handleInput = useCallback((e) => {
    const content = e.target.innerHTML
    
    // Don't save if empty
    if (!content || content === '<br>') return
    
    // Debounce saves (1000ms)
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    
    saveTimerRef.current = setTimeout(() => {
      onChange(content)
    }, 1000)
  }, [onChange])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      if (editorRef.current?.innerHTML && editorRef.current.innerHTML !== '<br>') {
        onChange(editorRef.current.innerHTML)
      }
    }
  }, [onChange])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Notes</span>
        <span style={styles.hint}>Cmd+B bold | "-" + space for list | Tab to indent</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        style={styles.editor}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      />
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
    color: '#666',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  hint: {
    fontWeight: 'normal',
    fontSize: '10px',
    color: '#999',
    textTransform: 'none'
  },
  editor: {
    flex: 1,
    padding: '12px',
    border: 'none',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '14px',
    lineHeight: '1.4',
    outline: 'none',
    background: '#fff',
    overflow: 'auto',
    userSelect: 'text',
    whiteSpace: 'pre-wrap',
    minHeight: '100px'
  }
}
