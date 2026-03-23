/**
 * Chat Types
 * 
 * TypeScript interfaces for chat functionality
 */

export interface Message {
  id: number;
  type: 'assistant' | 'user' | 'error' | 'loading';
  content: string;
  avatar?: string;
  timestamp?: Date;
}

export interface ChatAPIResponse {
  success: boolean;
  data?: {
    reply: string;
  };
  error?: {
    message: string;
    details?: any;
  };
}

export interface HealthCheckResponse {
  success: boolean;
  data?: {
    status: string;
    timestamp: string;
    service: string;
  };
}

export interface ChatServiceError {
  message: string;
  code?: string;
  statusCode?: number;
}
