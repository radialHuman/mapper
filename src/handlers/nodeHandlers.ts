import type { GraphData, GraphNode, NodeMetadata } from '../types'
import { parseMetadata } from '../lib/graphStore'
import { parseCsv } from '../utils/csvUtils'
import { buildUniqueNodeId } from '../utils/nodeUtils'
import { makeId, wouldCreateHierarchyCycle } from '../lib/graphStore'

export function saveNodeEdits(
  selectedNode: GraphNode,
  editorState: any,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): boolean {
  onError('')

  const label = editorState.label.trim()
  if (!label) {
    onError('Label cannot be empty.')
    return false
  }

  const nextParents = [...new Set(parseCsv(editorState.parentsText))]
  const nextChildren = [...new Set(parseCsv(editorState.childrenText))]

  if (nextParents.includes(selectedNode.id) || nextChildren.includes(selectedNode.id)) {
    onError('A node cannot be its own parent or child.')
    return false
  }

  for (const parentId of nextParents) {
    if (!graph.nodes[parentId]) {
      onError(`Parent node not found: ${parentId}`)
      return false
    }
    if (wouldCreateHierarchyCycle(graph.nodes, parentId, selectedNode.id)) {
      onError(`Parent assignment would create cycle: ${parentId} -> ${selectedNode.id}`)
      return false
    }
  }

  for (const childId of nextChildren) {
    if (!graph.nodes[childId]) {
      onError(`Child node not found: ${childId}`)
      return false
    }
    if (wouldCreateHierarchyCycle(graph.nodes, selectedNode.id, childId)) {
      onError(`Child assignment would create cycle: ${selectedNode.id} -> ${childId}`)
      return false
    }
  }

  const extraMetadata = parseMetadata(editorState.extraMetadataText)
  if (!extraMetadata) {
    onError('Extra Metadata JSON must be a valid object.')
    return false
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

  onChangeMessage(`Edited node ${label}`)

  onGraphUpdate((old) => {
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

  onSuccess('Node changes saved.')
  return true
}

export function addNode(
  label: string,
  description: string,
  metadata: NodeMetadata,
  parentIds: string[],
  graph: GraphData,
  onError: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): GraphNode | null {
  onError('')

  if (!label.trim()) {
    onError('Node label is required.')
    return null
  }

  if (parentIds.length === 0) {
    onError('Choose at least one parent.')
    return null
  }

  const validParents = parentIds.filter((id) => Boolean(graph.nodes[id]))
  if (validParents.length === 0) {
    onError('Selected parents are invalid.')
    return null
  }

  const id = buildUniqueNodeId(label, graph.nodes)
  onChangeMessage(`Added node ${label}`)
  
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
    description: description.trim(),
    metadata,
    parents: validParents,
    children: [],
    position: {
      x: avg.x + Math.cos(theta) * Math.sin(phi) * radius,
      y: avg.y + Math.cos(phi) * radius,
      z: avg.z + Math.sin(theta) * Math.sin(phi) * radius,
    },
  }

  onGraphUpdate((old) => {
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

  return newNode
}

export function moveNodeToNewPosition(
  nodeId: string,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): void {
  const node = graph.nodes[nodeId]
  if (!node) {
    onError('Select a valid node first.')
    return
  }

  onChangeMessage(`Moved node ${node.label}`)
  onGraphUpdate((old) => {
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

  onSuccess(`Moved ${node.label} to a new position.`)
}

export function removeParentLink(
  nodeId: string,
  parentId: string,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): void {
  const node = graph.nodes[nodeId]
  if (!node) {
    return
  }

  if (!node.parents.includes(parentId)) {
    onError('Selected parent link does not exist.')
    return
  }

  onChangeMessage(`Removed parent ${parentId} from ${node.id}`)
  onGraphUpdate((old) => {
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

  onSuccess('Parent removed successfully.')
}

export function removeChildLink(
  nodeId: string,
  childId: string,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): void {
  const node = graph.nodes[nodeId]
  if (!node) {
    return
  }

  if (!node.children.includes(childId)) {
    onError('Selected child link does not exist.')
    return
  }

  onChangeMessage(`Removed child ${childId} from ${node.id}`)
  onGraphUpdate((old) => {
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

  onSuccess('Child removed successfully.')
}

export function deleteSelectedNode(
  nodeId: string,
  rootId: string,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): string | null {
  const node = graph.nodes[nodeId]
  if (!node) {
    return null
  }

  if (node.id === rootId) {
    onError('Root node cannot be deleted.')
    return null
  }

  const confirmed = window.confirm(
    `Delete node "${node.label}" (${node.id})? This will remove all direct parent/child links and edges.`,
  )
  if (!confirmed) {
    return null
  }

  const fallbackId =
    [...node.parents, ...node.children, rootId].find((id) => id !== node.id && Boolean(graph.nodes[id])) ??
    Object.keys(graph.nodes).find((id) => id !== node.id) ??
    rootId

  onChangeMessage(`Deleted node ${node.label}`)
  onGraphUpdate((old) => {
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

  onSuccess(`Deleted node ${node.label}.`)
  return fallbackId
}
