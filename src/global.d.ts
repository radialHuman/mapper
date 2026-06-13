import type { GraphData } from './types'

declare global {
  interface Window {
    mapperDesktop?: {
      platform: string
      isDesktop: boolean
      exportAndCommitGraph?: (
        graph: GraphData,
        message: string,
      ) => Promise<{ ok: boolean; message: string; path?: string }>
    }
  }
}

export {}
