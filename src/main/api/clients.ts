import { createApiClient } from './httpClient'
import { getDeviceToken, getUserToken } from '../auth/secureStore'

/**
 * The two independent Sanctum principals this app talks to (see the
 * handoff doc §4/§16): the logged-in human user (login, config, device
 * registration, all online-management screens) and the registered Device
 * itself (sync/* endpoints only). Kept as separate axios instances so a
 * device-scoped call can never accidentally carry a user token or vice
 * versa.
 */
export const userClient = createApiClient(getUserToken)
export const deviceClient = createApiClient(getDeviceToken)
