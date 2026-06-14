import type { GraphNode, NodeMetadata } from '../types'
import { parseCsv, toCsv } from './csvUtils'

export type NodeEditorState = {
  label: string
  description: string
  parentsText: string
  childrenText: string
  pioneersText: string
  wikipedia: string
  booksText: string
  extraMetadataText: string
}

export function metadataListFromNode(node: GraphNode | undefined, key: string): string[] {
  if (!node) {
    return [] as string[]
  }

  const value = node.metadata[key]
  if (!value) {
    return [] as string[]
  }

  if (Array.isArray(value)) {
    return value
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function metadataStringFromNode(node: GraphNode | undefined, key: string): string | null {
  if (!node) {
    return null
  }

  const value = node.metadata[key]
  if (!value) {
    return null
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value
}

export function buildEditorState(node: GraphNode): NodeEditorState {
  const extraMetadata: NodeMetadata = {}
  for (const [key, value] of Object.entries(node.metadata)) {
    if (key === 'pioneers' || key === 'books' || key === 'wikipedia') {
      continue
    }
    extraMetadata[key] = value
  }

  return {
    label: node.label,
    description: node.description,
    parentsText: toCsv(node.parents),
    childrenText: toCsv(node.children),
    pioneersText: toCsv(metadataListFromNode(node, 'pioneers')),
    wikipedia: metadataStringFromNode(node, 'wikipedia') ?? '',
    booksText: toCsv(metadataListFromNode(node, 'books')),
    extraMetadataText: JSON.stringify(extraMetadata, null, 2),
  }
}
