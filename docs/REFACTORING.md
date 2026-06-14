# App.tsx Refactoring Guide

## Overview
The monolithic `App.tsx` file (2300+ lines) has been refactored into a modular, maintainable architecture with clear separation of concerns.

## New Directory Structure

```
src/
├── App.tsx                    # Main component (now ~600 lines, focused on composition)
├── components/
│   ├── Universe3D.tsx        # 3D visualization (existing)
│   ├── AdminPage.tsx         # Admin editor page
│   └── panels/
│       ├── SearchPanel.tsx   # Node search interface
│       ├── AddNodePanel.tsx  # Create new nodes
│       ├── AddEdgePanel.tsx  # Create connections
│       ├── StylePanel.tsx    # UI styling controls
│       ├── HistoryPanel.tsx  # Version history
│       └── DetailsPanel.tsx  # Node details & editing
├── handlers/
│   ├── nodeHandlers.ts       # Node creation, editing, deletion, moving
│   ├── edgeHandlers.ts       # Edge/connection management
│   ├── navigationHandlers.ts # View navigation logic
│   └── fileHandlers.ts       # File upload/export functionality
├── utils/
│   ├── csvUtils.ts           # CSV parsing and formatting
│   ├── nodeUtils.ts          # Node ID generation utilities
│   ├── metadataUtils.ts      # Metadata parsing and building editor state
│   └── overlayStyleUtils.ts  # Overlay style management and persistence
├── lib/
│   └── graphStore.ts         # Graph data storage (existing)
└── types.ts                  # TypeScript type definitions (existing)
```

## Module Breakdown

### Components (`/src/components/`)

#### **AdminPage.tsx** (283 lines)
- Full administrative interface for graph management
- Tree-based node navigation
- Node editing forms
- Parent/child relationship management
- Danger zone for node deletion and graph reset

#### **SearchPanel.tsx** (29 lines)
- Real-time node search interface
- Highlights matching nodes
- Quick navigation to search results

#### **AddNodePanel.tsx** (95 lines)
- Node creation form
- Parent node selection with filtering
- Metadata JSON editor
- Description and label inputs

#### **AddEdgePanel.tsx** (67 lines)
- Connection creation interface
- Edge type selector (hierarchy, related, depends-on)
- Strength slider control
- Connection removal

#### **StylePanel.tsx** (59 lines)
- Overlay transparency controls
- Three separate sliders for UI elements
- Style reset functionality

#### **HistoryPanel.tsx** (41 lines)
- Version history display
- Export and commit functionality
- Version restore with undo support

#### **DetailsPanel.tsx** (157 lines)
- Node information display
- Full editing form for node properties
- Metadata, pioneers, books, Wikipedia links
- Node position adjustment

### Handlers (`/src/handlers/`)

#### **nodeHandlers.ts** (379 lines)
- `saveNodeEdits()` - Validates and persists node changes
- `addNode()` - Creates new nodes with positioning
- `moveNodeToNewPosition()` - Repositions nodes in 3D space
- `removeParentLink()` - Removes parent relationships
- `removeChildLink()` - Removes child relationships
- `deleteSelectedNode()` - Safely deletes nodes and repairs graph

#### **edgeHandlers.ts** (114 lines)
- `addEdge()` - Creates connections between nodes
- `removeEdge()` - Removes connections with hierarchy validation

#### **navigationHandlers.ts** (72 lines)
- `handleNavigateIn()` - Enter node hierarchy
- `handleNavigateOut()` - Exit node with history fallback
- `handleSelectNode()` - Select node for editing
- `selectSearchResult()` - Quick navigation to search results
- `goToHomeUniverse()` - Return to root node

#### **fileHandlers.ts** (57 lines)
- `handleUploadGraph()` - Validate and import graph JSON
- `exportAndCommitGraph()` - Export graph or trigger git commit

### Utilities (`/src/utils/`)

#### **csvUtils.ts** (11 lines)
- `toCsv()` - Convert array to comma-separated string
- `parseCsv()` - Parse comma-separated string to array

#### **nodeUtils.ts** (25 lines)
- `toNodeIdFromLabel()` - Generate ID from label
- `buildUniqueNodeId()` - Create unique node IDs with numbering

#### **metadataUtils.ts** (78 lines)
- **Type**: `NodeEditorState` - Editor form state
- `metadataListFromNode()` - Extract metadata as list
- `metadataStringFromNode()` - Extract metadata as string
- `buildEditorState()` - Create editor form state from node

#### **overlayStyleUtils.ts** (48 lines)
- **Type**: `OverlayStyle` - Opacity settings
- Constants: `OVERLAY_STYLE_KEY`, `DEFAULT_OVERLAY_STYLE`
- `clampOpacity()` - Constrain opacity values
- `loadOverlayStyle()` - Load persisted style from localStorage

## Benefits of Refactoring

✅ **Modularity**: Each concern is isolated in its own file  
✅ **Maintainability**: Easy to locate and modify specific features  
✅ **Reusability**: Handlers can be reused in other components  
✅ **Testability**: Easier to write unit tests for individual handlers  
✅ **Readability**: Reduced component complexity from 2300 to ~600 lines  
✅ **Scalability**: Adding new features no longer requires modifying a massive file  

## Migration Guide

If you were using functions from the old `App.tsx`, they're now in:
- Graph mutations → `handlers/nodeHandlers.ts` or `handlers/edgeHandlers.ts`
- Utilities → `utils/*.ts`
- UI logic → `handlers/navigationHandlers.ts`
- File operations → `handlers/fileHandlers.ts`

## Maintaining Functionality

All functionality is preserved:
- Graph creation, editing, deletion
- 3D visualization and navigation
- Version history and restoration
- File import/export
- Search and filtering
- Style customization
- Admin controls
- Persistence to localStorage/IndexedDB

The refactored code is drop-in compatible with the previous version. No breaking changes to the external API.
