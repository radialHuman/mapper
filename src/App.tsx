import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Universe3D from './components/Universe3D'
import { SearchPanel } from './components/panels/SearchPanel'
import { AddNodePanel } from './components/panels/AddNodePanel'
import { AddEdgePanel } from './components/panels/AddEdgePanel'
import { StylePanel } from './components/panels/StylePanel'
import { HistoryPanel } from './components/panels/HistoryPanel'
import { DetailsPanel } from './components/panels/DetailsPanel'
import { AdminPage } from './components/AdminPage'
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
} from './lib/graphStore'
import type { EdgeType, GraphData, GraphNode, GraphVersion } from './types'
import {
  loadOverlayStyle,
  OVERLAY_STYLE_KEY,
  DEFAULT_OVERLAY_STYLE,
  type OverlayStyle,
} from './utils/overlayStyleUtils'
import { buildUniqueNodeId } from './utils/nodeUtils'
import { metadataListFromNode, metadataStringFromNode, buildEditorState, type NodeEditorState } from './utils/metadataUtils'
import { parseCsv } from './utils/csvUtils'
import { saveNodeEdits, addNode, moveNodeToNewPosition, removeParentLink, removeChildLink, deleteSelectedNode } from './handlers/nodeHandlers'
import { addEdge, removeEdge } from './handlers/edgeHandlers'
import { handleNavigateIn, handleNavigateOut, handleSelectNode, selectSearchResult, goToHomeUniverse } from './handlers/navigationHandlers'
import { handleUploadGraph, exportAndCommitGraph } from './handlers/fileHandlers'
import './App.css'

type PanelMode = 'none' | 'details' | 'search' | 'add-node' | 'add-edge' | 'style' | 'history' | 'admin'

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
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [resetConfirmationInput, setResetConfirmationInput] = useState('')
  const [resetVerificationCode, setResetVerificationCode] = useState('')

  const changeMessageRef = useRef<string | null>(null)
  const previousGraphRef = useRef<GraphData>(initial)
  const hydratedRef = useRef(false)

  const activeCurrentNodeId = graph.nodes[currentNodeId] ? currentNodeId : graph.rootId
  const activeSelectedNodeId = graph.nodes[selectedNodeId] ? selectedNodeId : graph.rootId
  const currentNode = graph.nodes[activeCurrentNodeId]
  const selectedNode = graph.nodes[activeSelectedNodeId]

  // Effect: Save graph when it changes
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

  // Effect: Load graph from persistent storage
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

  // Effect: Save overlay style to localStorage
  useEffect(() => {
    localStorage.setItem(OVERLAY_STYLE_KEY, JSON.stringify(overlayStyle))
  }, [overlayStyle])

  // Effect: Update editor state when selected node changes
  useEffect(() => {
    const node = graph.nodes[adminSelectedNodeId] ?? graph.nodes[selectedNodeId]
    if (!node) {
      return
    }
    setEditorState(buildEditorState(node))
  }, [adminSelectedNodeId, graph.nodes, selectedNodeId])

  // Memos for visible nodes and edges
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

  // Search results
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

  // Parent selection options
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

  // Select node for editing
  const selectNodeForEditing = (nodeId: string) => {
    const node = graph.nodes[nodeId]
    if (!node) {
      return
    }

    setSelectedNodeId(nodeId)
    setAdminSelectedNodeId(nodeId)
    setEditorState(buildEditorState(node))
  }

  // Admin root IDs
  const adminRootIds = useMemo(() => {
    const roots = new Set<string>([graph.rootId])
    for (const node of Object.values(graph.nodes)) {
      if (node.parents.length === 0) {
        roots.add(node.id)
      }
    }
    return [...roots]
  }, [graph.nodes, graph.rootId])

  // Admin visible node set
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
          <button type="button" className="admin-node-button" onClick={() => selectNodeForEditing(nodeId)}>
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

  // Handler: Save node edits
  const handleSaveNodeEdits = () => {
    if (!selectedNode || !editorState) {
      return
    }

    saveNodeEdits(
      selectedNode,
      editorState,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )
  }

  // Handler: Restore version
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

  // Handler: Export and commit graph
  const handleExportAndCommitGraph = async () => {
    await exportAndCommitGraph(graph, setErrorMessage, setInfoMessage)
  }

  // Handler: Upload graph
  const handleUploadGraphFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    await handleUploadGraph(
      file,
      (uploadedGraph) => {
        changeMessageRef.current = 'Uploaded graph from JSON file'
        setGraph(uploadedGraph)
        setCurrentNodeId(uploadedGraph.rootId)
        setSelectedNodeId(uploadedGraph.rootId)
        setAdminSelectedNodeId(uploadedGraph.rootId)
        setAdminExpandedNodeIds([uploadedGraph.rootId])
        setHistory([])
        setSearchText('')
      },
      setCurrentNodeId,
      setSelectedNodeId,
      setHistory,
      setSearchText,
      setErrorMessage,
      setInfoMessage,
    )

    event.target.value = ''
  }

  // Handler: Navigate in
  const handleNavigateInNode = (nodeId: string) => {
    handleNavigateIn(
      nodeId,
      activeCurrentNodeId,
      graph,
      setHistory,
      setCurrentNodeId,
      selectNodeForEditing,
      setPanelMode,
      setErrorMessage,
    )
  }

  // Handler: Navigate out
  const handleNavigateOutNode = () => {
    handleNavigateOut(
      activeCurrentNodeId,
      history,
      graph,
      setHistory,
      setCurrentNodeId,
      selectNodeForEditing,
      setPanelMode,
      setErrorMessage,
    )
  }

  // Handler: Select node
  const handleSelectNodeUI = (nodeId: string) => {
    handleSelectNode(nodeId, selectNodeForEditing, setPanelMode, setErrorMessage)
  }

  // Handler: Select search result
  const handleSelectSearchResult = (nodeId: string) => {
    selectSearchResult(nodeId, selectNodeForEditing, setCurrentNodeId, setHistory, setPanelMode, setSearchText)
  }

  // Handler: Toggle parent
  const toggleParent = (id: string) => {
    setNewNodeParentIds((old) => {
      if (old.includes(id)) {
        return old.filter((item) => item !== id)
      }
      return [...old, id]
    })
  }

  // Handler: Add node
  const handleAddNode = () => {
    const metadata = parseMetadata(newNodeMetadataText)
    if (!metadata) {
      setErrorMessage('Metadata must be valid JSON object values.')
      return
    }

    const newNodeData = addNode(
      newNodeLabel,
      newNodeDescription,
      metadata,
      newNodeParentIds,
      graph,
      setErrorMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )

    if (newNodeData) {
      setSelectedNodeId(newNodeData.id)
      setAdminSelectedNodeId(newNodeData.id)
      setEditorState(buildEditorState(newNodeData))
      setNewNodeLabel('')
      setNewNodeDescription('')
      setNewNodeMetadataText('{\n  "kind": "custom"\n}')
      setNewNodeParentSearchText('')
      setInfoMessage('Node added successfully.')
    }
  }

  // Handler: Move node
  const handleMoveNodePosition = (nodeId: string) => {
    moveNodeToNewPosition(
      nodeId,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )
  }

  // Handler: Remove parent link
  const handleRemoveParentLink = (parentId: string) => {
    removeParentLink(
      adminSelectedNode?.id ?? selectedNode?.id ?? '',
      parentId,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )
  }

  // Handler: Remove child link
  const handleRemoveChildLink = (childId: string) => {
    removeChildLink(
      adminSelectedNode?.id ?? selectedNode?.id ?? '',
      childId,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )
  }

  // Handler: Delete node
  const handleDeleteNode = () => {
    const fallbackId = deleteSelectedNode(
      adminSelectedNode?.id ?? '',
      graph.rootId,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )

    if (fallbackId) {
      setHistory((old) => old.filter((id) => id !== adminSelectedNode?.id))
      setCurrentNodeId((old) => (old === adminSelectedNode?.id ? fallbackId : old))
      setSelectedNodeId(fallbackId)
      setAdminSelectedNodeId(fallbackId)
      setAdminExpandedNodeIds((old) => old.filter((id) => id !== adminSelectedNode?.id))
    }
  }

  // Handler: Add edge
  const handleAddEdge = () => {
    addEdge(
      newEdgeSource,
      newEdgeTarget,
      newEdgeType,
      newEdgeStrength,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )
  }

  // Handler: Remove edge
  const handleRemoveEdge = () => {
    removeEdge(
      newEdgeSource,
      newEdgeTarget,
      newEdgeType,
      graph,
      setErrorMessage,
      setInfoMessage,
      (msg) => {
        changeMessageRef.current = msg
      },
      setGraph,
    )
  }

  // Handler: Reset data
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
    setShowResetConfirmation(false)
    setResetConfirmationInput('')
  }

  const openResetConfirmation = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    setResetVerificationCode(code)
    setResetConfirmationInput('')
    setShowResetConfirmation(true)
  }

  const handleConfirmReset = () => {
    if (resetConfirmationInput.toUpperCase() === resetVerificationCode) {
      resetData()
    } else {
      setErrorMessage('Verification code does not match. Please try again.')
      setResetConfirmationInput('')
    }
  }

  const goToHome = () => {
    goToHomeUniverse(
      graph.rootId,
      graph,
      setCurrentNodeId,
      selectNodeForEditing,
      setEditorState,
      setHistory,
      setPanelMode,
      setErrorMessage,
    )
  }

  // Render sidebar panel based on mode
  const renderSidebarPanel = () => {
    switch (panelMode) {
      case 'search':
        return <SearchPanel searchText={searchText} onSetSearchText={setSearchText} searchResults={searchResults} onSelectResult={handleSelectSearchResult} />
      case 'add-node':
        return (
          <AddNodePanel
            newNodeLabel={newNodeLabel}
            onSetNewNodeLabel={setNewNodeLabel}
            newNodeDescription={newNodeDescription}
            onSetNewNodeDescription={setNewNodeDescription}
            newNodeMetadataText={newNodeMetadataText}
            onSetNewNodeMetadataText={setNewNodeMetadataText}
            newNodeParentIds={newNodeParentIds}
            onToggleParent={toggleParent}
            newNodeParentSearchText={newNodeParentSearchText}
            onSetNewNodeParentSearchText={setNewNodeParentSearchText}
            parentSelectionOptions={parentSelectionOptions}
            graph={graph}
            onAddNode={handleAddNode}
          />
        )
      case 'add-edge':
        return (
          <AddEdgePanel
            newEdgeSource={newEdgeSource}
            onSetNewEdgeSource={setNewEdgeSource}
            newEdgeTarget={newEdgeTarget}
            onSetNewEdgeTarget={setNewEdgeTarget}
            newEdgeType={newEdgeType}
            onSetNewEdgeType={setNewEdgeType}
            newEdgeStrength={newEdgeStrength}
            onSetNewEdgeStrength={setNewEdgeStrength}
            graph={graph}
            onAddEdge={handleAddEdge}
            onRemoveEdge={handleRemoveEdge}
          />
        )
      case 'style':
        return <StylePanel overlayStyle={overlayStyle} onSetOverlayStyle={setOverlayStyle} />
      case 'history':
        return (
          <HistoryPanel versions={versions} onExportAndCommit={handleExportAndCommitGraph} onRestoreVersion={restoreVersion} />
        )
      default:
        return (
          <DetailsPanel
            selectedNode={selectedNode}
            editorState={editorState}
            onSetEditorState={setEditorState}
            onSaveNodeEdits={handleSaveNodeEdits}
            onMoveNode={handleMoveNodePosition}
          />
        )
    }
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
        onSelectNode={handleSelectNodeUI}
        onEnterNode={handleNavigateInNode}
        onExitNode={handleNavigateOutNode}
        onBackgroundClick={() => setPanelMode('none')}
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
      </div>

      <div className="focus-chip">Universe: {currentNode?.label ?? 'N/A'}</div>

      <button type="button" className="home-button" onClick={goToHome} aria-label="Home">
        <svg className="icon-home" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3 3 10h2v10h5v-6h4v6h5V10h2L12 3z" />
        </svg>
      </button>

      <div className="vertical-actions">
        <button
          type="button"
          className="download-button"
          title="Download graph (JSON)"
          onClick={() => handleExportAndCommitGraph()}
          aria-label="Download graph"
        >
          <svg className="icon-download" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3v10m0 0-4-4m4 4 4-4M4 21h16" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          className="upload-button"
          title="Upload graph (JSON)"
          onClick={() => {
            const input = document.getElementById('graph-upload-input') as HTMLInputElement
            input?.click()
          }}
          aria-label="Upload graph"
        >
          <svg className="icon-upload" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 21V11m0 0 4 4m-4-4-4 4M4 3h16" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input
          id="graph-upload-input"
          type="file"
          accept=".json,application/json"
          onChange={handleUploadGraphFile}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        <button
          type="button"
          className="save-db-button"
          title="Save graph to IndexedDB"
          onClick={() => {
            saveGraph(graph)
            setInfoMessage('Saved graph to localStorage and IndexedDB.')
            setTimeout(() => setInfoMessage(null), 2500)
          }}
          aria-label="Save graph to DB"
        >
          <svg className="icon-save" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 21h14V7H5v14zM5 7l7-4 7 4" strokeWidth="1" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

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

      {panelMode === 'admin' && (
        <AdminPage
          graph={graph}
          adminSearchText={adminSearchText}
          onSetAdminSearchText={setAdminSearchText}
          adminSelectedNodeId={adminSelectedNodeId}
          adminExpandedNodeIds={adminExpandedNodeIds}
          onToggleAdminExpand={toggleAdminExpand}
          adminVisibleNodeSet={adminVisibleNodeSet}
          adminRootIds={adminRootIds}
          onSelectNodeForEditing={selectNodeForEditing}
          renderAdminTreeNode={renderAdminTreeNode}
          adminSelectedNode={adminSelectedNode}
          editorState={editorState}
          onSetEditorState={setEditorState}
          onSaveNodeEdits={handleSaveNodeEdits}
          onMoveNode={handleMoveNodePosition}
          onRemoveParentLink={handleRemoveParentLink}
          onRemoveChildLink={handleRemoveChildLink}
          onDeleteNode={handleDeleteNode}
          onOpenResetConfirmation={openResetConfirmation}
        />
      )}

      {panelMode !== 'none' && panelMode !== 'admin' && (
        <aside className="sidebar">
          <button type="button" className="close-panel" onClick={() => setPanelMode('none')}>
            Close
          </button>
          {renderSidebarPanel()}
          {errorMessage && <div className="error-box">{errorMessage}</div>}
          {infoMessage && <div className="info-box">{infoMessage}</div>}
        </aside>
      )}

      {showResetConfirmation && (
        <div className="reset-confirmation-overlay">
          <div className="reset-confirmation-dialog">
            <h3>⚠️ Reset All Data</h3>
            <p>This will permanently reset your graph to the original seed data. This action cannot be undone.</p>
            <p>To confirm you are conscious and understand this action, please type the following code:</p>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontFamily: 'monospace', fontSize: '18px', color: '#ffd700', fontWeight: 'bold', letterSpacing: '4px' }}>
              {resetVerificationCode}
            </div>
            <label>
              Enter the code above:
              <input
                type="text"
                placeholder="Type the code here"
                value={resetConfirmationInput}
                onChange={(e) => setResetConfirmationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resetConfirmationInput.toUpperCase() === resetVerificationCode) {
                    handleConfirmReset()
                  }
                }}
              />
            </label>
            <div className="dialog-buttons">
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmation(false)
                  setResetConfirmationInput('')
                }}
              >
                Cancel
              </button>
              <button type="button" className="confirm-button" onClick={handleConfirmReset} disabled={!resetConfirmationInput}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
