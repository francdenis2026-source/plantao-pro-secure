const MASTER_TOKEN_KEY = 'master_token';

export function getMasterToken(): string | null {
  try {
    return localStorage.getItem(MASTER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setMasterToken(token: string | null) {
  try {
    if (!token) {
      localStorage.removeItem(MASTER_TOKEN_KEY);
      return;
    }
    localStorage.setItem(MASTER_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}
