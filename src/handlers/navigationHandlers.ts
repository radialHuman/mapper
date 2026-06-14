import type { GraphData } from '../types'

export function handleNavigateIn(
  nodeId: string,
  currentNodeId: string,
  graph: GraphData,
  onSetHistory: (updater: (old: string[]) => string[]) => void,
  onSetCurrentNode: (id: string) => void,
  onSelectNode: (id: string) => void,
  onSetPanelMode: (mode: string) => void,
  onError: (msg: string) => void,
): void {
  if (nodeId === currentNodeId || !graph.nodes[nodeId]) {
    return
  }

  onSetHistory((old) => [...old, currentNodeId])
  onSetCurrentNode(nodeId)
  onSelectNode(nodeId)
  onSetPanelMode('none')
  onError('')
}

export function handleNavigateOut(
  currentNodeId: string,
  history: string[],
  graph: GraphData,
  onSetHistory: (updater: (old: string[]) => string[]) => void,
  onSetCurrentNode: (id: string) => void,
  onSelectNode: (id: string) => void,
  onSetPanelMode: (mode: string) => void,
  onError: (msg: string) => void,
): void {
  if (history.length > 0) {
    const next = history[history.length - 1]
    onSetHistory((old) => old.slice(0, -1))
    onSetCurrentNode(next)
    onSelectNode(next)
    onSetPanelMode('none')
    onError('')
    return
  }

  const currentNode = graph.nodes[currentNodeId]
  const fallbackParent = currentNode?.parents[0]
  if (fallbackParent && graph.nodes[fallbackParent]) {
    onSetCurrentNode(fallbackParent)
    onSelectNode(fallbackParent)
    onSetPanelMode('none')
    onError('')
  }
}

export function handleSelectNode(
  nodeId: string,
  onSelectNode: (id: string) => void,
  onSetPanelMode: (mode: string) => void,
  onError: (msg: string) => void,
): void {
  onSelectNode(nodeId)
  onSetPanelMode('details')
  onError('')
}

export function selectSearchResult(
  nodeId: string,
  onSelectNode: (id: string) => void,
  onSetCurrentNode: (id: string) => void,
  onSetHistory: (history: string[]) => void,
  onSetPanelMode: (mode: string) => void,
  onSetSearchText: (text: string) => void,
): void {
  onSelectNode(nodeId)
  onSetCurrentNode(nodeId)
  onSetHistory([])
  onSetPanelMode('details')
  onSetSearchText('')
}

export function goToHomeUniverse(
  rootId: string,
  graph: GraphData,
  onSetCurrentNode: (id: string) => void,
  onSelectNode: (id: string) => void,
  onSetEditorState: (state: any) => void,
  onSetHistory: (history: string[]) => void,
  onSetPanelMode: (mode: string) => void,
  onError: (msg: string) => void,
): void {
  const homeNode = graph.nodes[rootId]
  if (!homeNode) {
    return
  }

  onSetCurrentNode(rootId)
  onSelectNode(rootId)
  onSetHistory([])
  onSetPanelMode('none')
  onError('')
}
