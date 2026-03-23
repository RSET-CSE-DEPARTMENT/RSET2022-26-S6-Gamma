/**
 * API Configuration
 *
 * Smart routing:
 * - Normal chat → localhost
 * - Predict mode → ngrok
 */

// ⭐ Local backend (normal chat)
export const LOCAL_API_BASE = 'http://localhost:8000';

// ⭐ Veridian ngrok backend
export const VERIDIAN_API_BASE =
  'https://cyclonic-compressive-ethyl.ngrok-free.dev';

// API timeout
export const API_TIMEOUT = 100000;

// Endpoints
export const API_ENDPOINTS = {
  CHAT: '/ask',
  HEALTH: '/',
  PREDICT: '/predict',
} as const;

/**
 * Get correct API URL based on mode
 */
export const getApiUrl = (
  endpoint: string,
  isPredictMode: boolean = false
): string => {
  const base = isPredictMode ? VERIDIAN_API_BASE : LOCAL_API_BASE;
  return `${base}${endpoint}`;
};