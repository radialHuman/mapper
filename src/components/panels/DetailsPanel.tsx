import type { GraphNode } from '../../types'
import type { NodeEditorState } from '../../utils/metadataUtils'
import { metadataListFromNode, metadataStringFromNode } from '../../utils/metadataUtils'

type DetailsPanelProps = {
  selectedNode: GraphNode | undefined
  editorState: NodeEditorState | null
  onSetEditorState: (updater: (old: NodeEditorState | null) => NodeEditorState | null) => void
  onSaveNodeEdits: () => void
  onMoveNode: (nodeId: string) => void
}

export function DetailsPanel({
  selectedNode,
  editorState,
  onSetEditorState,
  onSaveNodeEdits,
  onMoveNode,
}: DetailsPanelProps) {
  if (!selectedNode) {
    return (
      <section className="panel">
        <h2>Node Details</h2>
        <p>Select a node to view details.</p>
      </section>
    )
  }

  const pioneers = metadataListFromNode(selectedNode, 'pioneers')
  const books = metadataListFromNode(selectedNode, 'books')
  const wikipedia = metadataStringFromNode(selectedNode, 'wikipedia')

  return (
    <section className="panel">
      <h2>Node Details</h2>
      <h3>{selectedNode.label}</h3>
      <div className="kv-grid">
        <div>Id</div>
        <div>{selectedNode.id}</div>
        <div>Current</div>
        <div>{selectedNode.label}</div>
      </div>

      {editorState && (
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
          <button type="button" onClick={() => onMoveNode(selectedNode.id)}>
            Move Node Position
          </button>
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
    </section>
  )
}
