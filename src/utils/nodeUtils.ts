import type { GraphNode } from '../types'

export function toNodeIdFromLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'node'
}

export function buildUniqueNodeId(label: string, nodes: Record<string, GraphNode>): string {
  const base = toNodeIdFromLabel(label)
  if (!nodes[base]) {
    return base
  }

  let counter = 2
  while (nodes[`${base}-${counter}`]) {
    counter += 1
  }

  return `${base}-${counter}`
}
