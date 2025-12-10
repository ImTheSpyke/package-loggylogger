/**
 * Logging levels supported by Loggy
 */
export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Configuration for console logging
 */
export interface ConsoleConfig {
  colors?: boolean;
  emojis?: boolean;
  objectDepth?: number;
}

/**
 * Server configuration for log transmission
 */
export interface ServerConfig {
  type: 'local' | 'remote';
  remoteAddress?: string;
  remotePort?: number;
}

/**
 * Production mode configuration
 */
export interface ProductionConfig {
  enabled: boolean;
  disableDashboard?: boolean;
  minimizeLogging?: boolean;
}

/**
 * Complete Loggy configuration object
 */
export interface LoggyConfig {
  console?: ConsoleConfig;
  server?: ServerConfig;
  production?: ProductionConfig;
}

/**
 * Context for a log entry, capturing additional metadata
 */
export interface LogContext {
  timestamp: number;
  level: LogLevel;
  file?: string;
  line?: number;
  function?: string;
}

/**
 * Bound data that can be attached to a logger instance
 */
export type BoundData = Record<string, unknown>;

/**
 * Log entry structure for transmission
 */
export interface LogEntry {
  args: unknown[];
  context: LogContext;
  boundData?: BoundData;
}