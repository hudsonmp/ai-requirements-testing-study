const PORTS = [8001, 8000]
let resolvedBase = null
let detectionPromise = null

export function detectBackend() {
  if (detectionPromise) return detectionPromise
  detectionPromise = (async () => {
    for (const port of PORTS) {
      try {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 800)
        const res = await fetch(`http://localhost:${port}/state`, { signal: controller.signal })
        clearTimeout(id)
        if (res.ok) {
          resolvedBase = `http://localhost:${port}`
          console.log(`[API] Backend detected on port ${port}`)
          return resolvedBase
        }
      } catch {
        // try next port
      }
    }
    resolvedBase = `http://localhost:8000`
    console.warn('[API] No backend detected, defaulting to port 8000')
    return resolvedBase
  })()
  return detectionPromise
}

export function apiUrl(path) {
  return `${resolvedBase ?? 'http://localhost:8001'}${path}`
}

export function wsUrl(path) {
  const base = resolvedBase ?? 'http://localhost:8001'
  return base.replace('http://', 'ws://') + path
}
