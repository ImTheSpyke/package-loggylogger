(() => {
/**
 * Performance Monitor - Tracks rendering and check execution times
 */
class PerformanceMonitor {
    constructor() {
        this._renderTimes = [];
        this._checksTimes = [];
        this._logsReceivedTimes = [];
        this._logsDisplayedTimes = [];
        this._lastRoadtripDelay = 0;
        this._lastRenderTime = 0;
        this._lastChecksTime = 0;
        this._maxSamples = 100;
        this._timeWindow = 60000; // 60 seconds
        this._onWarningCallbacks = [];
    }

    /**
     * Add render time sample
     * @param {number} time - Render time in ms
     */
    addRenderTime(time) {
        this._lastRenderTime = time;
        this._addSample(this._renderTimes, time);
    }

    /**
     * Add checks execution time sample
     * @param {number} time - Execution time in ms
     */
    addChecksTime(time) {
        this._lastChecksTime = time;
        this._addSample(this._checksTimes, time);
    }

    /**
     * Get last render time (instantaneous)
     * @returns {number}
     */
    getLastRenderTime() {
        return this._lastRenderTime;
    }

    /**
     * Get last checks execution time (instantaneous)
     * @returns {number}
     */
    getLastChecksTime() {
        return this._lastChecksTime;
    }

    /**
     * Track log received timestamp
     */
    trackLogReceived() {
        this._logsReceivedTimes.push(Date.now());
        this._cleanOldTimestamps(this._logsReceivedTimes);
    }

    /**
     * Track log displayed timestamp
     */
    trackLogDisplayed() {
        this._logsDisplayedTimes.push(Date.now());
        this._cleanOldTimestamps(this._logsDisplayedTimes);
    }

    /**
     * Set last roadtrip delay
     * @param {number} delay - Delay in ms
     */
    setRoadtripDelay(delay) {
        this._lastRoadtripDelay = delay;
    }

    /**
     * Get last roadtrip delay
     * @returns {number}
     */
    getRoadtripDelay() {
        return this._lastRoadtripDelay;
    }

    /**
     * Get average render time over last 60s
     * @returns {number}
     */
    getAverageRenderTime() {
        return this._getAverage(this._renderTimes);
    }

    /**
     * Get average checks execution time over last 60s
     * @returns {number}
     */
    getAverageChecksTime() {
        return this._getAverage(this._checksTimes);
    }

    /**
     * Get logs received per second (last second)
     * @returns {number}
     */
    getLogsReceivedPerSecond() {
        const oneSecondAgo = Date.now() - 1000;
        return this._logsReceivedTimes.filter(t => t > oneSecondAgo).length;
    }

    /**
     * Get logs received per minute (last 60s)
     * @returns {number}
     */
    getLogsReceivedPerMinute() {
        return this._logsReceivedTimes.length;
    }

    /**
     * Get logs displayed per second (last second)
     * @returns {number}
     */
    getLogsDisplayedPerSecond() {
        const oneSecondAgo = Date.now() - 1000;
        return this._logsDisplayedTimes.filter(t => t > oneSecondAgo).length;
    }

    /**
     * Get logs displayed per minute (last 60s)
     * @returns {number}
     */
    getLogsDisplayedPerMinute() {
        return this._logsDisplayedTimes.length;
    }

    /**
     * Check performance and return warnings
     * @returns {Object} - Warning states
     */
    checkPerformance() {
        const avgRender = this.getAverageRenderTime();
        const avgChecks = this.getAverageChecksTime();
        const displayedPerSec = this.getLogsDisplayedPerSecond();

        const warnings = {
            renderSlow: avgRender > 10,
            checksSlow: avgChecks > 8,
            highDisplayRate: displayedPerSec > 20,
            connectionLag: this._lastRoadtripDelay > 500
        };

        return warnings;
    }

    /**
     * Get performance stats
     * @returns {Object}
     */
    getStats() {
        return {
            renderAvg: this.getAverageRenderTime(),
            checksAvg: this.getAverageChecksTime(),
            lastRender: this._lastRenderTime,
            lastChecks: this._lastChecksTime,
            receivedPerSec: this.getLogsReceivedPerSecond(),
            receivedPerMin: this.getLogsReceivedPerMinute(),
            displayedPerSec: this.getLogsDisplayedPerSecond(),
            displayedPerMin: this.getLogsDisplayedPerMinute(),
            roadtripDelay: this._lastRoadtripDelay
        };
    }

    /**
     * Reset all statistics
     */
    reset() {
        this._renderTimes = [];
        this._checksTimes = [];
        this._logsReceivedTimes = [];
        this._logsDisplayedTimes = [];
        this._lastRoadtripDelay = 0;
    }

    /**
     * Add sample to array with timestamp
     * @param {Array} arr - Target array
     * @param {number} value - Value to add
     */
    _addSample(arr, value) {
        arr.push({ value, timestamp: Date.now() });

        // Keep max samples
        while (arr.length > this._maxSamples) {
            arr.shift();
        }

        // Clean old samples
        const cutoff = Date.now() - this._timeWindow;
        while (arr.length > 0 && arr[0].timestamp < cutoff) {
            arr.shift();
        }
    }

    /**
     * Get average value from samples
     * @param {Array} arr - Sample array
     * @returns {number}
     */
    _getAverage(arr) {
        if (arr.length === 0) return 0;
        const sum = arr.reduce((acc, sample) => acc + sample.value, 0);
        return sum / arr.length;
    }

    /**
     * Clean old timestamps
     * @param {Array} arr - Timestamp array
     */
    _cleanOldTimestamps(arr) {
        const cutoff = Date.now() - this._timeWindow;
        while (arr.length > 0 && arr[0] < cutoff) {
            arr.shift();
        }
    }

    /**
     * Register warning callback
     * @param {Function} callback
     */
    onWarning(callback) {
        this._onWarningCallbacks.push(callback);
    }

    /**
     * Notify warnings
     * @param {Object} warnings
     */
    notifyWarnings(warnings) {
        this._onWarningCallbacks.forEach(cb => cb(warnings));
    }
}

// Export singleton instance
window.PerfMonitor = new PerformanceMonitor();

})();