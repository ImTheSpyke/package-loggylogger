import { LoggyConfig, ConsoleConfig, ServerConfig, ProductionConfig } from './types';

/**
 * Configuration management for Loggy logger
 */
export class LoggyConfiguration {
  private static _instance: LoggyConfiguration;
  private _config: LoggyConfig = {};

  private constructor() {}

  /**
   * Singleton instance getter
   */
  public static getInstance(): LoggyConfiguration {
    if (!this._instance) {
      this._instance = new LoggyConfiguration();
    }
    return this._instance;
  }

  /**
   * Update global configuration
   * @param config Partial configuration to merge
   */
  public setConfig(config: LoggyConfig): void {
    this._config = this._mergeConfigs(this._config, config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggyConfig {
    return { ...this._config };
  }

  /**
   * Merge configurations with deep merge
   * @param base Base configuration
   * @param update Configuration to merge
   */
  private _mergeConfigs(base: LoggyConfig, update: LoggyConfig): LoggyConfig {
    return {
      console: {
        ...base.console,
        ...update.console
      },
      server: {
        ...base.server,
        ...update.server
      },
      production: {
        ...base.production,
        ...update.production
      }
    };
  }

  /**
   * Check if in production mode
   */
  public isProduction(): boolean {
    return this._config.production?.enabled || 
           process.env.NODE_ENV === 'production';
  }

  /**
   * Get default configuration
   */
  public getDefaultConfig(): LoggyConfig {
    return {
      console: {
        colors: true,
        emojis: true,
        objectDepth: 3
      },
      server: {
        type: 'local'
      },
      production: {
        enabled: false,
        disableDashboard: false,
        minimizeLogging: false
      }
    };
  }
}