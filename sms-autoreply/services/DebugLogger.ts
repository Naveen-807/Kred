// DebugLogger.ts
type LogLevel = 'info' | 'success' | 'warning' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with colors/emojis
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[level];

    const prefix = `${emoji} [${category}]`;
    
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data);
  }

  warning(category: string, message: string, data?: any) {
    this.log('warning', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();
