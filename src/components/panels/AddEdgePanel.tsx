import type { EdgeType, GraphData } from '../../types'

type AddEdgePanelProps = {
  newEdgeSource: string
  onSetNewEdgeSource: (value: string) => void
  newEdgeTarget: string
  onSetNewEdgeTarget: (value: string) => void
  newEdgeType: EdgeType
  onSetNewEdgeType: (value: EdgeType) => void
  newEdgeStrength: number
  onSetNewEdgeStrength: (value: number) => void
  graph: GraphData
  onAddEdge: () => void
  onRemoveEdge: () => void
}

export function AddEdgePanel({
  newEdgeSource,
  onSetNewEdgeSource,
  newEdgeTarget,
  onSetNewEdgeTarget,
  newEdgeType,
  onSetNewEdgeType,
  newEdgeStrength,
  onSetNewEdgeStrength,
  graph,
  onAddEdge,
  onRemoveEdge,
}: AddEdgePanelProps) {
  return (
    <section className="panel">
      <h2>Add Connection</h2>
      <label>
        Source
        <select value={newEdgeSource} onChange={(event) => onSetNewEdgeSource(event.target.value)}>
          <option value="">Select source</option>
          {Object.values(graph.nodes).map((node) => (
            <option key={node.id} value={node.id}>
              {node.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Target
        <select value={newEdgeTarget} onChange={(event) => onSetNewEdgeTarget(event.target.value)}>
          <option value="">Select target</option>
          {Object.values(graph.nodes).map((node) => (
            <option key={node.id} value={node.id}>
              {node.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type
        <select value={newEdgeType} onChange={(event) => onSetNewEdgeType(event.target.value as EdgeType)}>
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
          onChange={(event) => onSetNewEdgeStrength(Number(event.target.value))}
        />
      </label>
      <button type="button" onClick={onAddEdge}>
        Add Connection
      </button>
      <button type="button" onClick={onRemoveEdge}>
        Remove Connection
      </button>
    </section>
  )
}
