import type { GraphNode } from '../../types'

type SearchPanelProps = {
  searchText: string
  onSetSearchText: (text: string) => void
  searchResults: GraphNode[]
  onSelectResult: (nodeId: string) => void
}

export function SearchPanel({ searchText, onSetSearchText, searchResults, onSelectResult }: SearchPanelProps) {
  return (
    <section className="panel">
      <h2>Search</h2>
      <label>
        Find Node
        <input
          type="text"
          placeholder="Search by label, description, or metadata..."
          value={searchText}
          onChange={(event) => onSetSearchText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') {
              return
            }

            event.preventDefault()
            const first = searchResults[0]
            if (!first) {
              return
            }
            onSelectResult(first.id)
          }}
        />
      </label>
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((node) => (
            <button key={node.id} type="button" onClick={() => onSelectResult(node.id)}>
              {node.label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
