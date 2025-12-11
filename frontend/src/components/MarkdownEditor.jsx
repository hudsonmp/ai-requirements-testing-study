import { useCallback } from 'react'

/**
 * Simple markdown text editor for researcher notes.
 * Supports LaTeX via KaTeX for mathematical notation.
 */
export default function MarkdownEditor({ value, onChange }) {
  const handleChange = useCallback((e) => {
    onChange(e.target.value)
  }, [onChange])

  return (
    <div style={styles.container}>
      <div style={styles.header}>Notes</div>
      <textarea
        style={styles.editor}
        value={value}
        onChange={handleChange}
        placeholder="# Research Notes&#10;&#10;Document observations, questions, and requirement ideas here.&#10;&#10;Use LaTeX: $E = mc^2$"
        spellCheck="false"
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
    color: '#666'
  },
  editor: {
    flex: 1,
    padding: '12px',
    border: 'none',
    resize: 'none',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '14px',
    lineHeight: '1.6',
    outline: 'none',
    background: '#fff'
  }
}

