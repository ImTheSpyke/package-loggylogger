(() => {
/**
 * Utility functions
 */
const Utils = {
    /**
     * Set hash value in URL
     * @param {string} key - Key
     * @param {any} value - Value
     */
    setHashValue(key, value) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const encoded = Array.isArray(value) ? JSON.stringify(value) : String(value);
        hash.set(key, encoded);
        window.location.hash = hash.toString();
    },

    /**
     * Get hash value from URL
     * @param {string} key - Key
     * @returns {any}
     */
    getHashValue(key) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const raw = hash.get(key);
        if (raw === null) return null;

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // Not JSON, return raw string
        }
        return raw;
    },

    /**
     * Get file from call line string
     * @param {string} callLine - Call line (e.g., "file.ts:123:45")
     * @returns {string|null}
     */
    getFileFromCallLine(callLine) {
        if (!callLine) return null;
        const match = callLine.match(/^(.+?):(\d+)(?::\d+)?$/);
        return match ? match[1] : callLine;
    },

    /**
     * Get line number from call line string
     * @param {string} callLine - Call line
     * @returns {number|null}
     */
    getLineFromCallLine(callLine) {
        if (!callLine) return null;
        const match = callLine.match(/:(\d+)(?::\d+)?$/);
        return match ? parseInt(match[1]) : null;
    },

    /**
     * Check if line is in ranges
     * @param {number} line - Line number
     * @param {Array} ranges - Array of [start, end] tuples
     * @returns {boolean}
     */
    isLineInRanges(line, ranges) {
        if (!ranges || ranges.length === 0) return true;
        return ranges.some(([start, end]) => line >= start && line <= end);
    },

    /**
     * Sort files by directory then name
     * @param {Array} files - Array of file paths
     * @returns {Array}
     */
    sortFiles(files) {
        return files.slice().sort((a, b) => {
            const aParts = a.split(/[/\\]/);
            const bParts = b.split(/[/\\]/);
            const minLen = Math.min(aParts.length, bParts.length);

            for (let i = 0; i < minLen; i++) {
                const aIsLast = i === aParts.length - 1;
                const bIsLast = i === bParts.length - 1;
                if (!aIsLast && bIsLast) return -1;
                if (aIsLast && !bIsLast) return 1;
                const cmp = aParts[i].localeCompare(bParts[i], undefined, { sensitivity: 'base' });
                if (cmp !== 0) return cmp;
            }
            return aParts.length - bParts.length;
        });
    },

    /**
     * Debounce function
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms
     * @returns {Function}
     */
    debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        };
    },

    /**
     * Throttle function
     * @param {Function} fn - Function to throttle
     * @param {number} limit - Limit in ms
     * @returns {Function}
     */
    throttle(fn, limit) {
        let inThrottle = false;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export to window
window.Utils = Utils;

})();