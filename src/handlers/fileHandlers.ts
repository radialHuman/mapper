import type { GraphData } from '../types'

export async function handleUploadGraph(
  file: File,
  onSetGraph: (graph: GraphData) => void,
  onSetCurrentNode: (id: string) => void,
  onSetSelectedNode: (id: string) => void,
  onSetHistory: (history: string[]) => void,
  onSetSearchText: (text: string) => void,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
): Promise<void> {
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const uploadedGraph = JSON.parse(content) as GraphData

      // Validate that it has the required structure
      if (!uploadedGraph.rootId || !uploadedGraph.nodes || !uploadedGraph.edges) {
        onError('Invalid graph JSON: missing rootId, nodes, or edges.')
        return
      }

      onSetGraph(uploadedGraph)
      onSetCurrentNode(uploadedGraph.rootId)
      onSetSelectedNode(uploadedGraph.rootId)
      onSetHistory([])
      onSetSearchText('')
      onError('')
      onSuccess(
        `Graph updated with ${Object.keys(uploadedGraph.nodes).length} nodes and ${uploadedGraph.edges.length} edges.`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      onError(`Failed to parse JSON: ${message}`)
    }
  }

  reader.onerror = () => {
    onError('Failed to read file.')
  }

  reader.readAsText(file)
}

export async function exportAndCommitGraph(
  graph: GraphData,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
): Promise<void> {
  onError('')

  const message = `Graph snapshot ${new Date().toISOString()}`
  const desktop = (window as any).mapperDesktop

  if (desktop?.exportAndCommitGraph) {
    const result = await desktop.exportAndCommitGraph(graph, message)
    if (result.ok) {
      onSuccess(result.message)
    } else {
      onError(result.message)
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
  onSuccess('Snapshot downloaded. Git commit is available in desktop mode.')
}
