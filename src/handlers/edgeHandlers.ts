import type { EdgeType, GraphData } from '../types'
import { makeId, wouldCreateHierarchyCycle, addAttraction } from '../lib/graphStore'

export function addEdge(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType,
  strength: number,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): boolean {
  onError('')

  if (!sourceId || !targetId) {
    onError('Choose source and target nodes.')
    return false
  }

  if (sourceId === targetId) {
    onError('Source and target must be different.')
    return false
  }

  if (!graph.nodes[sourceId] || !graph.nodes[targetId]) {
    onError('Invalid source or target.')
    return false
  }

  if (edgeType === 'hierarchy' && wouldCreateHierarchyCycle(graph.nodes, sourceId, targetId)) {
    onError('This hierarchy edge would create a cycle. Not allowed.')
    return false
  }

  onGraphUpdate((old) => {
    onChangeMessage(`Added ${edgeType} edge ${sourceId} -> ${targetId}`)
    let nextNodes = { ...old.nodes }

    if (edgeType === 'hierarchy') {
      const s = nextNodes[sourceId]
      const t = nextNodes[targetId]
      if (!s.children.includes(targetId)) {
        nextNodes[sourceId] = { ...s, children: [...s.children, targetId] }
      }
      if (!t.parents.includes(sourceId)) {
        nextNodes[targetId] = { ...t, parents: [...t.parents, sourceId] }
      }
    }

    nextNodes = addAttraction(nextNodes, sourceId, targetId, strength)

    return {
      ...old,
      nodes: nextNodes,
      edges: [
        ...old.edges,
        {
          id: makeId(),
          source: sourceId,
          target: targetId,
          type: edgeType,
          strength: Number(strength.toFixed(2)),
        },
      ],
    }
  })

  onSuccess('Connection added successfully.')
  return true
}

export function removeEdge(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType,
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
  onChangeMessage: (msg: string) => void,
  onGraphUpdate: (updater: (old: GraphData) => GraphData) => void,
): boolean {
  onError('')

  if (!sourceId || !targetId) {
    onError('Choose source and target nodes.')
    return false
  }

  if (!graph.nodes[sourceId] || !graph.nodes[targetId]) {
    onError('Invalid source or target.')
    return false
  }

  let removedCount = 0
  onGraphUpdate((old) => {
    const nextEdges = old.edges.filter((edge) => {
      const matched = edge.source === sourceId && edge.target === targetId && edge.type === edgeType
      if (matched) {
        removedCount += 1
      }
      return !matched
    })

    if (removedCount === 0) {
      return old
    }

    if (edgeType !== 'hierarchy') {
      return {
        ...old,
        edges: nextEdges,
      }
    }

    const source = old.nodes[sourceId]
    const target = old.nodes[targetId]
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
        [sourceId]: {
          ...source,
          children: source.children.filter((id) => id !== targetId),
        },
        [targetId]: {
          ...target,
          parents: target.parents.filter((id) => id !== sourceId),
        },
      },
      edges: nextEdges,
    }
  })

  if (removedCount === 0) {
    onError('No matching connection found to remove.')
    return false
  }

  onChangeMessage(`Removed ${removedCount} ${edgeType} edge(s) ${sourceId} -> ${targetId}`)
  onSuccess(`Removed ${removedCount} ${edgeType} connection${removedCount === 1 ? '' : 's'} successfully.`)
  return true
}
