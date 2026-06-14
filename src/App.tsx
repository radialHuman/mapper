import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Universe3D from './components/Universe3D'
import {
  addAttraction,
  appendGraphVersion,
  clearGraphVersionsPersistent,
  loadGraphPersistent,
  loadGraphVersionsPersistent,
  makeId,
  parseMetadata,
  saveGraph,
  seedGraph,
  wouldCreateHierarchyCycle,
} from './lib/graphStore'
import type { EdgeType, GraphData, GraphNode, GraphVersion, NodeMetadata } from './types'
import './App.css'

type PanelMode = 'none' | 'details' | 'search' | 'add-node' | 'add-edge' | 'style' | 'history' | 'admin'

type NodeEditorState = {
  label: string
  description: string
  parentsText: string
  childrenText: string
  pioneersText: string
  wikipedia: string
  booksText: string
  extraMetadataText: string
}

type OverlayStyle = {
  floatingOpacity: number
  sidebarOpacity: number
  chipOpacity: number
}

const OVERLAY_STYLE_KEY = 'mapper.overlay-style.v1'
const DEFAULT_OVERLAY_STYLE: OverlayStyle = {
  floatingOpacity: 0.64,
  sidebarOpacity: 0.46,
  chipOpacity: 0.5,
}

function clampOpacity(value: number) {
  return Math.min(0.95, Math.max(0.15, Number.isFinite(value) ? value : 0.5))
}

function loadOverlayStyle(): OverlayStyle {
  try {
    const raw = localStorage.getItem(OVERLAY_STYLE_KEY)
    if (!raw) {
      return DEFAULT_OVERLAY_STYLE
    }

    const parsed = JSON.parse(raw) as Partial<OverlayStyle>
    return {
      floatingOpacity: clampOpacity(parsed.floatingOpacity ?? DEFAULT_OVERLAY_STYLE.floatingOpacity),
      sidebarOpacity: clampOpacity(parsed.sidebarOpacity ?? DEFAULT_OVERLAY_STYLE.sidebarOpacity),
      chipOpacity: clampOpacity(parsed.chipOpacity ?? DEFAULT_OVERLAY_STYLE.chipOpacity),
    }
  } catch {
    return DEFAULT_OVERLAY_STYLE
  }
}

function toCsv(values: string[]) {
  return values.join(', ')
}

function parseCsv(text: string) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toNodeIdFromLabel(label: string) {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'node'
}

function buildUniqueNodeId(label: string, nodes: Record<string, GraphNode>) {
  const base = toNodeIdFromLabel(label)
  if (!nodes[base]) {
    return base
  }

  let counter = 2
  while (nodes[`${base}-${counter}`]) {
    counter += 1
  }

  return `${base}-${counter}`
}

function metadataListFromNode(node: GraphNode | undefined, key: string) {
  if (!node) {
    return [] as string[]
  }

  const value = node.metadata[key]
  if (!value) {
    return [] as string[]
  }

  if (Array.isArray(value)) {
    return value
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function metadataStringFromNode(node: GraphNode | undefined, key: string) {
  if (!node) {
    return null
  }

  const value = node.metadata[key]
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value
}

function buildEditorState(node: GraphNode): NodeEditorState {
  const extraMetadata: NodeMetadata = {}
  for (const [key, value] of Object.entries(node.metadata)) {
    if (key === 'pioneers' || key === 'books' || key === 'wikipedia') {
      continue
    }
    extraMetadata[key] = value
  }

  return {
    label: node.label,
    description: node.description,
    parentsText: toCsv(node.parents),
    childrenText: toCsv(node.children),
    pioneersText: toCsv(metadataListFromNode(node, 'pioneers')),
    wikipedia: metadataStringFromNode(node, 'wikipedia') ?? '',
    booksText: toCsv(metadataListFromNode(node, 'books')),
    extraMetadataText: JSON.stringify(extraMetadata, null, 2),
  }
}

function App() {
  const initial = seedGraph()
  const [graph, setGraph] = useState<GraphData>(initial)
  const [currentNodeId, setCurrentNodeId] = useState(initial.rootId)
  const [selectedNodeId, setSelectedNodeId] = useState(initial.rootId)
  const [panelMode, setPanelMode] = useState<PanelMode>('none')
  const [history, setHistory] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')

  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeDescription, setNewNodeDescription] = useState('')
  const [newNodeMetadataText, setNewNodeMetadataText] = useState('{\n  "kind": "custom"\n}')
  const [newNodeParentIds, setNewNodeParentIds] = useState<string[]>([initial.rootId])
  const [newNodeParentSearchText, setNewNodeParentSearchText] = useState('')

  const [newEdgeSource, setNewEdgeSource] = useState(initial.rootId)
  const [newEdgeTarget, setNewEdgeTarget] = useState('')
  const [newEdgeType, setNewEdgeType] = useState<EdgeType>('related')
  const [newEdgeStrength, setNewEdgeStrength] = useState(0.65)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [overlayStyle, setOverlayStyle] = useState<OverlayStyle>(loadOverlayStyle)
  const [versions, setVersions] = useState<GraphVersion[]>([])
  const [editorState, setEditorState] = useState<NodeEditorState | null>(null)
  const [adminSearchText, setAdminSearchText] = useState('')
  const [adminSelectedNodeId, setAdminSelectedNodeId] = useState(initial.rootId)
  const [adminExpandedNodeIds, setAdminExpandedNodeIds] = useState<string[]>([initial.rootId])

  const changeMessageRef = useRef<string | null>(null)
  const previousGraphRef = useRef<GraphData>(initial)
  const hydratedRef = useRef(false)

  const activeCurrentNodeId = graph.nodes[currentNodeId] ? currentNodeId : graph.rootId
  const activeSelectedNodeId = graph.nodes[selectedNodeId] ? selectedNodeId : graph.rootId
  const currentNode = graph.nodes[activeCurrentNodeId]
  const selectedNode = graph.nodes[activeSelectedNodeId]

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    const previous = previousGraphRef.current
    const same = JSON.stringify(previous) === JSON.stringify(graph)
    if (same) {
      return
    }

    previousGraphRef.current = graph
    void saveGraph(graph)

    const message = changeMessageRef.current ?? 'Graph updated'
    changeMessageRef.current = null
    void appendGraphVersion(graph, message).then((next) => setVersions(next))
  }, [graph])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const [persisted, persistedVersions] = await Promise.all([
        loadGraphPersistent(),
        loadGraphVersionsPersistent(),
      ])

      if (!mounted) {
        return
      }

      setGraph(persisted)
      setVersions(persistedVersions)
      setCurrentNodeId(persisted.rootId)
      setSelectedNodeId(persisted.rootId)
      setAdminSelectedNodeId(persisted.rootId)
      setAdminExpandedNodeIds([persisted.rootId])
      setEditorState(buildEditorState(persisted.nodes[persisted.rootId]))
      setNewNodeParentIds([persisted.rootId])
      setNewEdgeSource(persisted.rootId)
      previousGraphRef.current = persisted
      hydratedRef.current = true
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(OVERLAY_STYLE_KEY, JSON.stringify(overlayStyle))
  }, [overlayStyle])

  useEffect(() => {
    const node = graph.nodes[adminSelectedNodeId] ?? graph.nodes[selectedNodeId]
    if (!node) {
      return
    }
    setEditorState(buildEditorState(node))
  }, [adminSelectedNodeId, graph.nodes, selectedNodeId])

  const visibleNodeIds = useMemo(() => {
    if (!currentNode) {
      return [] as string[]
    }

    const visible = new Set<string>([currentNode.id, ...currentNode.children, ...currentNode.parents])

    for (const edge of graph.edges) {
      if (edge.source === currentNode.id || edge.target === currentNode.id) {
        visible.add(edge.source)
        visible.add(edge.target)
      }
    }

    return [...visible].filter((id) => Boolean(graph.nodes[id]))
  }, [currentNode, graph.edges, graph.nodes])

  const visibleNodes = useMemo(
    () => visibleNodeIds.map((id) => graph.nodes[id]).filter(Boolean),
    [graph.nodes, visibleNodeIds],
  )

  const visibleEdges = useMemo(() => {
    const visible = new Set(visibleNodeIds)
    return graph.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target))
  }, [graph.edges, visibleNodeIds])

  const searchResults = useMemo(() => {
    const needle = searchText.trim().toLowerCase()
    if (!needle) {
      return [] as GraphNode[]
    }

    return Object.values(graph.nodes)
      .filter((node) => {
        if (node.label.toLowerCase().includes(needle) || node.description.toLowerCase().includes(needle)) {
          return true
        }

        return Object.entries(node.metadata).some(([k, v]) => {
          if (k.toLowerCase().includes(needle)) {
            return true
          }

          if (Array.isArray(v)) {
            return v.some((item) => item.toLowerCase().includes(needle))
          }

          return v.toLowerCase().includes(needle)
        })
      })
      .slice(0, 12)
  }, [graph.nodes, searchText])

  const parentSelectionOptions = useMemo(() => {
    const needle = newNodeParentSearchText.trim().toLowerCase()
    return Object.values(graph.nodes)
      .filter((node) => {
        if (!needle) {
          return true
        }
        return node.label.toLowerCase().includes(needle) || node.id.toLowerCase().includes(needle)
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 80)
  }, [graph.nodes, newNodeParentSearchText])

  const selectNodeForEditing = (nodeId: string) => {
    const node = graph.nodes[nodeId]
    if (!node) {
      return
    }

    setSelectedNodeId(nodeId)
    setAdminSelectedNodeId(nodeId)
    setEditorState(buildEditorState(node))
  }

  const adminRootIds = useMemo(() => {
    const roots = new Set<string>([graph.rootId])
    for (const node of Object.values(graph.nodes)) {
      if (node.parents.length === 0) {
        roots.add(node.id)
      }
    }
    return [...roots]
  }, [graph.nodes, graph.rootId])

  const adminVisibleNodeSet = useMemo(() => {
    const needle = adminSearchText.trim().toLowerCase()
    if (!needle) {
      return new Set(Object.keys(graph.nodes))
    }

    const result = new Set<string>()
    const dfs = (nodeId: string, path: Set<string>) => {
      if (path.has(nodeId)) {
        return false
      }

      const node = graph.nodes[nodeId]
      if (!node) {
        return false
      }

      const nextPath = new Set(path)
      nextPath.add(nodeId)

      const selfMatch =
        node.label.toLowerCase().includes(needle) ||
        node.id.toLowerCase().includes(needle) ||
        node.description.toLowerCase().includes(needle)

      let childMatch = false
      for (const childId of node.children) {
        if (dfs(childId, nextPath)) {
          childMatch = true
        }
      }

      const include = selfMatch || childMatch
      if (include) {
        result.add(nodeId)
      }
      return include
    }

    for (const rootId of adminRootIds) {
      void dfs(rootId, new Set())
    }

    return result
  }, [adminRootIds, adminSearchText, graph.nodes])

  const adminSelectedNode = graph.nodes[adminSelectedNodeId] ?? selectedNode

  const toggleAdminExpand = (nodeId: string) => {
    setAdminExpandedNodeIds((old) => {
      if (old.includes(nodeId)) {
        return old.filter((id) => id !== nodeId)
      }
      return [...old, nodeId]
    })
  }

  const renderAdminTreeNode = (nodeId: string, depth: number, path: Set<string>) => {
    if (path.has(nodeId)) {
      return null
    }

    const node = graph.nodes[nodeId]
    if (!node || !adminVisibleNodeSet.has(nodeId)) {
      return null
    }

    const childIds = [...new Set(node.children)].filter((id) => Boolean(graph.nodes[id]))
    const hasChildren = childIds.length > 0
    const expanded = adminExpandedNodeIds.includes(nodeId)
    const isSelected = adminSelectedNodeId === nodeId

    const nextPath = new Set(path)
    nextPath.add(nodeId)

    return (
      <div key={`${nodeId}-${depth}`}>
        <div className={`admin-tree-row ${isSelected ? 'selected' : ''}`} style={{ paddingLeft: `${depth * 14}px` }}>
          {hasChildren ? (
            <button type="button" className="admin-expand" onClick={() => toggleAdminExpand(nodeId)}>
              {expanded ? '-' : '+'}
            </button>
          ) : (
            <span className="admin-expand spacer" />
          )}
          <button
            type="button"
            className="admin-node-button"
            onClick={() => selectNodeForEditing(nodeId)}
          >
            {node.label}
          </button>
          <span className="admin-node-id">{node.id}</span>
        </div>
        {expanded && hasChildren && (
          <div>
            {childIds.map((childId) => renderAdminTreeNode(childId, depth + 1, nextPath))}
          </div>
        )}
      </div>
    )
  }

  const saveNodeEdits = () => {
    if (!selectedNode || !editorState) {
      return
    }

    setErrorMessage(null)
    setInfoMessage(null)

    const label = editorState.label.trim()
    if (!label) {
      setErrorMessage('Label cannot be empty.')
      return
    }

    const nextParents = [...new Set(parseCsv(editorState.parentsText))]
    const nextChildren = [...new Set(parseCsv(editorState.childrenText))]

    if (nextParents.includes(selectedNode.id) || nextChildren.includes(selectedNode.id)) {
      setErrorMessage('A node cannot be its own parent or child.')
      return
    }

    for (const parentId of nextParents) {
      if (!graph.nodes[parentId]) {
        setErrorMessage(`Parent node not found: ${parentId}`)
        return
      }
      if (wouldCreateHierarchyCycle(graph.nodes, parentId, selectedNode.id)) {
        setErrorMessage(`Parent assignment would create cycle: ${parentId} -> ${selectedNode.id}`)
        return
      }
    }

    for (const childId of nextChildren) {
      if (!graph.nodes[childId]) {
        setErrorMessage(`Child node not found: ${childId}`)
        return
      }
      if (wouldCreateHierarchyCycle(graph.nodes, selectedNode.id, childId)) {
        setErrorMessage(`Child assignment would create cycle: ${selectedNode.id} -> ${childId}`)
        return
      }
    }

    const extraMetadata = parseMetadata(editorState.extraMetadataText)
    if (!extraMetadata) {
      setErrorMessage('Extra Metadata JSON must be a valid object.')
      return
    }

    const pioneers = parseCsv(editorState.pioneersText)
    const books = parseCsv(editorState.booksText)
    const wikipedia = editorState.wikipedia.trim()

    const mergedMetadata: NodeMetadata = {
      ...extraMetadata,
      pioneers,
      books,
    }
    if (wikipedia) {
      mergedMetadata.wikipedia = wikipedia
    }

    changeMessageRef.current = `Edited node ${label}`

    setGraph((old) => {
      const nextNodes: Record<string, GraphNode> = { ...old.nodes }
      const existing = nextNodes[selectedNode.id]

      for (const parentId of existing.parents) {
        if (nextParents.includes(parentId)) {
          continue
        }
        const parent = nextNodes[parentId]
        if (!parent) {
          continue
        }
        nextNodes[parentId] = {
          ...parent,
          children: parent.children.filter((id) => id !== selectedNode.id),
        }
      }

      for (const parentId of nextParents) {
        const parent = nextNodes[parentId]
        if (!parent) {
          continue
        }
        if (!parent.children.includes(selectedNode.id)) {
          nextNodes[parentId] = {
            ...parent,
            children: [...parent.children, selectedNode.id],
          }
        }
      }

      for (const childId of existing.children) {
        if (nextChildren.includes(childId)) {
          continue
        }
        const child = nextNodes[childId]
        if (!child) {
          continue
        }
        nextNodes[childId] = {
          ...child,
          parents: child.parents.filter((id) => id !== selectedNode.id),
        }
      }

      for (const childId of nextChildren) {
        const child = nextNodes[childId]
        if (!child) {
          continue
        }
        if (!child.parents.includes(selectedNode.id)) {
          nextNodes[childId] = {
            ...child,
            parents: [...child.parents, selectedNode.id],
          }
        }
      }

      nextNodes[selectedNode.id] = {
        ...existing,
        label,
        description: editorState.description,
        metadata: mergedMetadata,
        parents: nextParents,
        children: nextChildren,
      }

      const untouchedEdges = old.edges.filter((edge) => {
        if (edge.type !== 'hierarchy') {
          return true
        }

        return edge.source !== selectedNode.id && edge.target !== selectedNode.id
      })

      const hierarchyEdges: GraphData['edges'] = []
      for (const parentId of nextParents) {
        hierarchyEdges.push({
          id: makeId(),
          source: parentId,
          target: selectedNode.id,
          type: 'hierarchy',
          strength: 1,
        })
      }
      for (const childId of nextChildren) {
        hierarchyEdges.push({
          id: makeId(),
          source: selectedNode.id,
          target: childId,
          type: 'hierarchy',
          strength: 1,
        })
      }

      return {
        ...old,
        nodes: nextNodes,
        edges: [...untouchedEdges, ...hierarchyEdges],
      }
    })

    setInfoMessage('Node changes saved.')
  }

  const restoreVersion = (version: GraphVersion) => {
    changeMessageRef.current = `Restored version ${version.id.slice(0, 8)}`
    setGraph(version.graph)
    setCurrentNodeId(version.graph.rootId)
    setSelectedNodeId(version.graph.rootId)
    setAdminSelectedNodeId(version.graph.rootId)
    setAdminExpandedNodeIds([version.graph.rootId])
    setEditorState(buildEditorState(version.graph.nodes[version.graph.rootId]))
    setPanelMode('details')
    setInfoMessage(`Restored: ${version.message}`)
    setErrorMessage(null)
  }

  const exportAndCommitGraph = async () => {
    setErrorMessage(null)
    setInfoMessage(null)

    const message = `Graph snapshot ${new Date().toISOString()}`
    const desktop = window.mapperDesktop

    if (desktop?.exportAndCommitGraph) {
      const result = await desktop.exportAndCommitGraph(graph, message)
      if (result.ok) {
        setInfoMessage(result.message)
      } else {
        setErrorMessage(result.message)
      }
      return
    }

    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `graph-snapshot-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setInfoMessage('Snapshot downloaded. Git commit is available in desktop mode.')
  }

  const handleNavigateIn = (nodeId: string) => {
    if (nodeId === activeCurrentNodeId || !graph.nodes[nodeId]) {
      return
    }

    setHistory((old) => [...old, activeCurrentNodeId])
    setCurrentNodeId(nodeId)
    selectNodeForEditing(nodeId)
    setPanelMode('none')
    setErrorMessage(null)
  }

  const handleNavigateOut = () => {
    if (history.length > 0) {
      const next = history[history.length - 1]
      setHistory((old) => old.slice(0, -1))
      setCurrentNodeId(next)
      selectNodeForEditing(next)
      setPanelMode('none')
      setErrorMessage(null)
      return
    }

    const fallbackParent = currentNode?.parents[0]
    if (fallbackParent && graph.nodes[fallbackParent]) {
      setCurrentNodeId(fallbackParent)
      selectNodeForEditing(fallbackParent)
      setPanelMode('none')
      setErrorMessage(null)
    }
  }

  const handleSelectNode = (nodeId: string) => {
    selectNodeForEditing(nodeId)
    setPanelMode('details')
    setErrorMessage(null)
  }

  const handleBackgroundClick = () => {
    setPanelMode('none')
    setErrorMessage(null)
  }

  const selectSearchResult = (nodeId: string) => {
    selectNodeForEditing(nodeId)
    setCurrentNodeId(nodeId)
    setHistory([])
    setPanelMode('details')
    setSearchText('')
  }

  const toggleParent = (id: string) => {
    setNewNodeParentIds((old) => {
      if (old.includes(id)) {
        return old.filter((item) => item !== id)
      }
      return [...old, id]
    })
  }

  const addNode = () => {
    setErrorMessage(null)

    const label = newNodeLabel.trim()
    if (!label) {
      setErrorMessage('Node label is required.')
      return
    }

    if (newNodeParentIds.length === 0) {
      setErrorMessage('Choose at least one parent.')
      return
    }

    const metadata = parseMetadata(newNodeMetadataText)
    if (!metadata) {
      setErrorMessage('Metadata must be valid JSON object values.')
      return
    }

    const validParents = newNodeParentIds.filter((id) => Boolean(graph.nodes[id]))
    if (validParents.length === 0) {
      setErrorMessage('Selected parents are invalid.')
      return
    }

    const id = buildUniqueNodeId(label, graph.nodes)
    changeMessageRef.current = `Added node ${label}`
    const avg = validParents.reduce(
      (acc, parentId) => {
        const p = graph.nodes[parentId].position
        return { x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }
      },
      { x: 0, y: 0, z: 0 },
    )

    avg.x /= validParents.length
    avg.y /= validParents.length
    avg.z /= validParents.length

    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const radius = 150 + Math.random() * 70

    const newNode: GraphNode = {
      id,
      label,
      description: newNodeDescription.trim(),
      metadata,
      parents: validParents,
      children: [],
      position: {
        x: avg.x + Math.cos(theta) * Math.sin(phi) * radius,
        y: avg.y + Math.cos(phi) * radius,
        z: avg.z + Math.sin(theta) * Math.sin(phi) * radius,
      },
    }

    setGraph((old) => {
      const nextNodes: Record<string, GraphNode> = {
        ...old.nodes,
        [id]: newNode,
      }

      for (const parentId of validParents) {
        const parent = nextNodes[parentId]
        if (!parent.children.includes(id)) {
          nextNodes[parentId] = {
            ...parent,
            children: [...parent.children, id],
          }
        }
      }

      const hierarchyEdges = validParents.map((parentId) => ({
        id: makeId(),
        source: parentId,
        target: id,
        type: 'hierarchy' as const,
        strength: 1,
      }))

      return {
        ...old,
        nodes: nextNodes,
        edges: [...old.edges, ...hierarchyEdges],
      }
    })

    setSelectedNodeId(id)
    setAdminSelectedNodeId(id)
    setEditorState(buildEditorState(newNode))
    setNewNodeLabel('')
    setNewNodeDescription('')
    setNewNodeMetadataText('{\n  "kind": "custom"\n}')
    setNewNodeParentSearchText('')
  }

  const moveNodeToNewPosition = (nodeId: string) => {
    const node = graph.nodes[nodeId]
    if (!node) {
      setErrorMessage('Select a valid node first.')
      return
    }

    changeMessageRef.current = `Moved node ${node.label}`
    setGraph((old) => {
      const existing = old.nodes[nodeId]
      if (!existing) {
        return old
      }

      const anchorNodes = [...existing.parents, ...existing.children]
        .map((id) => old.nodes[id])
        .filter(Boolean)

      let center = existing.position
      if (anchorNodes.length > 0) {
        const total = anchorNodes.reduce(
          (acc, anchor) => ({
            x: acc.x + anchor.position.x,
            y: acc.y + anchor.position.y,
            z: acc.z + anchor.position.z,
          }),
          { x: 0, y: 0, z: 0 },
        )
        center = {
          x: total.x / anchorNodes.length,
          y: total.y / anchorNodes.length,
          z: total.z / anchorNodes.length,
        }
      }

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = anchorNodes.length > 0 ? 150 + Math.random() * 130 : 240 + Math.random() * 220

      const nextPosition = {
        x: center.x + Math.cos(theta) * Math.sin(phi) * radius,
        y: center.y + Math.cos(phi) * radius,
        z: center.z + Math.sin(theta) * Math.sin(phi) * radius,
      }

      return {
        ...old,
        nodes: {
          ...old.nodes,
          [nodeId]: {
            ...existing,
            position: nextPosition,
          },
        },
      }
    })

    setInfoMessage(`Moved ${node.label} to a new position.`)
    setErrorMessage(null)
  }

  const removeParentLink = (parentId: string) => {
    const node = adminSelectedNode
    if (!node) {
      return
    }

    if (!node.parents.includes(parentId)) {
      setErrorMessage('Selected parent link does not exist.')
      return
    }

    changeMessageRef.current = `Removed parent ${parentId} from ${node.id}`
    setGraph((old) => {
      const parent = old.nodes[parentId]
      const child = old.nodes[node.id]
      if (!parent || !child) {
        return old
      }

      const nextNodes: Record<string, GraphNode> = {
        ...old.nodes,
        [parentId]: {
          ...parent,
          children: parent.children.filter((id) => id !== node.id),
        },
        [node.id]: {
          ...child,
          parents: child.parents.filter((id) => id !== parentId),
        },
      }

      const nextEdges = old.edges.filter(
        (edge) => !(edge.type === 'hierarchy' && edge.source === parentId && edge.target === node.id),
      )

      return {
        ...old,
        nodes: nextNodes,
        edges: nextEdges,
      }
    })

    setInfoMessage('Parent removed successfully.')
    setErrorMessage(null)
  }

  const removeChildLink = (childId: string) => {
    const node = adminSelectedNode
    if (!node) {
      return
    }

    if (!node.children.includes(childId)) {
      setErrorMessage('Selected child link does not exist.')
      return
    }

    changeMessageRef.current = `Removed child ${childId} from ${node.id}`
    setGraph((old) => {
      const parent = old.nodes[node.id]
      const child = old.nodes[childId]
      if (!parent || !child) {
        return old
      }

      const nextNodes: Record<string, GraphNode> = {
        ...old.nodes,
        [node.id]: {
          ...parent,
          children: parent.children.filter((id) => id !== childId),
        },
        [childId]: {
          ...child,
          parents: child.parents.filter((id) => id !== node.id),
        },
      }

      const nextEdges = old.edges.filter(
        (edge) => !(edge.type === 'hierarchy' && edge.source === node.id && edge.target === childId),
      )

      return {
        ...old,
        nodes: nextNodes,
        edges: nextEdges,
      }
    })

    setInfoMessage('Child removed successfully.')
    setErrorMessage(null)
  }

  const deleteSelectedNode = () => {
    const node = adminSelectedNode
    if (!node) {
      return
    }

    if (node.id === graph.rootId) {
      setErrorMessage('Root node cannot be deleted.')
      return
    }

    const confirmed = window.confirm(
      `Delete node "${node.label}" (${node.id})? This will remove all direct parent/child links and edges.`,
    )
    if (!confirmed) {
      return
    }

    const fallbackId =
      [...node.parents, ...node.children, graph.rootId].find((id) => id !== node.id && Boolean(graph.nodes[id])) ??
      Object.keys(graph.nodes).find((id) => id !== node.id) ??
      graph.rootId

    changeMessageRef.current = `Deleted node ${node.label}`
    setGraph((old) => {
      const nextNodes: Record<string, GraphNode> = { ...old.nodes }
      delete nextNodes[node.id]

      for (const existingNode of Object.values(nextNodes)) {
        const nextParents = existingNode.parents.filter((id) => id !== node.id)
        const nextChildren = existingNode.children.filter((id) => id !== node.id)

        if (nextParents.length !== existingNode.parents.length || nextChildren.length !== existingNode.children.length) {
          nextNodes[existingNode.id] = {
            ...existingNode,
            parents: nextParents,
            children: nextChildren,
          }
        }
      }

      const nextEdges = old.edges.filter((edge) => edge.source !== node.id && edge.target !== node.id)

      return {
        ...old,
        nodes: nextNodes,
        edges: nextEdges,
      }
    })

    setHistory((old) => old.filter((id) => id !== node.id))
    setCurrentNodeId((old) => (old === node.id ? fallbackId : old))
    setSelectedNodeId(fallbackId)
    setAdminSelectedNodeId(fallbackId)
    setAdminExpandedNodeIds((old) => old.filter((id) => id !== node.id))
    setInfoMessage(`Deleted node ${node.label}.`)
    setErrorMessage(null)
  }

  const addEdge = () => {
    setErrorMessage(null)

    if (!newEdgeSource || !newEdgeTarget) {
      setErrorMessage('Choose source and target nodes.')
      return
    }

    if (newEdgeSource === newEdgeTarget) {
      setErrorMessage('Source and target must be different.')
      return
    }

    if (!graph.nodes[newEdgeSource] || !graph.nodes[newEdgeTarget]) {
      setErrorMessage('Invalid source or target.')
      return
    }

    if (
      newEdgeType === 'hierarchy' &&
      wouldCreateHierarchyCycle(graph.nodes, newEdgeSource, newEdgeTarget)
    ) {
      setErrorMessage('This hierarchy edge would create a cycle. Not allowed.')
      return
    }

    setGraph((old) => {
      changeMessageRef.current = `Added ${newEdgeType} edge ${newEdgeSource} -> ${newEdgeTarget}`
      let nextNodes = { ...old.nodes }

      if (newEdgeType === 'hierarchy') {
        const s = nextNodes[newEdgeSource]
        const t = nextNodes[newEdgeTarget]
        if (!s.children.includes(newEdgeTarget)) {
          nextNodes[newEdgeSource] = { ...s, children: [...s.children, newEdgeTarget] }
        }
        if (!t.parents.includes(newEdgeSource)) {
          nextNodes[newEdgeTarget] = { ...t, parents: [...t.parents, newEdgeSource] }
        }
      }

      nextNodes = addAttraction(nextNodes, newEdgeSource, newEdgeTarget, newEdgeStrength)

      return {
        ...old,
        nodes: nextNodes,
        edges: [
          ...old.edges,
          {
            id: makeId(),
            source: newEdgeSource,
            target: newEdgeTarget,
            type: newEdgeType,
            strength: Number(newEdgeStrength.toFixed(2)),
          },
        ],
      }
    })

    setInfoMessage('Connection added successfully.')
  }

  const removeEdge = () => {
    setErrorMessage(null)

    if (!newEdgeSource || !newEdgeTarget) {
      setErrorMessage('Choose source and target nodes.')
      return
    }

    if (!graph.nodes[newEdgeSource] || !graph.nodes[newEdgeTarget]) {
      setErrorMessage('Invalid source or target.')
      return
    }

    let removedCount = 0
    setGraph((old) => {
      const nextEdges = old.edges.filter((edge) => {
        const matched =
          edge.source === newEdgeSource &&
          edge.target === newEdgeTarget &&
          edge.type === newEdgeType
        if (matched) {
          removedCount += 1
        }
        return !matched
      })

      if (removedCount === 0) {
        return old
      }

      if (newEdgeType !== 'hierarchy') {
        return {
          ...old,
          edges: nextEdges,
        }
      }

      const source = old.nodes[newEdgeSource]
      const target = old.nodes[newEdgeTarget]
      if (!source || !target) {
        return {
          ...old,
          edges: nextEdges,
        }
      }

      return {
        ...old,
        nodes: {
          ...old.nodes,
          [newEdgeSource]: {
            ...source,
            children: source.children.filter((id) => id !== newEdgeTarget),
          },
          [newEdgeTarget]: {
            ...target,
            parents: target.parents.filter((id) => id !== newEdgeSource),
          },
        },
        edges: nextEdges,
      }
    })

    if (removedCount === 0) {
      setErrorMessage('No matching connection found to remove.')
      return
    }

    changeMessageRef.current = `Removed ${removedCount} ${newEdgeType} edge(s) ${newEdgeSource} -> ${newEdgeTarget}`
    setInfoMessage(
      `Removed ${removedCount} ${newEdgeType} connection${removedCount === 1 ? '' : 's'} successfully.`,
    )
  }

  const resetData = () => {
    const fresh = seedGraph()
    void clearGraphVersionsPersistent().then(() => setVersions([]))
    changeMessageRef.current = 'Reset graph data'
    setGraph(fresh)
    setCurrentNodeId(fresh.rootId)
    setSelectedNodeId(fresh.rootId)
    setAdminSelectedNodeId(fresh.rootId)
    setAdminExpandedNodeIds([fresh.rootId])
    setAdminSearchText('')
    setEditorState(buildEditorState(fresh.nodes[fresh.rootId]))
    setHistory([])
    setNewNodeParentIds([fresh.rootId])
    setNewEdgeSource(fresh.rootId)
    setNewEdgeTarget('')
    setPanelMode('none')
    setSearchText('')
    setErrorMessage(null)
    setInfoMessage('Graph reset to seed data.')
  }

  const goToHomeUniverse = () => {
    const homeId = graph.rootId
    const homeNode = graph.nodes[homeId]
    if (!homeNode) {
      return
    }

    setCurrentNodeId(homeId)
    setSelectedNodeId(homeId)
    setAdminSelectedNodeId(homeId)
    setEditorState(buildEditorState(homeNode))
    setHistory([])
    setPanelMode('none')
    setErrorMessage(null)
    setInfoMessage('Returned to Knowledge Universe.')
  }

  const renderSidebarPanel = () => {
    if (panelMode === 'search') {
      return (
        <section className="panel">
          <h2>Search</h2>
          <label>
            Find Node
            <input
              type="text"
              placeholder="Search by label, description, or metadata..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') {
                  return
                }

                event.preventDefault()
                const first = searchResults[0]
                if (!first) {
                  return
                }
                selectSearchResult(first.id)
              }}
            />
          </label>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectSearchResult(node.id)}
                >
                  {node.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )
    }

    if (panelMode === 'add-node') {
      return (
        <section className="panel">
          <h2>Add Node</h2>
          <label>
            Label
            <input value={newNodeLabel} onChange={(event) => setNewNodeLabel(event.target.value)} />
          </label>
          <label>
            Description
            <textarea
              value={newNodeDescription}
              onChange={(event) => setNewNodeDescription(event.target.value)}
            />
          </label>
          <label>
            Metadata JSON
            <textarea
              value={newNodeMetadataText}
              onChange={(event) => setNewNodeMetadataText(event.target.value)}
            />
          </label>

          <h4>Parents</h4>
          <label>
            Search Parent Nodes
            <input
              value={newNodeParentSearchText}
              onChange={(event) => setNewNodeParentSearchText(event.target.value)}
              placeholder="Type to filter parents by name or id"
            />
          </label>

          <div className="parent-selected-list">
            {newNodeParentIds.length > 0 ? newNodeParentIds.map((parentId) => {
              const parent = graph.nodes[parentId]
              if (!parent) {
                return null
              }

              return (
                <div key={parentId} className="parent-selected-item">
                  <span>{parent.label}</span>
                  <button type="button" onClick={() => toggleParent(parentId)}>Remove</button>
                </div>
              )
            }) : <p>No parents selected.</p>}
          </div>

          <div className="parent-option-list">
            {parentSelectionOptions.length > 0 ? parentSelectionOptions.map((node) => {
              const selected = newNodeParentIds.includes(node.id)
              return (
                <button
                  key={node.id}
                  type="button"
                  className={selected ? 'selected' : ''}
                  onClick={() => toggleParent(node.id)}
                >
                  {selected ? 'Selected: ' : 'Add: '}
                  {node.label}
                  <span>{node.id}</span>
                </button>
              )
            }) : <p>No parent matches found.</p>}
          </div>

          <button type="button" onClick={addNode}>Add Node</button>
        </section>
      )
    }

    if (panelMode === 'add-edge') {
      return (
        <section className="panel">
          <h2>Add Connection</h2>
          <label>
            Source
            <select value={newEdgeSource} onChange={(event) => setNewEdgeSource(event.target.value)}>
              <option value="">Select source</option>
              {Object.values(graph.nodes).map((node) => (
                <option key={node.id} value={node.id}>{node.label}</option>
              ))}
            </select>
          </label>
          <label>
            Target
            <select value={newEdgeTarget} onChange={(event) => setNewEdgeTarget(event.target.value)}>
              <option value="">Select target</option>
              {Object.values(graph.nodes).map((node) => (
                <option key={node.id} value={node.id}>{node.label}</option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={newEdgeType} onChange={(event) => setNewEdgeType(event.target.value as EdgeType)}>
              <option value="related">related</option>
              <option value="depends-on">depends-on</option>
              <option value="hierarchy">hierarchy</option>
            </select>
          </label>
          <label>
            Strength ({newEdgeStrength.toFixed(2)})
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={newEdgeStrength}
              onChange={(event) => setNewEdgeStrength(Number(event.target.value))}
            />
          </label>
          <button type="button" onClick={addEdge}>Add Connection</button>
          <button type="button" onClick={removeEdge}>Remove Connection</button>
        </section>
      )
    }

    if (panelMode === 'style') {
      return (
        <section className="panel">
          <h2>Style</h2>
          <label>
            Floating Buttons Transparency ({overlayStyle.floatingOpacity.toFixed(2)})
            <input
              type="range"
              min="0.15"
              max="0.95"
              step="0.01"
              value={overlayStyle.floatingOpacity}
              onChange={(event) => {
                const value = Number(event.target.value)
                setOverlayStyle((old) => ({ ...old, floatingOpacity: clampOpacity(value) }))
              }}
            />
          </label>
          <label>
            Sidebar Transparency ({overlayStyle.sidebarOpacity.toFixed(2)})
            <input
              type="range"
              min="0.15"
              max="0.95"
              step="0.01"
              value={overlayStyle.sidebarOpacity}
              onChange={(event) => {
                const value = Number(event.target.value)
                setOverlayStyle((old) => ({ ...old, sidebarOpacity: clampOpacity(value) }))
              }}
            />
          </label>
          <label>
            Top Chip Transparency ({overlayStyle.chipOpacity.toFixed(2)})
            <input
              type="range"
              min="0.15"
              max="0.95"
              step="0.01"
              value={overlayStyle.chipOpacity}
              onChange={(event) => {
                const value = Number(event.target.value)
                setOverlayStyle((old) => ({ ...old, chipOpacity: clampOpacity(value) }))
              }}
            />
          </label>
          <button type="button" onClick={() => setOverlayStyle(DEFAULT_OVERLAY_STYLE)}>Reset Style</button>
        </section>
      )
    }

    if (panelMode === 'history') {
      return (
        <section className="panel">
          <h2>Version History</h2>
          <p>{versions.length} versions stored locally.</p>
          <button type="button" onClick={exportAndCommitGraph}>Export + Git Commit</button>
          <div className="versions-list">
            {versions.length === 0 ? (
              <p>No versions yet. Make edits to create snapshots.</p>
            ) : (
              versions.map((version) => (
                <div key={version.id} className="version-card">
                  <div className="version-time">{new Date(version.createdAt).toLocaleString()}</div>
                  <div className="version-message">{version.message}</div>
                  <button type="button" onClick={() => restoreVersion(version)}>Restore</button>
                </div>
              ))
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="panel">
        <h2>Node Details</h2>
        {selectedNode ? (
          <>
            {(() => {
              const pioneers = metadataListFromNode(selectedNode, 'pioneers')
              const books = metadataListFromNode(selectedNode, 'books')
              const wikipedia = metadataStringFromNode(selectedNode, 'wikipedia')

              return (
                <>
            <h3>{selectedNode.label}</h3>
            <div className="kv-grid">
              <div>Id</div><div>{selectedNode.id}</div>
              <div>Current</div><div>{selectedNode.label}</div>
            </div>

            {editorState && (
              <div className="editor-grid">
                <label>
                  Label
                  <input
                    value={editorState.label}
                    onChange={(event) => setEditorState((old) => old ? { ...old, label: event.target.value } : old)}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={editorState.description}
                    onChange={(event) => setEditorState((old) => old ? { ...old, description: event.target.value } : old)}
                  />
                </label>

                <label>
                  Parents (comma-separated IDs)
                  <input
                    value={editorState.parentsText}
                    onChange={(event) => setEditorState((old) => old ? { ...old, parentsText: event.target.value } : old)}
                  />
                </label>

                <label>
                  Children (comma-separated IDs)
                  <input
                    value={editorState.childrenText}
                    onChange={(event) => setEditorState((old) => old ? { ...old, childrenText: event.target.value } : old)}
                  />
                </label>

                <label>
                  Pioneers (comma-separated)
                  <textarea
                    value={editorState.pioneersText}
                    onChange={(event) => setEditorState((old) => old ? { ...old, pioneersText: event.target.value } : old)}
                  />
                </label>

                <label>
                  Wikipedia Link
                  <input
                    value={editorState.wikipedia}
                    onChange={(event) => setEditorState((old) => old ? { ...old, wikipedia: event.target.value } : old)}
                  />
                </label>

                <label>
                  Books (comma-separated)
                  <textarea
                    value={editorState.booksText}
                    onChange={(event) => setEditorState((old) => old ? { ...old, booksText: event.target.value } : old)}
                  />
                </label>

                <label>
                  Extra Metadata JSON
                  <textarea
                    value={editorState.extraMetadataText}
                    onChange={(event) => setEditorState((old) => old ? { ...old, extraMetadataText: event.target.value } : old)}
                  />
                </label>

                <button type="button" onClick={saveNodeEdits}>Save Node Changes</button>
                <button type="button" onClick={() => moveNodeToNewPosition(selectedNode.id)}>Move Node Position</button>
              </div>
            )}

            {pioneers.length > 0 && (
              <>
                <h4>Pioneers</h4>
                <ul className="metadata-list">
                  {pioneers.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </>
            )}

            {wikipedia && (
              <>
                <h4>Wikipedia</h4>
                <p>
                  <a href={wikipedia} target="_blank" rel="noreferrer" className="metadata-link">
                    {wikipedia}
                  </a>
                </p>
              </>
            )}

            <h4>Books ({books.length})</h4>
            {books.length > 0 ? (
              <div className="books-scroll">
                <ul className="metadata-list">
                  {books.map((book) => (
                    <li key={book}>{book}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No books listed.</p>
            )}

            <details className="metadata-section">
              <summary>Metadata (JSON)</summary>
              <pre>{JSON.stringify(selectedNode.metadata, null, 2)}</pre>
            </details>
                </>
              )
            })()}
          </>
        ) : (
          <p>Select a node to view details.</p>
        )}
      </section>
    )
  }

  const renderAdminPage = () => {
    const node = adminSelectedNode
    const nodeParents = node?.parents ?? []
    const nodeChildren = node?.children ?? []
    const nodeGrandchildren = [...new Set(nodeChildren.flatMap((childId) => graph.nodes[childId]?.children ?? []))]

    return (
      <section className="admin-page">
        <header className="admin-header">
          <h2>Admin Editor</h2>
          <p>Edit any node from the hierarchy tree.</p>
          <label>
            Search Tree
            <input
              type="text"
              placeholder="Search by label, id, description..."
              value={adminSearchText}
              onChange={(event) => setAdminSearchText(event.target.value)}
            />
          </label>
        </header>

        <div className="admin-body">
          <div className="admin-tree">
            {adminRootIds.map((rootId) => renderAdminTreeNode(rootId, 0, new Set()))}
          </div>

          <div className="admin-editor">
            {node && editorState ? (
              <>
                <h3>{node.label}</h3>
                <div className="kv-grid">
                  <div>Id</div><div>{node.id}</div>
                  <div>Parents</div><div>{node.parents.length}</div>
                  <div>Children</div><div>{node.children.length}</div>
                </div>

                <div className="editor-grid">
                  <label>
                    Label
                    <input
                      value={editorState.label}
                      onChange={(event) => setEditorState((old) => old ? { ...old, label: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={editorState.description}
                      onChange={(event) => setEditorState((old) => old ? { ...old, description: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Parents (comma-separated IDs)
                    <input
                      value={editorState.parentsText}
                      onChange={(event) => setEditorState((old) => old ? { ...old, parentsText: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Children (comma-separated IDs)
                    <input
                      value={editorState.childrenText}
                      onChange={(event) => setEditorState((old) => old ? { ...old, childrenText: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Pioneers (comma-separated)
                    <textarea
                      value={editorState.pioneersText}
                      onChange={(event) => setEditorState((old) => old ? { ...old, pioneersText: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Wikipedia Link
                    <input
                      value={editorState.wikipedia}
                      onChange={(event) => setEditorState((old) => old ? { ...old, wikipedia: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Books (comma-separated)
                    <textarea
                      value={editorState.booksText}
                      onChange={(event) => setEditorState((old) => old ? { ...old, booksText: event.target.value } : old)}
                    />
                  </label>
                  <label>
                    Extra Metadata JSON
                    <textarea
                      value={editorState.extraMetadataText}
                      onChange={(event) => setEditorState((old) => old ? { ...old, extraMetadataText: event.target.value } : old)}
                    />
                  </label>
                  <button type="button" onClick={saveNodeEdits}>Save Node Changes</button>
                  <button type="button" onClick={() => moveNodeToNewPosition(node.id)}>Move Node Position</button>
                </div>

                <h4>Parents</h4>
                <div className="admin-relation-list">
                  {nodeParents.length > 0 ? nodeParents.map((id) => (
                    <div key={id} className="admin-relation-item">
                      <button type="button" className="admin-link-button" onClick={() => selectNodeForEditing(id)}>
                        {graph.nodes[id]?.label ?? id}
                      </button>
                      <button type="button" className="admin-remove-button" onClick={() => removeParentLink(id)}>
                        Remove
                      </button>
                    </div>
                  )) : <p>No parents.</p>}
                </div>

                <h4>Children</h4>
                <div className="admin-relation-list">
                  {nodeChildren.length > 0 ? nodeChildren.map((id) => (
                    <div key={id} className="admin-relation-item">
                      <button type="button" className="admin-link-button" onClick={() => selectNodeForEditing(id)}>
                        {graph.nodes[id]?.label ?? id}
                      </button>
                      <button type="button" className="admin-remove-button" onClick={() => removeChildLink(id)}>
                        Remove
                      </button>
                    </div>
                  )) : <p>No children.</p>}
                </div>

                <h4>Grandchildren</h4>
                <div className="admin-relation-list">
                  {nodeGrandchildren.length > 0 ? nodeGrandchildren.map((id) => (
                    <button key={id} type="button" onClick={() => selectNodeForEditing(id)}>
                      {graph.nodes[id]?.label ?? id}
                    </button>
                  )) : <p>No grandchildren.</p>}
                </div>

                <div className="admin-danger-zone">
                  <h4>Remove Node</h4>
                  <button type="button" className="admin-delete-node" onClick={deleteSelectedNode}>Delete This Node</button>
                </div>
              </>
            ) : (
              <p>Select a node in the admin tree.</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  const appShellStyle = {
    '--floating-opacity': String(overlayStyle.floatingOpacity),
    '--sidebar-opacity': String(overlayStyle.sidebarOpacity),
    '--chip-opacity': String(overlayStyle.chipOpacity),
  } as CSSProperties

  return (
    <div className="app-shell" style={appShellStyle}>
      <Universe3D
        nodes={visibleNodes}
        edges={visibleEdges}
        currentNodeId={activeCurrentNodeId}
        selectedNodeId={activeSelectedNodeId}
        onSelectNode={handleSelectNode}
        onEnterNode={handleNavigateIn}
        onExitNode={handleNavigateOut}
        onBackgroundClick={handleBackgroundClick}
      />

      <div className="floating-actions" role="toolbar" aria-label="Map controls">
        <button
          type="button"
          className={panelMode === 'search' ? 'active' : ''}
          onClick={() => {
            setPanelMode((old) => {
              const next = old === 'search' ? 'none' : 'search'
              if (next === 'search') {
                setSearchText('')
              }
              return next
            })
          }}
        >
          Search
        </button>
        <button
          type="button"
          className={panelMode === 'add-node' ? 'active' : ''}
          onClick={() => setPanelMode((old) => (old === 'add-node' ? 'none' : 'add-node'))}
        >
          Add Node
        </button>
        <button
          type="button"
          className={panelMode === 'add-edge' ? 'active' : ''}
          onClick={() => setPanelMode((old) => (old === 'add-edge' ? 'none' : 'add-edge'))}
        >
          Add Link
        </button>
        <button
          type="button"
          className={panelMode === 'style' ? 'active' : ''}
          onClick={() => setPanelMode((old) => (old === 'style' ? 'none' : 'style'))}
        >
          Style
        </button>
        <button
          type="button"
          className={panelMode === 'history' ? 'active' : ''}
          onClick={() => setPanelMode((old) => (old === 'history' ? 'none' : 'history'))}
        >
          History
        </button>
        <button
          type="button"
          className={panelMode === 'admin' ? 'active' : ''}
          onClick={() => setPanelMode((old) => (old === 'admin' ? 'none' : 'admin'))}
        >
          Admin
        </button>
        <button type="button" onClick={resetData}>Reset</button>
      </div>

      <div className="focus-chip">Universe: {currentNode?.label ?? 'N/A'}</div>

      <button type="button" className="home-button" onClick={goToHomeUniverse} aria-label="Home">
        <svg className="icon-home" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3 3 10h2v10h5v-6h4v6h5V10h2L12 3z" />
        </svg>
      </button>

      <details className="legend-panel">
        <summary aria-label="Legend">
          <svg className="icon-legend" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 10.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM10.9 11.9h2.2v4.7h-2.2z" />
          </svg>
          <span className="sr-only">Legend</span>
        </summary>
        <div className="legend-content">
          <h4>Node Colors</h4>
          <ul className="legend-list">
            <li>
              <span className="legend-swatch" style={{ background: '#f6d889' }} aria-hidden="true" />
              <span>Current Node</span>
            </li>
            <li>
              <span className="legend-swatch" style={{ background: '#ff9f6b' }} aria-hidden="true" />
              <span>Parent of Current</span>
            </li>
            <li>
              <span className="legend-swatch" style={{ background: '#4edab5' }} aria-hidden="true" />
              <span>Child of Current</span>
            </li>
            <li>
              <span className="legend-swatch" style={{ background: '#d58dff' }} aria-hidden="true" />
              <span>Both Parent and Child</span>
            </li>
            <li>
              <span className="legend-swatch" style={{ background: '#57a6ff' }} aria-hidden="true" />
              <span>Other Visible Node</span>
            </li>
          </ul>

          <h4>Link Colors</h4>
          <ul className="legend-list">
            <li>
              <span className="legend-swatch" style={{ background: '#66d5ff' }} aria-hidden="true" />
              <span>Hierarchy</span>
            </li>
            <li>
              <span className="legend-swatch" style={{ background: '#91f5ba' }} aria-hidden="true" />
              <span>Related</span>
            </li>
            <li>
              <span className="legend-swatch" style={{ background: '#ffbe7d' }} aria-hidden="true" />
              <span>Depends-on</span>
            </li>
          </ul>
        </div>
      </details>

      {panelMode === 'admin' && renderAdminPage()}

      {panelMode !== 'none' && panelMode !== 'admin' && (
        <aside className="sidebar">
          <button type="button" className="close-panel" onClick={() => setPanelMode('none')}>Close</button>
          {renderSidebarPanel()}
          {errorMessage && <div className="error-box">{errorMessage}</div>}
          {infoMessage && <div className="info-box">{infoMessage}</div>}
        </aside>
      )}
    </div>
  )
}

export default App
