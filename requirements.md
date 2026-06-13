# Knowledge Graph Requirements — UPDATED (Single-User Local)

## Core Concept
Interactive, hierarchical drill-down knowledge map with DAG (Directed Acyclic Graph) structure. Personal knowledge base, single-user, runs entirely locally.

## Navigation
- Double-click to zoom in (enter a node's universe)
- Right-click to zoom out (go to parent)
- Pan/scroll allowed within a universe

## Graph Structure
- Multiple parents allowed (DAG, not tree)
- Arbitrary edges between nodes at any hierarchy level (cross-parent links)
- These edges always visible as drawn lines

## Spatial Layout & Persistence
- Static positioning (positions saved and persist between sessions)
- Auto-positioned near related nodes (relationship strength determines proximity)
- Positions only recalculate when new nodes/relations added
- Users find nodes by reference to others they remember

## Interactions
- Left-click: show details in sidebar
- Double left-click: zoom into node (enter universe)
- Right-click: zoom out (go to parent)

## Customization
- Custom fields vary per node or node-type

## Data & Scale
- Storage: Local SQLite database (single .db file)
- Launch scale: 50k nodes (full 3D with GTX 1650)
- Offline-first, all data owned by user
- Optional: JSON export for backup/sharing

## Deployment
- Desktop app (Electron or Tauri)
- Runs on Windows/Mac/Linux
- No backend server or internet required

## Performance Targets
- Smooth 3D rendering at 50-60 FPS
- Force-directed layout recalculation: ~5-10 seconds (acceptable, runs in background)
- Node addition/editing: <100ms latency
- Search: <500ms latency

## Hardware Requirements
- CPU: Any modern processor (2010+)
- RAM: 4-8 GB free
- GPU: GTX 1650 or equivalent
- Disk: 2-4 GB available
- No internet required

## Implications
- Complex graph layout (DAG with spatial persistence, computed locally)
- Full 3D rendering with viewport culling and LOD
- Intelligent layout algorithm (relationship-aware positioning)
- SQLite query optimization for rapid access
- WebWorker threading for non-blocking layout computation
- Must handle edge cases: cycles in relationships, orphaned nodes
