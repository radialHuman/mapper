import type { GraphData, GraphNode } from '../../types'
import type { NodeEditorState } from '../../utils/metadataUtils'

type AdminPageProps = {
  graph: GraphData
  adminSearchText: string
  onSetAdminSearchText: (text: string) => void
  adminSelectedNodeId: string
  adminExpandedNodeIds: string[]
  onToggleAdminExpand: (id: string) => void
  adminVisibleNodeSet: Set<string>
  adminRootIds: string[]
  onSelectNodeForEditing: (id: string) => void
  renderAdminTreeNode: (nodeId: string, depth: number, path: Set<string>) => React.ReactNode
  adminSelectedNode: GraphNode | undefined
  editorState: NodeEditorState | null
  onSetEditorState: (updater: (old: NodeEditorState | null) => NodeEditorState | null) => void
  onSaveNodeEdits: () => void
  onMoveNode: (nodeId: string) => void
  onRemoveParentLink: (parentId: string) => void
  onRemoveChildLink: (childId: string) => void
  onDeleteNode: () => void
  onOpenResetConfirmation: () => void
}

export function AdminPage({
  graph,
  adminSearchText,
  onSetAdminSearchText,
  adminRootIds,
  renderAdminTreeNode,
  adminSelectedNode,
  editorState,
  onSetEditorState,
  onSaveNodeEdits,
  onMoveNode,
  onRemoveParentLink,
  onRemoveChildLink,
  onDeleteNode,
  onOpenResetConfirmation,
}: AdminPageProps) {
  const nodeParents = adminSelectedNode?.parents ?? []
  const nodeChildren = adminSelectedNode?.children ?? []
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
            onChange={(event) => onSetAdminSearchText(event.target.value)}
          />
        </label>
      </header>

      <div className="admin-body">
        <div className="admin-tree">
          {adminRootIds.map((rootId) => renderAdminTreeNode(rootId, 0, new Set()))}
        </div>

        <div className="admin-editor">
          {adminSelectedNode && editorState ? (
            <>
              <h3>{adminSelectedNode.label}</h3>
              <div className="kv-grid">
                <div>Id</div>
                <div>{adminSelectedNode.id}</div>
                <div>Parents</div>
                <div>{adminSelectedNode.parents.length}</div>
                <div>Children</div>
                <div>{adminSelectedNode.children.length}</div>
              </div>

              <div className="editor-grid">
                <label>
                  Label
                  <input
                    value={editorState.label}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, label: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={editorState.description}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, description: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Parents (comma-separated IDs)
                  <input
                    value={editorState.parentsText}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, parentsText: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Children (comma-separated IDs)
                  <input
                    value={editorState.childrenText}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, childrenText: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Pioneers (comma-separated)
                  <textarea
                    value={editorState.pioneersText}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, pioneersText: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Wikipedia Link
                  <input
                    value={editorState.wikipedia}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, wikipedia: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Books (comma-separated)
                  <textarea
                    value={editorState.booksText}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, booksText: event.target.value } : old))
                    }
                  />
                </label>
                <label>
                  Extra Metadata JSON
                  <textarea
                    value={editorState.extraMetadataText}
                    onChange={(event) =>
                      onSetEditorState((old) => (old ? { ...old, extraMetadataText: event.target.value } : old))
                    }
                  />
                </label>
                <button type="button" onClick={onSaveNodeEdits}>
                  Save Node Changes
                </button>
                <button type="button" onClick={() => onMoveNode(adminSelectedNode.id)}>
                  Move Node Position
                </button>
              </div>

              <h4>Parents</h4>
              <div className="admin-relation-list">
                {nodeParents.length > 0 ? (
                  nodeParents.map((id) => (
                    <div key={id} className="admin-relation-item">
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => {
                          // Handle node selection if needed
                        }}
                      >
                        {graph.nodes[id]?.label ?? id}
                      </button>
                      <button type="button" className="admin-remove-button" onClick={() => onRemoveParentLink(id)}>
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No parents.</p>
                )}
              </div>

              <h4>Children</h4>
              <div className="admin-relation-list">
                {nodeChildren.length > 0 ? (
                  nodeChildren.map((id) => (
                    <div key={id} className="admin-relation-item">
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => {
                          // Handle node selection if needed
                        }}
                      >
                        {graph.nodes[id]?.label ?? id}
                      </button>
                      <button type="button" className="admin-remove-button" onClick={() => onRemoveChildLink(id)}>
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No children.</p>
                )}
              </div>

              <h4>Grandchildren</h4>
              <div className="admin-relation-list">
                {nodeGrandchildren.length > 0 ? (
                  nodeGrandchildren.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        // Handle node selection if needed
                      }}
                    >
                      {graph.nodes[id]?.label ?? id}
                    </button>
                  ))
                ) : (
                  <p>No grandchildren.</p>
                )}
              </div>

              <div className="admin-danger-zone">
                <h4>Remove Node</h4>
                <button type="button" className="admin-delete-node" onClick={onDeleteNode}>
                  Delete This Node
                </button>

                <h4 style={{ marginTop: '16px' }}>Reset Graph</h4>
                <button type="button" className="admin-delete-node" onClick={onOpenResetConfirmation}>
                  Reset All Data
                </button>
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
