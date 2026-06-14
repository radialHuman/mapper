import type { GraphVersion } from '../../types'

type HistoryPanelProps = {
  versions: GraphVersion[]
  onExportAndCommit: () => void
  onRestoreVersion: (version: GraphVersion) => void
}

export function HistoryPanel({ versions, onExportAndCommit, onRestoreVersion }: HistoryPanelProps) {
  return (
    <section className="panel">
      <h2>Version History</h2>
      <p>{versions.length} versions stored locally.</p>
      <button type="button" onClick={onExportAndCommit}>
        Export + Git Commit
      </button>
      <div className="versions-list">
        {versions.length === 0 ? (
          <p>No versions yet. Make edits to create snapshots.</p>
        ) : (
          versions.map((version, index) => (
            <div key={version.id} className="version-card">
              <div className="version-time">{new Date(version.createdAt).toLocaleString()}</div>
              <div className="version-message">{version.message}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => onRestoreVersion(version)}>
                  Restore
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const previousVersion = versions[index - 1]
                      onRestoreVersion(previousVersion)
                    }}
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
