import type { GraphData, GraphNode } from '../../types'

type AddNodePanelProps = {
  newNodeLabel: string
  onSetNewNodeLabel: (value: string) => void
  newNodeDescription: string
  onSetNewNodeDescription: (value: string) => void
  newNodeMetadataText: string
  onSetNewNodeMetadataText: (value: string) => void
  newNodeParentIds: string[]
  onToggleParent: (id: string) => void
  newNodeParentSearchText: string
  onSetNewNodeParentSearchText: (value: string) => void
  parentSelectionOptions: GraphNode[]
  graph: GraphData
  onAddNode: () => void
}

export function AddNodePanel({
  newNodeLabel,
  onSetNewNodeLabel,
  newNodeDescription,
  onSetNewNodeDescription,
  newNodeMetadataText,
  onSetNewNodeMetadataText,
  newNodeParentIds,
  onToggleParent,
  newNodeParentSearchText,
  onSetNewNodeParentSearchText,
  parentSelectionOptions,
  graph,
  onAddNode,
}: AddNodePanelProps) {
  return (
    <section className="panel">
      <h2>Add Node</h2>
      <label>
        Label
        <input value={newNodeLabel} onChange={(event) => onSetNewNodeLabel(event.target.value)} />
      </label>
      <label>
        Description
        <textarea value={newNodeDescription} onChange={(event) => onSetNewNodeDescription(event.target.value)} />
      </label>
      <label>
        Metadata JSON
        <textarea value={newNodeMetadataText} onChange={(event) => onSetNewNodeMetadataText(event.target.value)} />
      </label>

      <h4>Parents</h4>
      <label>
        Search Parent Nodes
        <input
          value={newNodeParentSearchText}
          onChange={(event) => onSetNewNodeParentSearchText(event.target.value)}
          placeholder="Type to filter parents by name or id"
        />
      </label>

      <div className="parent-selected-list">
        {newNodeParentIds.length > 0 ? (
          newNodeParentIds.map((parentId) => {
            const parent = graph.nodes[parentId]
            if (!parent) {
              return null
            }

            return (
              <div key={parentId} className="parent-selected-item">
                <span>{parent.label}</span>
                <button type="button" onClick={() => onToggleParent(parentId)}>
                  Remove
                </button>
              </div>
            )
          })
        ) : (
          <p>No parents selected.</p>
        )}
      </div>

      <div className="parent-option-list">
        {parentSelectionOptions.length > 0 ? (
          parentSelectionOptions.map((node) => {
            const selected = newNodeParentIds.includes(node.id)
            return (
              <button
                key={node.id}
                type="button"
                className={selected ? 'selected' : ''}
                onClick={() => onToggleParent(node.id)}
              >
                {selected ? 'Selected: ' : 'Add: '}
                {node.label}
                <span>{node.id}</span>
              </button>
            )
          })
        ) : (
          <p>No parent matches found.</p>
        )}
      </div>

      <button type="button" onClick={onAddNode}>
        Add Node
      </button>
    </section>
  )
}
