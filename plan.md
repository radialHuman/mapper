# Plan: Knowledge Graph Explorer — DAG-based Hierarchical Visualization (SINGLE-USER LOCAL)

## TL;DR
Build a 50k-node personal knowledge graph desktop app where users zoom into hierarchical universes with persistent spatial positioning. Single-user, all local (no backend). Uses SQLite, React + Three.js WebGL with viewport culling/LOD, force-directed layout algorithm respecting relationship strength. Desktop app (Electron/Tauri). Estimated launch in **1.5-2 months**.

**Key Changes from Original Plan:**
- ❌ Removed: Backend server, Neo4j, PostgreSQL infrastructure
- ✅ Added: Electron desktop app, SQLite local storage, WebWorker threading
- ⏱️ Timeline reduced from 2.5-3.5 months → 1.5-2 months
- 💰 Cost: $0 (all local, no hosting)
- 🎯 Hardware: GTX 1650 GPU (smooth 50-60 FPS at 50k nodes)

---

## Implementation Steps

### Phase 1: Foundation & Data Model (Week 1)
**Parallel work (no backend, just UI + DB schema):**

1. **SQLite schema design**
   - Table `nodes`: (id, label, type, metadata JSON, created_at, updated_at)
   - Table `positions`: (id, node_id, parent_id, x, y, z, updated_at) — stores 3D coordinates
   - Table `edges`: (id, source_id, target_id, edge_type, strength, metadata JSON)
   - Table `parents`: (node_id, parent_id) — junction table for multiple parents
   - Indexes: node_id, parent_id, edge lookups for fast queries
   - DAG validation: trigger or constraint to prevent cycles

2. **Electron/Tauri scaffolding**
   - Choose: Electron (heavier, more stable) or Tauri (lighter, newer)
   - Project structure: `src/main` (Rust/Node), `src/renderer` (React)
   - IPC communication: renderer ↔ main thread for database operations
   - SQLite library: `better-sqlite3` (Node.js, synchronous) or `rusqlite` (Rust)

3. **Frontend scaffolding**
   - React + TypeScript setup
   - Three.js scene initialization
   - Basic component structure: `Scene.tsx`, `DetailPanel.tsx`, `CreateNodeForm.tsx`
   - Render placeholder sphere for each node

4. **Data layer (Main thread)**
   - SQLite connection wrapper
   - Functions: `getNode()`, `getChildren()`, `getEdges()`, `addNode()`, `addEdge()`, `updatePosition()`
   - Error handling for DAG violations

**Deliverable:** SQLite database boots, Electron window opens, frontend renders a static scene with mock nodes.

---

### Phase 1.5: Demo Data (0.5 weeks)
**Populate demo graph:**
- Load sample knowledge graph (Physics → Astrophysics, Math → Physics, etc.)
- Verify multi-parent edges work
- Position nodes manually or with initial force-directed pass

**Deliverable:** Demo graph visible in app, can zoom and pan (no interaction yet).

---

### Phase 2: Spatial Layout Algorithm (Weeks 1.5-2.5)
**Main thread + WebWorker (no backend):**

5. **Layout computation engine (WebWorker)**
   - Implement force-directed graph layout (Fruchterman-Reingold or similar, adapted for DAGs)
   - Input: Graph structure + relationship strengths (passed from main thread)
   - Output: 3D coordinates (x, y, z) for each node
   - Logic: Related nodes attract, unrelated nodes repel, parents positioned centrally above children
   - Constraint: Respect existing saved positions (warmstart with previous layout)
   - Runs in WebWorker thread, non-blocking UI

6. **Position persistence & updates**
   - Save computed positions to SQLite `positions` table
   - On new node/edge addition: recompute affected subtree positions only (not full graph)
   - Cache positions in memory for fast rendering
   - Users can manually drag nodes to override positions (optional; not for launch)

7. **SQLite query optimization**
   - Index on (node_id, parent_id) for ancestor/descendant queries
   - Batch query functions: `getAllChildren(node_id)`, `getAllParents(node_id)`, `getPathToRoot(node_id)`
   - Memoization in renderer for repeated queries

**Deliverable:** Layout algorithm computes node positions locally, persisted to SQLite, renders in 3D with proper spacing.

---

### Phase 3: Core Visualization (Weeks 2.5-4)
**Frontend rendering + interaction:**

8. **WebGL rendering with Three.js**
   - Scene setup: camera positioned above "current universe"
   - Render nodes as spheres/planets (size by node type or hierarchy depth)
   - Render edges as lines (color by relationship type, dashed for cross-level)
   - Labels on nodes (billboarded text, readable at all zoom levels)
   - **Viewport culling:** Only render nodes within camera frustum + 20% margin
   - **LOD (Level of Detail):** Distant nodes render as simpler geometry (octahedron → cube → dot)
   - **Instanced rendering:** Draw similar nodes in one draw call (massive performance gain)

9. **Navigation interaction model**
   - **Double-click on node:** Smoothly zoom camera into that node (new center), load children from DB, render new universe
   - **Right-click or breadcrumb:** Zoom out to parent (pop from navigation stack)
   - **Pan/scroll:** Move camera within current view (mouse drag or arrow keys)
   - **Maintain navigation history stack:** Enable back/forward navigation
   - **Smooth animations:** Camera tween over 300-500ms

10. **Cross-level edge rendering**
    - Draw edges that connect nodes at different hierarchy levels
    - Use dashed or semi-transparent lines to indicate cross-level connections
    - Only render edges if at least one endpoint is visible in current view

11. **Single-click detail panel**
    - Query SQLite for node metadata
    - Render sidebar with node details, custom fields, parent/child list, related edges
    - Show relationship strength and edge types

**Deliverable:** Can navigate a real graph, see immediate children + cross-level edges, zoom in/out smoothly, details panel displays, 50-60 FPS rendering.

---

### Phase 4: Authoring & Node Creation (Weeks 4-4.5)
**Frontend + SQLite operations:**

12. **Add node UI**
    - Modal form triggered by keyboard shortcut (Ctrl+N) or menu
    - Fields: node label, node type (dropdown with predefined types), custom metadata (JSON editor)
    - Parent selection: searchable list of existing nodes (can select multiple)
    - Validate: no cycles (check if selected parents would create a cycle)
    - On save: insert into SQLite, recalculate affected positions, render new node

13. **Create edge/connection UI**
    - Right-click node → "Connect to" option
    - Select target node (search/autocomplete)
    - Specify edge type (dropdown) and strength (0-1 slider)
    - Validate: no cycles
    - On save: insert into SQLite, trigger partial layout recalculation

14. **Delete/edit operations**
    - Right-click node → "Delete" (confirm dialog)
    - Cascade delete edges where this node is source/target
    - Delete position records
    - Orphaned edges: leave in DB but don't render (for recovery purposes)
    - Update node metadata: double-click label or click "Edit" in sidebar

**Deliverable:** Can add nodes and edges in real-time, graph updates visually, layout recalculates incrementally.

---

### Phase 5: Search & Filtering (Weeks 4.5-5)
**SQLite queries + Frontend UI:**

15. **Search implementation**
    - Full-text search: node labels + metadata fields (SQLite FTS5 module)
    - Keyboard shortcut: Ctrl+F opens search modal
    - Results shown as clickable list (node name + type + snippet)
    - Clicking result: navigate to that node's universe, highlight it
    - Latency target: <500ms for 50k nodes

16. **Filtering UI**
    - Filter by node type: checkbox list in sidebar
    - Filter by edge type: toggle edges on/off
    - Filter by relationship strength: slider (show only edges ≥ threshold)
    - Apply filters: hide nodes/edges in renderer, no DB modification

**Deliverable:** Search finds nodes quickly. Filters hide/show subgraphs. Highlighting shows location.

---

### Phase 6: Performance Optimization (Weeks 5-5.5)
**Frontend + SQLite tuning:**

17. **Rendering optimization**
    - **Instanced rendering:** Use THREE.InstancedMesh for nodes of same type (draw 1000s in one call)
    - **Level-of-detail (LOD):** Octahedron (8 verts) → Cube (8 verts) → Sphere (simple) → Dot (1 pixel)
    - **Edge culling:** Only render edges where at least one endpoint is visible
    - **Frustum culling:** Don't even update nodes outside camera frustum
    - **Texture atlasing:** Combine all node textures into one atlas (if using textures)

18. **SQLite query optimization**
    - Prepared statements for repeated queries: `SELECT * FROM nodes WHERE parent_id = ?`
    - Batch queries: fetch 10 children at once instead of 1-by-1
    - EXPLAIN QUERY PLAN: verify indexes are being used
    - Result caching in memory: `nodeCache` Map<id, node>

19. **Memory management**
    - Keep only current + adjacent universes in memory (3-level deep)
    - Garbage collect off-screen meshes
    - Three.js disposal: `geometry.dispose()`, `material.dispose()`, `texture.dispose()`

**Deliverable:** System handles 50k nodes at 50-60 FPS. No stuttering during navigation or interaction.

---

### Phase 7: Polish, Testing & Packaging (Weeks 5.5-6.5)
**Frontend + Packaging:**

20. **UX refinement**
    - Keyboard shortcuts: Ctrl+N (new node), Ctrl+F (search), Ctrl+S (save), +/- (zoom), arrows (pan)
    - Right-click context menu: Edit, Delete, Connect To, Export As JSON
    - Breadcrumb trail showing current path to root
    - Zoom level indicator
    - Loading indicators during long operations (layout calc, large queries)

21. **Testing & validation**
    - Unit tests: layout algorithm (positions correct?), DAG validation (cycles rejected?)
    - Integration tests: SQLite operations (CRUD correct?), graph traversal (children/parents fetched correctly?)
    - E2E tests: navigation workflow, node creation, search, filter
    - Performance tests: measure FPS at 1k, 5k, 10k, 25k, 50k nodes
    - Memory profiling: peak RAM usage at 50k nodes

22. **Export & Backup**
    - JSON export: entire graph as `{nodes: [], edges: []}`
    - Save/autosave to SQLite
    - File picker: save .db file to custom location
    - Recovery: detect corrupted SQLite, rebuild from backups

23. **Packaging & Distribution**
    - Electron: package as .exe (Windows), .dmg (Mac), .AppImage (Linux)
    - Sign binaries (optional, for security)
    - Auto-updates: check for new versions on startup
    - Create installer with shortcut to desktop
    - README with system requirements, keyboard shortcuts, troubleshooting

**Deliverable:** Production-ready desktop app packaged and ready to distribute.

---

## File Structure (Local App)

### Main Process (Electron/Tauri, Rust or Node.js)
- `src/main/db.rs` or `src/main/db.js` — SQLite connection, schema initialization
- `src/main/handlers.rs` or `src/main/handlers.js` — IPC handlers: `getNode()`, `addNode()`, `getChildren()`, `updatePosition()`, etc.
- `src/main/graph/layout.rs` or `src/main/graph/layout.js` — Force-directed layout algorithm
- `src/main/graph/validation.rs` — DAG cycle detection
- `src/main/config.rs` or `src/main/config.js` — App config, relationship types, node types

### Renderer Process (React)
- `src/renderer/components/Scene.tsx` — Three.js scene setup, node/edge rendering, viewport culling
- `src/renderer/components/DetailPanel.tsx` — Sidebar showing node details, parent/child list
- `src/renderer/components/CreateNodeForm.tsx` — Modal for adding nodes
- `src/renderer/components/SearchPanel.tsx` — Search UI and results
- `src/renderer/hooks/useGraph.ts` — Graph state management, IPC communication
- `src/renderer/hooks/useRenderer.ts` — Three.js scene state, camera control
- `src/renderer/utils/navigation.ts` — Navigation stack, zoom logic
- `src/renderer/workers/layout.worker.ts` — WebWorker for layout computation

### Shared Types
- `src/shared/types.ts` — TypeScript types: `Node`, `Edge`, `Position`, `GraphData`
- `src/shared/ipc-channels.ts` — IPC channel names for main ↔ renderer communication
- `src/shared/config.ts` — Relationship types, node types, layout parameters

### SQLite Schema
- `schema.sql` — DDL for tables: `nodes`, `edges`, `positions`, `parents`

---

## Verification Checklist

1. **Rendering Performance**
   - [ ] Render 50k nodes with 200k edges, maintain 50-60 FPS during pan/zoom
   - [ ] Measure FPS at each scale: 1k, 5k, 10k, 25k, 50k nodes
   - [ ] Measure memory usage: peak RAM at 50k nodes should be <1.5 GB
   - [ ] Profile frame time: identify bottleneck (rendering vs. query vs. layout)
   - [ ] Viewport culling working: FPS unchanged when zoomed to show 20 nodes (vs. 50k)

2. **Navigation Correctness**
   - [ ] Double-click a node: camera smoothly zooms in, children render correctly
   - [ ] Right-click: camera zooms out to parent
   - [ ] Breadcrumb navigation: can jump to any ancestor level
   - [ ] Cross-level edges: visible across multiple zoom levels
   - [ ] Navigation stack: back/forward buttons work

3. **Data Integrity**
   - [ ] Add node with 2 parents: appears in both parent universes
   - [ ] Delete node: orphaned edges don't crash renderer, data removed from DB
   - [ ] DAG validation: reject cycles with clear error message
   - [ ] Persist to SQLite: kill app, reopen, graph state restored
   - [ ] Corrupted DB recovery: detect corruption, prompt user for action

4. **Authoring Workflow**
   - [ ] Create 10 nodes with custom metadata: all fields persist
   - [ ] Create edge between different hierarchy levels: positions recompute incrementally
   - [ ] Edit node label: changes reflected in 3D view + sidebar
   - [ ] Delete edge: graph recalculates, no orphaned references
   - [ ] Undo/Redo (optional): revert last 10 actions

5. **Search & Filtering**
   - [ ] Search for node label: returns exact match in <500ms
   - [ ] Search for metadata: finds nodes by custom field values
   - [ ] Filter by type: only selected types visible
   - [ ] Filter by edge strength: edges below threshold hidden
   - [ ] Highlighted nodes: visually distinct from others

6. **Performance at Scale**
   - [ ] Load 1k nodes: app responsive in <1 second
   - [ ] Load 5k nodes: initial layout computed in <5 seconds (in background)
   - [ ] Load 50k nodes: memory usage <1.5 GB, FPS >50
   - [ ] Add node to 50k-node graph: appears instantly in UI, layout recomputes in 5-10 seconds
   - [ ] Search in 50k nodes: results in <500ms

7. **Packaging & Distribution**
   - [ ] Build .exe (Windows): runs on clean system without dependencies
   - [ ] Build .dmg (Mac): installs to Applications
   - [ ] Build .AppImage (Linux): executable without installation
   - [ ] Autoupdate: check for new versions on startup
   - [ ] Desktop shortcut: created during installation

---

## Decisions & Scope (UPDATED)

### Included (MVP Launch)
- ✅ DAG structure (multiple parents allowed)
- ✅ Hierarchical drill-down zoom navigation
- ✅ Persistent spatial positioning (saved to SQLite)
- ✅ Cross-level edge visualization (dashed lines for cross-level)
- ✅ Node creation/deletion/editing
- ✅ Edge creation/deletion
- ✅ Search and filtering
- ✅ Custom metadata fields (JSON per node)
- ✅ 50k node scalability with GTX 1650
- ✅ Desktop app (Electron or Tauri)
- ✅ Offline-first (all local, no internet required)
- ✅ JSON export for backup/sharing

### Excluded (Phase 2+, Post-Launch)
- ❌ Real-time collaboration (multi-user editing)
- ❌ Cloud sync / multi-device sync
- ❌ CSV/RDF import tools
- ❌ Mobile app
- ❌ AI-assisted suggestions (semantic search, auto-tagging)
- ❌ Historical versioning (undo/redo beyond current session)
- ❌ Manual node positioning (locked to layout, no dragging)
- ❌ 3D terrain/landscape rendering

### Architectural Decisions
- **SQLite (local only):** Single-user, all data owned locally, no backend needed
- **Electron or Tauri:** Desktop app, cross-platform (Windows/Mac/Linux), bundle everything
- **Three.js WebGL:** 3D rendering, full viewport culling + LOD, instanced rendering for 50k nodes
- **WebWorker layout computation:** Force-directed algorithm runs off-main-thread, non-blocking UI
- **IPC communication:** Main process (SQLite) ↔ Renderer (React), async/sync where appropriate
- **Force-directed with warmstart:** Smart positioning respects relationship strength and previous positions

---

## Implementation Notes & Decisions

1. **Cross-level edge rendering** — Draw edges that span hierarchy levels with dashed/semi-transparent styling to indicate they're cross-level. Only render edges if at least one endpoint is visible in current view (performance). (✅ Implemented in Phase 3)

2. **Position reset strategy** — Auto-recalculate incrementally when new nodes/edges added. No manual reset button needed for launch; if user wants full recalculation, just delete .db and start fresh. (✅ Implemented in Phase 2)

3. **Cycle prevention** — Strict rejection: when user tries to create edge that would form a cycle, show error: "This connection would create a cycle. DAGs cannot have cycles." Validate before inserting to DB. (✅ Implemented in Phase 4)

4. **Multi-parent rendering** — Each universe shows the node only once (in its current context). When traversing to a different parent, the same node renders in that parent's universe. Position may differ per parent context (or can be unified). For launch: unified positions (one position per node, appears in all parent universes at same coordinates). (✅ Implemented in Phase 3)

5. **Layout calculation performance** — Force-directed is O(n²). At 50k nodes, first layout calculation: ~10-20 seconds. Cache result. On new node: only recalculate immediate neighbors + node (affects ~5-10% of positions, ~1-2 seconds). WebWorker ensures UI stays responsive. (✅ Implemented in Phase 2)

6. **Memory management** — Keep current universe + 2 levels of parents/children in memory. Unload others. On zoom, async-load and parse from SQLite. Should keep peak memory <1.5 GB. (✅ Implemented in Phase 6)

7. **Error recovery** — SQLite can corrupt if app crashes during write. Add transaction support: all writes are ACID. On startup, run PRAGMA integrity_check to detect corruption. Prompt user if corruption detected: offer restore from backup or fresh start. (✅ Implemented in Phase 7)
