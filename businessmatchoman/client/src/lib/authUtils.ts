// Utilities for authentication token management

/**
 * The key used for storing the authentication token in localStorage
 */
export const AUTH_TOKEN_KEY = "authToken";

/**
 * Get the authentication token from localStorage
 * @returns The token or null if not present
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Save the authentication token to localStorage
 * @param token The token to save
 */
export function saveAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Remove the authentication token from localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Check if the current user is authenticated (has a token)
 * @returns True if authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
