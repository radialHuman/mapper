import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { GraphEdge, GraphNode } from '../types'

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  currentNodeId: string
  selectedNodeId: string
  onSelectNode: (id: string) => void
  onEnterNode: (id: string) => void
  onExitNode: () => void
  onBackgroundClick: () => void
}

type NodeMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
type EdgeLineRecord = {
  line: THREE.Line
  sourceId: string
  targetId: string
}

const EDGE_COLORS: Record<GraphEdge['type'], number> = {
  hierarchy: 0x66d5ff,
  related: 0x91f5ba,
  'depends-on': 0xffbe7d,
}

const NODE_RELATION_COLORS = {
  current: 0xf6d889,
  parent: 0xff9f6b,
  child: 0x4edab5,
  both: 0xd58dff,
  unrelated: 0x57a6ff,
} as const

export default function Universe3D({
  nodes,
  edges,
  currentNodeId,
  selectedNodeId,
  onSelectNode,
  onEnterNode,
  onExitNode,
  onBackgroundClick,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const selectRef = useRef(onSelectNode)
  const enterRef = useRef(onEnterNode)
  const exitRef = useRef(onExitNode)
  const backgroundRef = useRef(onBackgroundClick)

  useEffect(() => {
    selectRef.current = onSelectNode
    enterRef.current = onEnterNode
    exitRef.current = onExitNode
    backgroundRef.current = onBackgroundClick
  }, [onSelectNode, onEnterNode, onExitNode, onBackgroundClick])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060d1f)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 1, 5000)
    camera.position.set(0, 260, 720)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.zoomSpeed = 1.2
    controls.panSpeed = 0.8
    controls.maxDistance = 1800
    controls.minDistance = 120
    controls.target.set(0, 0, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.72)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xc7e3ff, 0.8)
    key.position.set(330, 460, 300)
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x8bc3ff, 0.5)
    fill.position.set(-300, -90, -280)
    scene.add(fill)

    const stars = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0xcde4ff, size: 2.2, sizeAttenuation: true }),
    )
    const starPositions = new Float32Array(1200 * 3)
    for (let i = 0; i < 1200; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 3200
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2400
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 3200
    }
    stars.geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    scene.add(stars)

    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const edgeGroup = new THREE.Group()
    scene.add(edgeGroup)

    const labelGroup = new THREE.Group()
    scene.add(labelGroup)

    const idToMesh = new Map<string, NodeMesh>()
    const idToLabel = new Map<string, THREE.Sprite>()
    const edgeLines: EdgeLineRecord[] = []
    const nodeById = new Map(nodes.map((node) => [node.id, node]))
    const currentNode = nodeById.get(currentNodeId)

    const getNodeColor = (node: GraphNode) => {
      if (node.id === currentNodeId) {
        return NODE_RELATION_COLORS.current
      }

      const isParent = Boolean(currentNode?.parents.includes(node.id))
      const isChild = Boolean(currentNode?.children.includes(node.id))

      if (isParent && isChild) {
        return NODE_RELATION_COLORS.both
      }
      if (isParent) {
        return NODE_RELATION_COLORS.parent
      }
      if (isChild) {
        return NODE_RELATION_COLORS.child
      }
      return NODE_RELATION_COLORS.unrelated
    }

    const hierarchyGeometry = new THREE.SphereGeometry(20, 24, 24)
    const regularGeometry = new THREE.SphereGeometry(14, 20, 20)

    const buildTextSprite = (text: string, highlight = false) => {
      const canvas = document.createElement('canvas')
      const size = highlight ? 30 : 24
      const paddingX = 14
      const paddingY = 10
      const context = canvas.getContext('2d')
      if (!context) {
        return null
      }

      context.font = `600 ${size}px Segoe UI`
      const metrics = context.measureText(text)
      canvas.width = Math.ceil(metrics.width + paddingX * 2)
      canvas.height = Math.ceil(size + paddingY * 2)

      const draw = canvas.getContext('2d')
      if (!draw) {
        return null
      }

      draw.font = `600 ${size}px Segoe UI`
      draw.textAlign = 'center'
      draw.textBaseline = 'middle'
      draw.shadowColor = 'rgba(3, 8, 20, 0.75)'
      draw.shadowBlur = 8
      draw.fillStyle = highlight ? '#fff5ce' : '#e8f4ff'
      draw.fillText(text, canvas.width / 2, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
      const sprite = new THREE.Sprite(material)
      const scale = highlight ? 48 : 40
      sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1)
      return sprite
    }

    for (const node of nodes) {
      const isCurrent = node.id === currentNodeId
      const geometry = isCurrent ? hierarchyGeometry : regularGeometry
      const material = new THREE.MeshStandardMaterial({
        color: getNodeColor(node),
        emissive: node.id === selectedNodeId ? 0x1e6631 : 0x0f1c43,
        roughness: 0.44,
        metalness: 0.22,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(node.position.x, node.position.y, node.position.z)
      mesh.userData.nodeId = node.id
      nodeGroup.add(mesh)
      idToMesh.set(node.id, mesh)

      const label = buildTextSprite(node.label, isCurrent)
      if (label) {
        const yOffset = isCurrent ? 34 : 30
        label.position.set(node.position.x, node.position.y + yOffset, node.position.z)
        label.userData.nodeId = node.id
        labelGroup.add(label)
        idToLabel.set(node.id, label)
      }
    }

    for (const edge of edges) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) {
        continue
      }

      const points = [
        new THREE.Vector3(source.position.x, source.position.y, source.position.z),
        new THREE.Vector3(target.position.x, target.position.y, target.position.z),
      ]

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
      const lineMaterial = new THREE.LineBasicMaterial({
        color: EDGE_COLORS[edge.type],
        transparent: true,
        opacity: edge.type === 'hierarchy' ? 0.92 : 0.68,
      })

      const line = new THREE.Line(lineGeometry, lineMaterial)
      edgeGroup.add(line)
      edgeLines.push({ line, sourceId: edge.source, targetId: edge.target })
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let clickTimer: number | null = null
    let pendingNodeId: string | null = null
    const singleClickDelay = 260

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      exitRef.current()
    }

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObjects(nodeGroup.children, false)
      if (intersects.length === 0) {
        if (clickTimer !== null) {
          window.clearTimeout(clickTimer)
          clickTimer = null
          pendingNodeId = null
        }
        backgroundRef.current()
        return
      }

      const hit = intersects[0].object as NodeMesh
      const nodeId = hit.userData.nodeId as string | undefined
      if (!nodeId) {
        return
      }

      if (clickTimer !== null && pendingNodeId === nodeId) {
        window.clearTimeout(clickTimer)
        clickTimer = null
        pendingNodeId = null
        enterRef.current(nodeId)
        return
      }

      if (clickTimer !== null) {
        window.clearTimeout(clickTimer)
      }

      pendingNodeId = nodeId
      clickTimer = window.setTimeout(() => {
        if (pendingNodeId) {
          selectRef.current(pendingNodeId)
        }
        pendingNodeId = null
        clickTimer = null
      }, singleClickDelay)
    }

    const onResize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('resize', onResize)

    let raf = 0
    const frustum = new THREE.Frustum()
    const projectionViewMatrix = new THREE.Matrix4()
    const nodeCullDistance = 2100
    const labelCullDistance = 1600

    const animate = () => {
      controls.update()

      camera.updateMatrixWorld()
      projectionViewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(projectionViewMatrix)

      for (const [nodeId, mesh] of idToMesh.entries()) {
        const inFrustum = frustum.containsPoint(mesh.position)
        const inDistance = camera.position.distanceTo(mesh.position) <= nodeCullDistance
        mesh.visible = inFrustum && inDistance

        const label = idToLabel.get(nodeId)
        if (!label) {
          continue
        }

        label.visible = mesh.visible && camera.position.distanceTo(mesh.position) <= labelCullDistance
      }

      for (const record of edgeLines) {
        const source = idToMesh.get(record.sourceId)
        const target = idToMesh.get(record.targetId)
        record.line.visible = Boolean(source?.visible && target?.visible)
      }

      for (const item of labelGroup.children) {
        const label = item as THREE.Sprite
        if (!label.visible) {
          continue
        }
        const nodeId = label.userData.nodeId as string | undefined
        if (!nodeId) {
          continue
        }
        const mesh = idToMesh.get(nodeId)
        if (!mesh) {
          continue
        }

        label.lookAt(camera.position)
        const distance = camera.position.distanceTo(mesh.position)
        const fade = THREE.MathUtils.clamp(1 - (distance - 250) / 1500, 0.32, 1)
        label.material.opacity = fade
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      if (clickTimer !== null) {
        window.clearTimeout(clickTimer)
      }
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', onResize)
      controls.dispose()

      for (const mesh of idToMesh.values()) {
        mesh.geometry.dispose()
        mesh.material.dispose()
      }

      for (const item of edgeGroup.children) {
        const line = item as THREE.Line
        line.geometry.dispose()
        const material = line.material as THREE.Material
        material.dispose()
      }

      for (const item of labelGroup.children) {
        const label = item as THREE.Sprite
        const material = label.material as THREE.SpriteMaterial
        material.map?.dispose()
        material.dispose()
      }

      stars.geometry.dispose()
      const starsMaterial = stars.material as THREE.Material
      starsMaterial.dispose()

      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [nodes, edges, currentNodeId, selectedNodeId, onBackgroundClick])

  return <div className="universe-3d" ref={mountRef} />
}
