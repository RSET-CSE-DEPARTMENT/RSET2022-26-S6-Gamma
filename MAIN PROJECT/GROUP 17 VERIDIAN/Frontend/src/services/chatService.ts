/**
 * Chat Service
 *
 * Handles all API communication with the backend chat service
 * Compatible with FastAPI /ask and /predict endpoints
 */

import type {
  HealthCheckResponse,
  ChatServiceError,
} from '../types/chat.types';
import { getApiUrl, API_ENDPOINTS, API_TIMEOUT } from './api.config';

/**
 * Custom error class for chat service errors
 */
class ChatAPIError extends Error implements ChatServiceError {
  code?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'ChatAPIError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Send a message to the AI financial advisor
 */
export const sendMessage = async (
  message: string,
  isPredictMode: boolean = false
): Promise<string> => {
  // -----------------------------
  // Input validation
  // -----------------------------
  if (!message || message.trim().length === 0) {
    throw new ChatAPIError('Message cannot be empty', 'EMPTY_MESSAGE');
  }

  if (message.length > 5000) {
    throw new ChatAPIError(
      'Message is too long (max 5000 characters)',
      'MESSAGE_TOO_LONG'
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  // =====================================================
  // ⭐ PREDICT MODE → Veridian (/predict)
  // =====================================================
  if (isPredictMode) {
    try {
      // 🛡️ Safe JSON parse
      let payload: any;
      try {
        payload = JSON.parse(message);
      } catch {
        throw new ChatAPIError(
          'Invalid prediction payload',
          'INVALID_PREDICT_PAYLOAD'
        );
      }

      const response = await fetch(
        getApiUrl(API_ENDPOINTS.PREDICT, true),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new ChatAPIError(
          data?.error || 'Prediction failed',
          'PREDICT_ERROR',
          response.status
        );
      }

      // ✅ FastAPI returns: { report: "..." }
      if (!data?.report) {
        throw new ChatAPIError(
          'Invalid prediction response format',
          'INVALID_PREDICT_RESPONSE'
        );
      }

      return data.report;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error instanceof ChatAPIError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new ChatAPIError(
          'Prediction request timed out — please try again',
          'TIMEOUT'
        );
      }

      throw new ChatAPIError(
        error.message || 'Prediction failed',
        'PREDICT_UNKNOWN_ERROR'
      );
    }
  }

  // =====================================================
  // ⭐ NORMAL CHAT → /ask
  // =====================================================
  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.CHAT, false), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: message.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new ChatAPIError(
        data?.error || 'Failed to get response from AI',
        'API_ERROR',
        response.status
      );
    }

    // Expected: { answer: "..." }
    if (!data?.answer) {
      throw new ChatAPIError(
        'Invalid response format from server',
        'INVALID_RESPONSE'
      );
    }

    return data.answer;
  } catch (error: any) {
    clearTimeout(timeoutId);

    console.error('ChatService error:', error);

    if (error.name === 'AbortError') {
      throw new ChatAPIError(
        'Request timeout — please try again',
        'TIMEOUT'
      );
    }

    if (error instanceof ChatAPIError) {
      throw error;
    }

    if (
      error.message?.includes('fetch') ||
      error.message?.includes('Failed to fetch')
    ) {
      throw new ChatAPIError(
        'Unable to connect to the server. Please check backend connectivity.',
        'NETWORK_ERROR'
      );
    }

    throw new ChatAPIError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR'
    );
  }
};

/**
 * Health check for backend
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(getApiUrl(API_ENDPOINTS.HEALTH), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

/**
 * Retry helper with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (
        error.code === 'EMPTY_MESSAGE' ||
        error.code === 'MESSAGE_TOO_LONG'
      ) {
        throw error;
      }

      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

export const chatService = {
  sendMessage,
  healthCheck,
  retryWithBackoff,
};

export default chatService;