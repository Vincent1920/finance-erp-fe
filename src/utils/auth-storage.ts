const TOKEN_KEY = 'finance_erp_token'
const LEGACY_TOKEN_KEY = 'access_token'
const LEGACY_AUTH_FLAG = 'finora-auth'
const MAX_SAFE_TOKEN_LENGTH = 8_192

export function saveToken(token: string, remember = true) {
  clearLegacyAuthStorage()

  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
    sessionStorage.removeItem(TOKEN_KEY)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getStoredToken(): string | null {
  const token =
    localStorage.getItem(TOKEN_KEY) ??
    sessionStorage.getItem(TOKEN_KEY)

  if (token && token.length <= MAX_SAFE_TOKEN_LENGTH) {
    return token
  }

  if (token) removeStoredToken()

  // Migrasi sementara dari key lama supaya session lama tidak langsung rusak.
  const legacyToken = sessionStorage.getItem(LEGACY_TOKEN_KEY)

  if (legacyToken && legacyToken.length <= MAX_SAFE_TOKEN_LENGTH) {
    sessionStorage.setItem(TOKEN_KEY, legacyToken)
    sessionStorage.removeItem(LEGACY_TOKEN_KEY)
    localStorage.removeItem(LEGACY_AUTH_FLAG)

    return legacyToken
  }

  if (legacyToken) removeStoredToken()

  return null
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)

  clearLegacyAuthStorage()
}

function clearLegacyAuthStorage() {
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(LEGACY_AUTH_FLAG)
}
