# Knowledge Universe Mapper - User Manual

## What This App Does
Knowledge Universe Mapper is an interactive 3D map of connected knowledge nodes.

Each node can have:
- A name (label)
- A description
- Metadata fields
- Parent and child hierarchy links
- Additional relationship links

The app supports a focused "universe" mode where a double-clicked node becomes the current universe and only directly related nodes are shown.

## Interface Overview
The screen has three primary parts:

1. Full-screen 3D map
2. Floating action buttons on the left side
3. Transparent sidebar (appears only when needed)

You also see a top-center chip showing the current universe name.

## Mouse Controls (3D Navigation)
Use these controls on the map canvas:

- Single click on a node: Select node and open sidebar with node details
- Double click on a node: Enter that node (it becomes the universe)
- Right click anywhere: Exit one level back (universe back navigation)
- Click empty space: Hide sidebar
- Drag: Orbit camera around the scene
- Mouse wheel: Zoom in/out
- Pan: Use OrbitControls pan interaction (depends on your input device/button combo)

## Node Interaction Rules

### Single Click
Single-click is for inspection.

Result:
- Node gets selected
- Sidebar opens to Node Details

### Double Click
Double-click is for navigation/drill-down.

Result:
- Selected node becomes the current universe
- View focuses to that node and directly related neighbors
- Sidebar is not opened by double-click

### Right Click
Right-click is for stepping out.

Result:
- If history exists, returns to previous universe
- Otherwise, attempts to move to a parent universe

## Floating Buttons
The left floating panel contains:

- Search
- Add Node
- Add Link
- Style
- Reset

Click a button once to open its panel in the sidebar.
Click the same button again to close it.

## Sidebar Panels

### Node Details Panel
How to open:
- Single-click any node

What it shows:
- Node name
- Description
- Node ID
- Parent labels
- Child labels
- Metadata JSON

### Search Panel
How to open:
- Click Search button

How search works:
- Case-insensitive search
- Matches label, description, and metadata keys/values
- Displays up to 12 results

When you click a search result:
- Selected node becomes current universe
- History is reset
- Node Details panel opens

### Add Node Panel
How to open:
- Click Add Node button

How to add a node:
1. Enter Label (required)
2. Enter Description (optional)
3. Enter Metadata JSON object (required format: valid JSON object)
4. Search parent nodes by label or ID and select one or more parents
5. Click Add Node

Validation rules:
- Label cannot be empty
- At least one parent must be selected
- Metadata must be valid JSON object
- Parent IDs must exist

Behavior after add:
- New node is inserted
- Node ID is generated from label (slug format). If duplicated, a numeric suffix is added.
- Hierarchy edges are created from selected parent(s)
- New node becomes selected

### Admin Panel Quick Remove
How to open:
- Click Admin button

Quick actions available for selected node:
- Parents list: click Remove to unlink a parent instantly
- Children list: click Remove to unlink a child instantly
- Danger zone: click Delete This Node to remove the node and all connected edges (except root node, which is protected)

### Add Link Panel
How to open:
- Click Add Link button

How to add a connection:
1. Choose Source node
2. Choose Target node
3. Choose Type: related, depends-on, or hierarchy
4. Choose Strength (0.10 to 1.00)
5. Click Add Connection

Validation rules:
- Source and Target are required
- Source and Target must be different
- Both nodes must exist
- For hierarchy links, cycle creation is blocked

Hierarchy link behavior:
- Updates both parent and child arrays when needed

### Style Panel (Transparency Controls)
How to open:
- Click Style button

Available controls:
- Floating Buttons Transparency
- Sidebar Transparency
- Top Chip Transparency
- Reset Style button

Range and persistence:
- Each slider range is 0.15 to 0.95
- Settings are saved automatically and persist after reload

## Reset Behavior
Reset button does a full graph reset to seeded data.

It resets:
- Graph nodes and edges
- Current universe and selected node
- Navigation history
- Add-form context values
- Search text
- Open panel state
- Errors

It does not reset style transparency.
Use Reset Style in the Style panel for visual reset.

## Data Persistence
The app stores data locally in your browser storage.

Persisted:
- Graph data
- Style transparency settings

Implication:
- Your graph changes remain after reload/restart
- Use Reset to restore initial seeded graph

## Focused Universe Model
This app uses contextual drill-down (not physical node containment spheres).

When a node becomes the universe, visible set includes:
- The current node
- Its parents
- Its children
- Nodes directly connected to current node by any edge

Edges shown are only edges whose source and target are both visible.

## Seeded Test Hierarchy
The seed data includes multi-level math chains for drill-down testing.

Examples:
- Mathematics -> Algebra -> Linear Algebra -> Eigenvectors
- Mathematics -> Calculus -> Differential Equations -> Nonlinear Dynamics
- Mathematics -> Geometry -> Topology

Use double-click repeatedly to test parent -> child -> grandchild universe transitions.

## Typical Workflows

### Inspect a Concept
1. Single-click node
2. Read details and metadata
3. Click empty space to hide panel

### Drill Into a Topic
1. Double-click node to enter
2. Repeat double-click on child nodes
3. Right-click to step back out

### Add a New Topic Under Existing Parents
1. Open Add Node
2. Fill label/description/metadata
3. Select parent(s)
4. Add Node
5. Single-click new node to verify details

### Add Cross-Domain Link
1. Open Add Link
2. Select source and target from different branches
3. Choose related or depends-on
4. Set strength
5. Add Connection

### Tune UI Transparency
1. Open Style
2. Adjust slider values live
3. Use Reset Style if needed

## Troubleshooting

### Sidebar opens unexpectedly
Expected behavior:
- Only single-click should open details.
- Double-click should navigate.

If behavior seems inconsistent:
- Click empty space to close sidebar
- Repeat with clear single vs double click timing

### Cannot add hierarchy link
Likely cause:
- Link would create a cycle in hierarchy

Fix:
- Use related or depends-on for cross links
- Or choose a different hierarchy direction

### Search returns nothing
Check:
- Spelling
- Metadata text values
- Node descriptions and labels

### Want original dataset back
Action:
- Click Reset floating button

## Best Practices
- Use hierarchy links for parent-child structure
- Use related/depends-on for lateral cross-connections
- Keep metadata consistent with stable keys (for better search)
- Use Style panel to improve readability for your display

## Quick Command Summary
- Single click node: open details
- Double click node: enter universe
- Right click: exit universe level
- Click background: hide sidebar
- Search: find and jump to node
- Add Node: create new concept with parent(s)
- Add Link: connect existing nodes
- Style: tune transparency
- Reset: restore seeded graph
