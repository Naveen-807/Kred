// BackendService.ts - Forward SMS to backend
import { debugLogger } from './DebugLogger';

const BACKEND_URL = 'http://10.232.97.88:8080'; // Your Mac's IP address

export interface BackendResponse {
  success: boolean;
  message?: string;
  reply?: string;
  error?: string;
}

export class BackendService {
  private backendUrl: string;

  constructor(backendUrl: string = BACKEND_URL) {
    this.backendUrl = backendUrl;
  }

  setBackendUrl(url: string) {
    this.backendUrl = url;
    debugLogger.info('BACKEND', `Backend URL updated to: ${url}`);
  }

  async forwardSMS(from: string, body: string): Promise<BackendResponse> {
    try {
      debugLogger.info('BACKEND', `Forwarding SMS to backend: ${this.backendUrl}/webhook/sms`, {
        from,
        body: body.substring(0, 50),
      });

      const response = await fetch(`${this.backendUrl}/webhook/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: from,
          Body: body,
          timestamp: new Date().toISOString(),
        }),
        timeout: 10000, // 10 second timeout
      } as any);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      debugLogger.success('BACKEND', 'SMS forwarded successfully', {
        from,
        response: data,
      });

      return {
        success: true,
        message: data.message,
        reply: data.smsResponse || data.message,
      };
    } catch (error) {
      debugLogger.error('BACKEND', 'Error forwarding SMS to backend', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      debugLogger.info('BACKEND', `Testing connection to ${this.backendUrl}/health`);

      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      } as any);

      const isHealthy = response.ok;
      
      if (isHealthy) {
        debugLogger.success('BACKEND', 'Backend connection successful');
      } else {
        debugLogger.error('BACKEND', `Backend returned ${response.status}`);
      }

      return isHealthy;
    } catch (error) {
      debugLogger.error('BACKEND', 'Backend connection failed', error);
      return false;
    }
  }
}

export const backendService = new BackendService();
