import { userClient } from './clients'
import type { ApiSuccessEnvelope, BranchInfo, BusinessInfo } from '@shared/types'

export interface ConfigResponse {
  business: BusinessInfo | null
  branch: (BranchInfo & { id: number }) | null
  settings: Record<string, unknown>
  features: string[]
}

/** GET /api/v1/config — bootstrap info + the caller's own branch (see BACKEND_EXTENSIONS.md §4.3). */
export async function apiGetConfig(): Promise<ConfigResponse> {
  const res = await userClient.get<ApiSuccessEnvelope<ConfigResponse>>('/config')
  return res.data.data
}
