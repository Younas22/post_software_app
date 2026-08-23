import { userClient } from './clients'
import type { ApiSuccessEnvelope, AuthUser } from '@shared/types'

export async function apiLogin(
  email: string,
  password: string,
  deviceName: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await userClient.post<ApiSuccessEnvelope<{ token: string; user: AuthUser }>>('/auth/login', {
    email,
    password,
    device_name: deviceName
  })
  return res.data.data
}

export async function apiLogout(): Promise<void> {
  await userClient.post('/auth/logout')
}

export async function apiFetchCurrentUser(): Promise<AuthUser> {
  const res = await userClient.get<ApiSuccessEnvelope<{ user: AuthUser }>>('/user')
  return res.data.data.user
}
