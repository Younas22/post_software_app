import { userClient, deviceClient } from './clients'
import type { ApiSuccessEnvelope, DevicePlatform, DeviceRecord } from '@shared/types'

export async function apiRegisterDevice(
  branchId: number,
  name: string,
  platform: DevicePlatform
): Promise<{ device: DeviceRecord; token: string }> {
  const res = await userClient.post<ApiSuccessEnvelope<{ device: DeviceRecord; token: string }>>(
    '/devices/register',
    { branch_id: branchId, name, platform }
  )
  return res.data.data
}

export async function apiGetCurrentDevice(): Promise<DeviceRecord> {
  const res = await deviceClient.get<ApiSuccessEnvelope<DeviceRecord>>('/devices/current')
  return res.data.data
}
