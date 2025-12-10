import { LogEntry, LoggyConfig } from './types';
import { LoggyConfiguration } from './config';

/**
 * WebSocket manager for log transmission
 */
export class WebSocketManager {
  private _ws: WebSocket | null = null;
  private _config = LoggyConfiguration.getInstance();
  private _reconnectAttempts = 0;
  private _maxReconnectAttempts = 5;
  private _reconnectTimeout = 1000; // Start with 1 second
  private _messageQueue: LogEntry[] = [];

  constructor() {
    this._initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  private _initializeWebSocket(): void {
    const serverConfig = this._config.getConfig().server;
    
    // Determine WebSocket URL
    const wsUrl = serverConfig?.type === 'remote' && serverConfig.remoteAddress
      ? `${serverConfig.remoteAddress}:${serverConfig.remotePort || 8080}`
      : 'ws://localhost:8080';

    try {
      this._ws = new WebSocket(wsUrl);
      
      this._ws.onopen = () => {
        console.log('[Loggy] WebSocket connected');
        this._reconnectAttempts = 0;
        this._flushMessageQueue();
      };

      this._ws.onclose = () => {
        console.warn('[Loggy] WebSocket disconnected');
        this._attemptReconnect();
      };

      this._ws.onerror = (error) => {
        console.error('[Loggy] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Loggy] Failed to create WebSocket:', error);
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private _attemptReconnect(): void {
    if (this._reconnectAttempts < this._maxReconnectAttempts) {
      this._reconnectAttempts++;
      
      // Exponential backoff for reconnection
      const timeout = this._reconnectTimeout * Math.pow(2, this._reconnectAttempts);
      
      setTimeout(() => {
        console.log(`[Loggy] Attempting to reconnect (${this._reconnectAttempts}/${this._maxReconnectAttempts})`);
        this._initializeWebSocket();
      }, timeout);
    } else {
      console.error('[Loggy] Max reconnection attempts reached. Giving up.');
    }
  }

  /**
   * Send log entry via WebSocket
   * @param entry Log entry to send
   */
  public send(entry: LogEntry): void {
    // Skip sending if in production mode with dashboard disabled
    const config = this._config.getConfig();
    if (config.production?.disableDashboard) return;

    // If WebSocket is not ready, queue the message
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      this._messageQueue.push(entry);
      return;
    }

    try {
      this._ws.send(JSON.stringify(entry));
    } catch (error) {
      console.error('[Loggy] Failed to send log entry:', error);
      // Add back to queue to retry
      this._messageQueue.push(entry);
    }
  }

  /**
   * Flush queued messages when connection is established
   */
  private _flushMessageQueue(): void {
    while (this._messageQueue.length > 0) {
      const entry = this._messageQueue.shift();
      if (entry) this.send(entry);
    }
  }
}