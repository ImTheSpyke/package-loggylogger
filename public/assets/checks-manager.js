

(() => {/**
 * Checks Manager - Handles check creation, execution, caching, and killswitch
 */
class ChecksManager {
    constructor() {
        this._checks = [];
        this._checkIdCounter = 0;
        this._maxChecks = 100;
        this._killswitchThreshold = 25; // ms
        this._resultCache = new Map(); // Map<logId, Map<checkId, {result, time}>>
        this._executionTimes = new Map(); // Map<checkId, number[]> - last 60s of execution times
        this._lastExecutionTimes = new Map(); // Map<checkId, number> - last execution time
        this._checksFilter = new Set();
        this._enabledChecksCache = null; // Cached array of enabled checks
        this._onChangeCallbacks = [];
    }

    /**
     * Add a new check
     * @param {string} name - Check name
     * @param {string} code - Check code
     * @returns {Object|null} - Created check or null if failed
     */
    add(name, code) {
        if (this._checks.length >= this._maxChecks) {
            Toast.warning(`Maximum ${this._maxChecks} checks allowed`);
            return null;
        }

        try {
            const fn = new Function('date', 'type', 'callLine', 'argList', 'boundDatas', code);

            // Validate execution time
            const startTime = performance.now();
            fn(new Date(), 'info', 'test:1', [], {});
            const execTime = performance.now() - startTime;

            if (execTime > 10) {
                Toast.error('Check validation failed: execution time > 10ms');
                return null;
            }

            const check = {
                id: ++this._checkIdCounter,
                name: name || 'Unnamed Check',
                code,
                enabled: true,
                killed: false,
                fn
            };

            this._checks.push(check);
            this._executionTimes.set(check.id, []);
            this._notifyChange();

            return check;
        } catch (e) {
            Toast.error(`Invalid code: ${e.message}`);
            return null;
        }
    }

    /**
     * Update an existing check
     * @param {number} id - Check ID
     * @param {string} name - New name
     * @param {string} code - New code
     * @returns {boolean}
     */
    update(id, name, code) {
        const check = this._checks.find(c => c.id === id);
        if (!check) return false;

        try {
            const fn = new Function('date', 'type', 'callLine', 'argList', 'boundDatas', code);

            // Validate execution time
            const startTime = performance.now();
            fn(new Date(), 'info', 'test:1', [], {});
            const execTime = performance.now() - startTime;

            if (execTime > 10) {
                Toast.error('Check validation failed: execution time > 10ms');
                return false;
            }

            check.name = name || 'Unnamed Check';
            check.code = code;
            check.fn = fn;
            check.killed = false; // Re-enable if it was killed

            // Clear cache for this check
            this._resultCache.forEach(logCache => logCache.delete(id));

            this._notifyChange();
            return true;
        } catch (e) {
            Toast.error(`Invalid code: ${e.message}`);
            return false;
        }
    }

    /**
     * Remove a check
     * @param {number} id - Check ID
     */
    remove(id) {
        const idx = this._checks.findIndex(c => c.id === id);
        if (idx > -1) {
            this._checks.splice(idx, 1);
            this._checksFilter.delete(id);
            this._executionTimes.delete(id);

            // Clear cache entries
            this._resultCache.forEach(logCache => logCache.delete(id));

            this._notifyChange();
        }
    }

    /**
     * Toggle check enabled state
     * @param {number} id - Check ID
     * @param {boolean} enabled - Enabled state
     */
    setEnabled(id, enabled) {
        const check = this._checks.find(c => c.id === id);
        if (check) {
            check.enabled = enabled;
            if (!enabled) {
                this._checksFilter.delete(id);
            }
            this._notifyChange();
        }
    }

    /**
     * Disable all checks at once
     */
    disableAll() {
        this._checks.forEach(check => {
            check.enabled = false;
        });
        this._checksFilter.clear();
        this._notifyChange();
        Toast.info('All checks disabled');
    }

    /**
     * Enable all checks at once
     */
    enableAll() {
        this._checks.forEach(check => {
            if (!check.killed) {
                check.enabled = true;
            }
        });
        this._notifyChange();
        Toast.info('All checks enabled');
    }

    /**
     * Run a check on a log with caching
     * @param {Object} check - Check object
     * @param {Object} log - Log object
     * @returns {{result: boolean, time: number}}
     */
    runCheck(check, log) {
        // Return cached result if available
        if (this._resultCache.has(log.id)) {
            const logCache = this._resultCache.get(log.id);
            if (logCache.has(check.id)) {
                return logCache.get(check.id);
            }
        }

        // Check is killed/disabled
        if (check.killed || !check.enabled) {
            return { result: false, time: 0 };
        }

        const startTime = performance.now();
        let result = false;

        try {
            const date = log.date ? new Date(log.date) : new Date(0);
            const boundDatas = log.boundDatas || {};
            result = !!check.fn(date, log.type, log.callLine, log.argList, boundDatas);
        } catch (e) {
            console.error('Check error:', check.name, e);
            result = false;
        }

        const execTime = performance.now() - startTime;

        // Track execution time
        this._trackExecutionTime(check.id, execTime);

        // Killswitch: disable check if it takes too long
        if (execTime > this._killswitchThreshold) {
            check.killed = true;
            check.enabled = false;
            Toast.warning(`Check "${check.name}" disabled: took ${execTime.toFixed(2)}ms (> ${this._killswitchThreshold}ms)`);
            this._notifyChange();
        }

        // Cache result
        if (!this._resultCache.has(log.id)) {
            this._resultCache.set(log.id, new Map());
        }
        const cached = { result, time: execTime };
        this._resultCache.get(log.id).set(check.id, cached);

        return cached;
    }

    /**
     * Get check results for a log (uses cached enabled checks)
     * @param {Object} log - Log object
     * @returns {Object} - Map of checkId -> {result, time}
     */
    getLogCheckResults(log) {
        const results = {};
        // Use cached enabled checks for better performance
        this.getEnabled().forEach(check => {
            results[check.id] = this.runCheck(check, log);
        });
        return results;
    }

    /**
     * Check if log passes filter criteria (uses cached enabled checks)
     * @param {Object} log - Log object
     * @returns {boolean}
     */
    passesFilter(log) {
        if (this._checksFilter.size === 0) return true;

        // Use cached enabled checks for faster lookup
        const enabledChecks = this.getEnabled();

        for (const checkId of this._checksFilter) {
            // Use cached enabled checks array for lookup
            const check = enabledChecks.find(c => c.id === checkId);
            if (!check) continue;

            // runCheck already uses result cache, so this is efficient
            const { result } = this.runCheck(check, log);
            if (!result) return false;
        }
        return true;
    }

    /**
     * Toggle filter for a check
     * @param {number} id - Check ID
     */
    toggleFilter(id) {
        if (this._checksFilter.has(id)) {
            this._checksFilter.delete(id);
        } else {
            this._checksFilter.add(id);
        }
        this._notifyChange();
    }

    /**
     * Get average execution time for a check over last 60s
     * @param {number} id - Check ID
     * @returns {number} - Average time in ms
     */
    getAverageExecutionTime(id) {
        const times = this._executionTimes.get(id);
        if (!times || times.length === 0) return 0;
        return times.reduce((a, b) => a + b.time, 0) / times.length;
    }

    /**
     * Get last execution time for a check
     * @param {number} id - Check ID
     * @returns {number} - Last execution time in ms
     */
    getLastExecutionTime(id) {
        return this._lastExecutionTimes.get(id) || 0;
    }

    /**
     * Get execution time stats for a check
     * @param {number} id - Check ID
     * @returns {{avg: number, last: number, sampleCount: number, timeSpanSeconds: number}}
     */
    getExecutionTimeStats(id) {
        const times = this._executionTimes.get(id);
        const lastTime = this._lastExecutionTimes.get(id) || 0;

        if (!times || times.length === 0) {
            return { avg: 0, last: lastTime, sampleCount: 0, timeSpanSeconds: 0 };
        }

        const avg = times.reduce((a, b) => a + b.time, 0) / times.length;
        const sampleCount = times.length;

        // Calculate actual time span from oldest to newest sample
        const timeSpanMs = times.length > 1
            ? times[times.length - 1].timestamp - times[0].timestamp
            : 0;
        const timeSpanSeconds = Math.round(timeSpanMs / 1000);

        return { avg, last: lastTime, sampleCount, timeSpanSeconds };
    }

    /**
     * Track execution time for a check
     * @param {number} id - Check ID
     * @param {number} time - Execution time
     */
    _trackExecutionTime(id, time) {
        // Store last execution time
        this._lastExecutionTimes.set(id, time);

        if (!this._executionTimes.has(id)) {
            this._executionTimes.set(id, []);
        }
        const times = this._executionTimes.get(id);
        times.push({ time, timestamp: Date.now() });

        // Keep only last 60 seconds
        const cutoff = Date.now() - 60000;
        while (times.length > 0 && times[0].timestamp < cutoff) {
            times.shift();
        }
    }

    /**
     * Clean up old cache entries
     * @param {Set} validLogIds - Set of valid log IDs
     */
    cleanCache(validLogIds) {
        for (const logId of this._resultCache.keys()) {
            if (!validLogIds.has(logId)) {
                this._resultCache.delete(logId);
            }
        }
    }

    /**
     * Get all checks
     * @returns {Array}
     */
    getAll() {
        return [...this._checks];
    }

    /**
     * Get enabled checks (uses cache for performance)
     * @returns {Array}
     */
    getEnabled() {
        if (this._enabledChecksCache === null) {
            this._enabledChecksCache = this._checks.filter(c => c.enabled && !c.killed);
        }
        return this._enabledChecksCache;
    }

    /**
     * Invalidate the enabled checks cache
     */
    _invalidateEnabledCache() {
        this._enabledChecksCache = null;
    }

    /**
     * Get check by ID
     * @param {number} id - Check ID
     * @returns {Object|undefined}
     */
    getById(id) {
        return this._checks.find(c => c.id === id);
    }

    /**
     * Get filter set
     * @returns {Set}
     */
    getFilter() {
        return new Set(this._checksFilter);
    }

    /**
     * Get count info
     * @returns {string}
     */
    getCountInfo() {
        return `${this._checks.length}/${this._maxChecks}`;
    }

    /**
     * Check if at max capacity
     * @returns {boolean}
     */
    isAtMax() {
        return this._checks.length >= this._maxChecks;
    }

    /**
     * Register change callback
     * @param {Function} callback
     */
    onChange(callback) {
        this._onChangeCallbacks.push(callback);
    }

    _notifyChange() {
        this._invalidateEnabledCache();
        this._onChangeCallbacks.forEach(cb => cb());
    }
}

// Export singleton instance
window.ChecksManager = new ChecksManager();

})();