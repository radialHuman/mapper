import { parseMetadata } from '../lib/graphStore'
import type { NodeMetadata } from '../types'

/**
 * Validation result for adding a node
 */
export interface AddNodeValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates the node addition form inputs
 */
export function validateAddNodeForm(
  label: string,
  metadataText: string,
  parentIds: string[],
): AddNodeValidationResult {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) {
    return {
      isValid: false,
      error: 'Node label is required.',
    }
  }

  const metadata = parseMetadata(metadataText)
  if (!metadata) {
    return {
      isValid: false,
      error: 'Metadata must be valid JSON object values.',
    }
  }

  if (parentIds.length === 0) {
    return {
      isValid: false,
      error: 'Choose at least one parent.',
    }
  }

  return {
    isValid: true,
  }
}

/**
 * Parse and extract metadata from form input
 */
export function extractMetadata(metadataText: string): NodeMetadata | null {
  return parseMetadata(metadataText)
}
