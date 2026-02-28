export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger {
  private static formatMessage(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}] ${message}`;
  }

  static debug(context: string, message: string, ...meta: any[]) {
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
      console.debug(Logger.formatMessage(LogLevel.DEBUG, context, message), meta.length ? meta : '');
    }
  }

  static info(context: string, message: string, ...meta: any[]) {
    console.info(Logger.formatMessage(LogLevel.INFO, context, message), meta.length ? meta : '');
  }

  static warn(context: string, message: string, ...meta: any[]) {
    console.warn(Logger.formatMessage(LogLevel.WARN, context, message), meta.length ? meta : '');
  }

  static error(context: string, message: string, ...meta: any[]) {
    console.error(Logger.formatMessage(LogLevel.ERROR, context, message), meta.length ? meta : '');
  }
}
