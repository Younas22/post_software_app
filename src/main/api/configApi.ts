import { userClient } from './clients'
import type { ApiSuccessEnvelope, BranchInfo, BusinessInfo, BusinessTypeBranding } from '@shared/types'

export interface ConfigResponse {
  business: BusinessInfo | null
  /** The business type's theme, terminology and module switches (null when no type is assigned). */
  business_type?: BusinessTypeBranding | null
  branch: (BranchInfo & { id: number }) | null
  settings: Record<string, unknown>
  features: string[]
}

/** GET /api/v1/config — bootstrap info + the caller's own branch (see BACKEND_EXTENSIONS.md §4.3). */
export async function apiGetConfig(): Promise<ConfigResponse> {
  const res = await userClient.get<ApiSuccessEnvelope<ConfigResponse>>('/config')
  return res.data.data
}
