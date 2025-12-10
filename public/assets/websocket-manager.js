(() => {
/**
 * WebSocket Manager - Handles WebSocket connection and messaging
 */
class WebSocketManager {
    constructor() {
        this._ws = null;
        this._isConnected = false;
        this._manualDisconnect = false;
        this._reconnectAttempts = 0;
        this._reconnectTimer = null;
        this._pingInterval = null;
        this._maxReconnectDelay = 15000;
        this._baseReconnectDelay = 1000;

        this._onMessageCallbacks = [];
        this._onStatusChangeCallbacks = [];
        this._onPongCallbacks = [];
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this._ws = new WebSocket(wsUrl);

        this._ws.onopen = () => {
            console.log('WebSocket connected');
            this._isConnected = true;
            this._manualDisconnect = false;
            this._reconnectAttempts = 0;
            this._notifyStatusChange(true);
            this._startPing();
        };

        this._ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                try {
                    this._handleMessage(data);
                } catch (e) {
                    console.error('Message handling error:', e);
                }
            } catch (e) {
                console.error('JSON parsing error:', e);
            }
        };

        this._ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this._ws.onclose = () => {
            console.log('WebSocket disconnected');
            this._isConnected = false;
            this._ws = null;
            this._stopPing();
            this._notifyStatusChange(false);

            if (!this._manualDisconnect) {
                this._scheduleReconnect();
            }
        };
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this._manualDisconnect = true;
        this._stopPing();

        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected() {
        return this._isConnected;
    }

    /**
     * Check if manually disconnected
     * @returns {boolean}
     */
    isManuallyDisconnected() {
        return this._manualDisconnect;
    }

    /**
     * Send message to server
     * @param {Object} data - Data to send
     */
    send(data) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(data));
        }
    }

    _handleMessage(data) {
        if (data.type === 'pong') {
            const serverTime = new Date(data.timestamp).getTime();
            const now = Date.now();
            const roadtripDelay = now - serverTime;

            PerfMonitor.setRoadtripDelay(roadtripDelay);

            this._onPongCallbacks.forEach(cb => cb({
                timestamp: data.timestamp,
                delay: roadtripDelay
            }));
        }

        // Handle log messages
        const logTypes = [
            'log-silly', 'log-verbose', 'log-debug', 'log-log',
            'log-info', 'log-success', 'log-warn', 'log-error', 'log-fatal'
        ];

        if (logTypes.includes(data.type)) {
            this._onMessageCallbacks.forEach(cb => cb({
                type: data.type,
                callLine: data.callLine || '',
                argList: data.argList,
                date: data.date || new Date().toISOString(),
                boundDatas: data.boundDatas || {}
            }));
        }
    }

    _startPing() {
        this._stopPing();
        this._pingInterval = setInterval(() => {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 1000);
    }

    _stopPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
        }
    }

    _getReconnectDelay() {
        return Math.min(
            this._baseReconnectDelay * Math.pow(1.5, this._reconnectAttempts),
            this._maxReconnectDelay
        );
    }

    _scheduleReconnect() {
        const delay = this._getReconnectDelay();
        let countdown = Math.ceil(delay / 1000);

        // Notify about reconnect countdown
        this._notifyReconnectCountdown(countdown);

        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                this._notifyReconnectCountdown(countdown);
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);

        this._reconnectTimer = setTimeout(() => {
            clearInterval(countdownInterval);
            this._reconnectAttempts++;
            this.connect();
        }, delay);
    }

    _notifyReconnectCountdown(seconds) {
        DOM.setText('reconnectInfo', `Reconnecting in ${seconds}s...`);
    }

    _notifyStatusChange(connected) {
        this._onStatusChangeCallbacks.forEach(cb => cb(connected));
    }

    /**
     * Register message callback
     * @param {Function} callback
     */
    onMessage(callback) {
        this._onMessageCallbacks.push(callback);
    }

    /**
     * Register status change callback
     * @param {Function} callback
     */
    onStatusChange(callback) {
        this._onStatusChangeCallbacks.push(callback);
    }

    /**
     * Register pong callback
     * @param {Function} callback
     */
    onPong(callback) {
        this._onPongCallbacks.push(callback);
    }
}

// Export singleton instance
window.WS = new WebSocketManager();

})();