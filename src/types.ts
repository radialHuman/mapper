export type MetadataValue = string | string[]

export type NodeMetadata = Record<string, MetadataValue>

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type EdgeType = 'hierarchy' | 'related' | 'depends-on'

export type GraphNode = {
  id: string
  label: string
  description: string
  metadata: NodeMetadata
  parents: string[]
  children: string[]
  position: Vec3
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  type: EdgeType
  strength: number
}

export type GraphData = {
  nodes: Record<string, GraphNode>
  edges: GraphEdge[]
  rootId: string
}

export type GraphVersion = {
  id: string
  createdAt: string
  message: string
  graph: GraphData
}
