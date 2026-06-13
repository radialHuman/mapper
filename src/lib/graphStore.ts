import type { GraphData, GraphEdge, GraphNode, GraphVersion, NodeMetadata } from '../types'

export const STORAGE_KEY = 'mapper.graph.v2'
export const VERSION_STORAGE_KEY = 'mapper.graph.versions.v1'
const GRAPH_DB_NAME = 'mapper-db'
const GRAPH_STORE_NAME = 'graphs'
const GRAPH_PRIMARY_KEY = 'primary'
const GRAPH_VERSION_STORE_NAME = 'graph_versions'
const GRAPH_VERSION_PRIMARY_KEY = 'history'
const VERSION_HISTORY_LIMIT = 100

export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2, 11)}`
}

export function seedGraph(): GraphData {
  const rootId = 'universe'
  const nodes: Record<string, GraphNode> = {
    universe: {
      id: rootId,
      label: 'Knowledge Universe',
      description: 'Root of your personal map.',
      metadata: { kind: 'root' },
      parents: [],
      children: ['science', 'mathematics', 'humanities'],
      position: { x: 0, y: 0, z: 0 },
    },
    science: {
      id: 'science',
      label: 'Science',
      description: 'Natural science domains.',
      metadata: { domain: 'STEM' },
      parents: [rootId],
      children: ['physics', 'biology'],
      position: { x: -240, y: -120, z: -80 },
    },
    mathematics: {
      id: 'mathematics',
      label: 'Mathematics',
      description: 'Formal systems and structures.',
      metadata: {
        domain: 'STEM',
        pioneers: ['Euclid', 'Carl Friedrich Gauss', 'David Hilbert'],
        wikipedia: 'https://en.wikipedia.org/wiki/Mathematics',
        books: ['How to Solve It - George Polya', 'A Mathematician\'s Apology - G.H. Hardy'],
      },
      parents: [rootId],
      children: ['algebra', 'calculus', 'geometry', 'physics'],
      position: { x: 180, y: -170, z: 70 },
    },
    humanities: {
      id: 'humanities',
      label: 'Humanities',
      description: 'Culture, history, arts, language.',
      metadata: { domain: 'social' },
      parents: [rootId],
      children: ['history'],
      position: { x: 290, y: 130, z: -20 },
    },
    physics: {
      id: 'physics',
      label: 'Physics',
      description: 'Study of matter, energy, and interactions.',
      metadata: {
        level: 'advanced',
        pioneers: ['Isaac Newton', 'Albert Einstein', 'Marie Curie'],
        wikipedia: 'https://en.wikipedia.org/wiki/Physics',
        books: ['The Feynman Lectures on Physics - Richard Feynman'],
      },
      parents: ['science', 'mathematics'],
      children: ['astrophysics', 'quantum-mechanics'],
      position: { x: -40, y: -10, z: 120 },
    },
    biology: {
      id: 'biology',
      label: 'Biology',
      description: 'Life and living systems.',
      metadata: { level: 'intermediate' },
      parents: ['science'],
      children: [],
      position: { x: -340, y: 120, z: -120 },
    },
    algebra: {
      id: 'algebra',
      label: 'Algebra',
      description: 'Symbols and abstract structures.',
      metadata: { level: 'intermediate' },
      parents: ['mathematics'],
      children: ['linear-algebra', 'abstract-algebra'],
      position: { x: 300, y: -280, z: 90 },
    },
    calculus: {
      id: 'calculus',
      label: 'Calculus',
      description: 'Change and accumulation.',
      metadata: {
        level: 'intermediate',
        pioneers: ['Isaac Newton', 'Gottfried Wilhelm Leibniz'],
        wikipedia: 'https://en.wikipedia.org/wiki/Calculus',
        books: ['Calculus - Michael Spivak', 'Calculus: Early Transcendentals - James Stewart'],
      },
      parents: ['mathematics'],
      children: ['differential-equations'],
      position: { x: 10, y: -300, z: 170 },
    },
    geometry: {
      id: 'geometry',
      label: 'Geometry',
      description: 'Shapes, spaces, and spatial reasoning.',
      metadata: { level: 'intermediate' },
      parents: ['mathematics'],
      children: ['topology'],
      position: { x: 240, y: -60, z: 200 },
    },
    'linear-algebra': {
      id: 'linear-algebra',
      label: 'Linear Algebra',
      description: 'Vector spaces, matrices, and linear maps.',
      metadata: { level: 'advanced' },
      parents: ['algebra'],
      children: ['eigenvectors'],
      position: { x: 360, y: -350, z: 150 },
    },
    'abstract-algebra': {
      id: 'abstract-algebra',
      label: 'Abstract Algebra',
      description: 'Groups, rings, and fields.',
      metadata: { level: 'advanced' },
      parents: ['algebra'],
      children: [],
      position: { x: 390, y: -250, z: 10 },
    },
    eigenvectors: {
      id: 'eigenvectors',
      label: 'Eigenvectors',
      description: 'Special vectors preserved by linear transformations.',
      metadata: { level: 'advanced' },
      parents: ['linear-algebra'],
      children: [],
      position: { x: 430, y: -420, z: 220 },
    },
    'differential-equations': {
      id: 'differential-equations',
      label: 'Differential Equations',
      description: 'Equations involving derivatives and dynamic systems.',
      metadata: { level: 'advanced' },
      parents: ['calculus'],
      children: ['nonlinear-dynamics'],
      position: { x: -80, y: -380, z: 250 },
    },
    'nonlinear-dynamics': {
      id: 'nonlinear-dynamics',
      label: 'Nonlinear Dynamics',
      description: 'Complex behavior in nonlinear systems.',
      metadata: { level: 'advanced' },
      parents: ['differential-equations'],
      children: [],
      position: { x: -160, y: -430, z: 320 },
    },
    topology: {
      id: 'topology',
      label: 'Topology',
      description: 'Properties preserved under continuous deformation.',
      metadata: { level: 'advanced' },
      parents: ['geometry'],
      children: [],
      position: { x: 330, y: 30, z: 250 },
    },
    astrophysics: {
      id: 'astrophysics',
      label: 'Astrophysics',
      description: 'Physical laws applied to celestial objects.',
      metadata: { level: 'advanced' },
      parents: ['physics'],
      children: [],
      position: { x: -140, y: 140, z: 210 },
    },
    'quantum-mechanics': {
      id: 'quantum-mechanics',
      label: 'Quantum Mechanics',
      description: 'Behavior of systems at atomic scales.',
      metadata: { level: 'advanced' },
      parents: ['physics'],
      children: [],
      position: { x: 70, y: 200, z: 150 },
    },
    history: {
      id: 'history',
      label: 'History',
      description: 'Human past and recorded events.',
      metadata: { domain: 'humanities' },
      parents: ['humanities'],
      children: [],
      position: { x: 410, y: 320, z: -100 },
    },
  }

  const edges: GraphEdge[] = [
    { id: makeId(), source: 'universe', target: 'science', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'universe', target: 'mathematics', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'universe', target: 'humanities', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'science', target: 'physics', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'mathematics', target: 'physics', type: 'hierarchy', strength: 0.9 },
    { id: makeId(), source: 'science', target: 'biology', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'mathematics', target: 'algebra', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'mathematics', target: 'calculus', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'mathematics', target: 'geometry', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'algebra', target: 'linear-algebra', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'algebra', target: 'abstract-algebra', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'linear-algebra', target: 'eigenvectors', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'calculus', target: 'differential-equations', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'differential-equations', target: 'nonlinear-dynamics', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'geometry', target: 'topology', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'physics', target: 'astrophysics', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'physics', target: 'quantum-mechanics', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'humanities', target: 'history', type: 'hierarchy', strength: 1 },
    { id: makeId(), source: 'calculus', target: 'physics', type: 'related', strength: 0.72 },
    { id: makeId(), source: 'linear-algebra', target: 'physics', type: 'related', strength: 0.77 },
    { id: makeId(), source: 'geometry', target: 'astrophysics', type: 'depends-on', strength: 0.63 },
    { id: makeId(), source: 'astrophysics', target: 'mathematics', type: 'depends-on', strength: 0.81 },
  ]

  return { nodes, edges, rootId }
}

export function loadGraph(): GraphData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return seedGraph()
  }

  try {
    const parsed = JSON.parse(raw) as GraphData
    if (!parsed.nodes || !parsed.edges || !parsed.rootId) {
      return seedGraph()
    }
    return parsed
  } catch {
    return seedGraph()
  }
}

export function saveGraph(graph: GraphData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graph))
  void saveGraphToIndexedDB(graph)
}

function hasIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

function openGraphDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GRAPH_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(GRAPH_STORE_NAME)) {
        db.createObjectStore(GRAPH_STORE_NAME)
      }
      if (!db.objectStoreNames.contains(GRAPH_VERSION_STORE_NAME)) {
        db.createObjectStore(GRAPH_VERSION_STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readGraphFromIndexedDB(): Promise<GraphData | null> {
  return new Promise((resolve, reject) => {
    openGraphDb()
      .then((db) => {
      const tx = db.transaction(GRAPH_STORE_NAME, 'readonly')
      const store = tx.objectStore(GRAPH_STORE_NAME)
      const request = store.get(GRAPH_PRIMARY_KEY)

      request.onsuccess = () => {
        const result = request.result as GraphData | undefined
        resolve(result ?? null)
      }
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
      tx.onabort = () => db.close()
      })
      .catch((error) => reject(error))
  })
}

function saveGraphToIndexedDB(graph: GraphData): Promise<void> {
  return new Promise((resolve, reject) => {
    openGraphDb()
      .then((db) => {
      const tx = db.transaction(GRAPH_STORE_NAME, 'readwrite')
      const store = tx.objectStore(GRAPH_STORE_NAME)
      const request = store.put(graph, GRAPH_PRIMARY_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
      tx.onabort = () => db.close()
      })
      .catch((error) => reject(error))
  })
}

export async function loadGraphPersistent(): Promise<GraphData> {
  if (hasIndexedDB()) {
    try {
      const fromDb = await readGraphFromIndexedDB()
      if (fromDb?.nodes && fromDb?.edges && fromDb?.rootId) {
        return fromDb
      }
    } catch {
      // Fall back to localStorage if IndexedDB is unavailable.
    }
  }

  const fromStorage = loadGraph()
  if (hasIndexedDB()) {
    void saveGraphToIndexedDB(fromStorage)
  }
  return fromStorage
}

function loadVersionsFromStorage(): GraphVersion[] {
  const raw = localStorage.getItem(VERSION_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as GraphVersion[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

function saveVersionsToStorage(versions: GraphVersion[]) {
  localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions))
}

function readGraphVersionsFromIndexedDB(): Promise<GraphVersion[] | null> {
  return new Promise((resolve, reject) => {
    openGraphDb()
      .then((db) => {
        const tx = db.transaction(GRAPH_VERSION_STORE_NAME, 'readonly')
        const store = tx.objectStore(GRAPH_VERSION_STORE_NAME)
        const request = store.get(GRAPH_VERSION_PRIMARY_KEY)

        request.onsuccess = () => {
          const result = request.result as GraphVersion[] | undefined
          resolve(result ?? null)
        }
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
        tx.onabort = () => db.close()
      })
      .catch((error) => reject(error))
  })
}

function saveGraphVersionsToIndexedDB(versions: GraphVersion[]): Promise<void> {
  return new Promise((resolve, reject) => {
    openGraphDb()
      .then((db) => {
        const tx = db.transaction(GRAPH_VERSION_STORE_NAME, 'readwrite')
        const store = tx.objectStore(GRAPH_VERSION_STORE_NAME)
        const request = store.put(versions, GRAPH_VERSION_PRIMARY_KEY)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
        tx.onabort = () => db.close()
      })
      .catch((error) => reject(error))
  })
}

export async function loadGraphVersionsPersistent(): Promise<GraphVersion[]> {
  if (hasIndexedDB()) {
    try {
      const fromDb = await readGraphVersionsFromIndexedDB()
      if (Array.isArray(fromDb)) {
        return fromDb
      }
    } catch {
      // Fall back to localStorage history.
    }
  }

  const fromStorage = loadVersionsFromStorage()
  if (hasIndexedDB()) {
    void saveGraphVersionsToIndexedDB(fromStorage)
  }
  return fromStorage
}

export async function appendGraphVersion(graph: GraphData, message: string) {
  const nextVersion: GraphVersion = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    message,
    graph,
  }

  const current = await loadGraphVersionsPersistent()
  const next = [nextVersion, ...current].slice(0, VERSION_HISTORY_LIMIT)
  saveVersionsToStorage(next)

  if (hasIndexedDB()) {
    void saveGraphVersionsToIndexedDB(next)
  }

  return next
}

export async function clearGraphVersionsPersistent() {
  saveVersionsToStorage([])
  if (hasIndexedDB()) {
    void saveGraphVersionsToIndexedDB([])
  }
}

export function wouldCreateHierarchyCycle(
  nodes: Record<string, GraphNode>,
  source: string,
  target: string,
) {
  if (source === target) {
    return true
  }

  const visited = new Set<string>()
  const queue = [target]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === source) {
      return true
    }

    if (visited.has(current)) {
      continue
    }

    visited.add(current)
    const node = nodes[current]
    if (node) {
      queue.push(...node.children)
    }
  }

  return false
}

export function addAttraction(
  nodes: Record<string, GraphNode>,
  sourceId: string,
  targetId: string,
  strength: number,
) {
  const source = nodes[sourceId]
  const target = nodes[targetId]
  if (!source || !target) {
    return nodes
  }

  const k = Math.max(0.04, Math.min(0.2, strength * 0.2))
  const nx = { ...nodes }

  const dx = target.position.x - source.position.x
  const dy = target.position.y - source.position.y
  const dz = target.position.z - source.position.z

  nx[sourceId] = {
    ...source,
    position: {
      x: source.position.x + dx * k,
      y: source.position.y + dy * k,
      z: source.position.z + dz * k,
    },
  }

  nx[targetId] = {
    ...target,
    position: {
      x: target.position.x - dx * k,
      y: target.position.y - dy * k,
      z: target.position.z - dz * k,
    },
  }

  return nx
}

export function parseMetadata(text: string): NodeMetadata | null {
  try {
    const metadata = JSON.parse(text)
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null
    }

    const safe: NodeMetadata = {}
    for (const [k, v] of Object.entries(metadata as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        safe[String(k)] = v.map((item) => String(item))
        continue
      }

      if (typeof v === 'string') {
        safe[String(k)] = v
        continue
      }

      safe[String(k)] = String(v)
    }
    return safe
  } catch {
    return null
  }
}
