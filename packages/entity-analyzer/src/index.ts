// Entity analyzer — placeholder for Phase 1
export interface EntityNode {
  id: string
  type: string
  name: string
  relationships: Array<{ target: string; type: string }>
}

export function buildEntityGraph(): EntityNode[] {
  return []
}
