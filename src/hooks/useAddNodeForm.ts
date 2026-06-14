import { useState, useCallback } from 'react'
import type { GraphData } from '../types'

/**
 * Custom hook for managing Add Node form state.
 * Keeps all node-addition related state in one place to avoid cluttering the main component.
 */
export function useAddNodeForm(initialRootId: string) {
  // Add Node form state - all grouped together
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeDescription, setNewNodeDescription] = useState('')
  const [newNodeMetadataText, setNewNodeMetadataText] = useState('{\n  "kind": "custom"\n}')
  const [newNodeParentIds, setNewNodeParentIds] = useState<string[]>([initialRootId])
  const [newNodeParentSearchText, setNewNodeParentSearchText] = useState('')

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setNewNodeLabel('')
    setNewNodeDescription('')
    setNewNodeMetadataText('{\n  "kind": "custom"\n}')
    setNewNodeParentSearchText('')
  }, [])

  /**
   * Toggle parent selection (add/remove parent)
   */
  const onToggleParent = useCallback((id: string) => {
    setNewNodeParentIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((parentId) => parentId !== id)
      }
      return [...prev, id]
    })
  }, [])

  /**
   * Get filtered parent options based on search text
   */
  const getParentSelectionOptions = useCallback(
    (graph: GraphData) => {
      const needle = newNodeParentSearchText.trim().toLowerCase()
      return Object.values(graph.nodes)
        .filter((node) => {
          if (!needle) {
            return true
          }
          return node.label.toLowerCase().includes(needle) || node.id.toLowerCase().includes(needle)
        })
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 80)
    },
    [newNodeParentSearchText],
  )

  return {
    // Form values
    newNodeLabel,
    newNodeDescription,
    newNodeMetadataText,
    newNodeParentIds,
    newNodeParentSearchText,

    // Setters
    setNewNodeLabel,
    setNewNodeDescription,
    setNewNodeMetadataText,
    setNewNodeParentIds,
    setNewNodeParentSearchText,

    // Methods
    resetForm,
    onToggleParent,
    getParentSelectionOptions,
  }
}
