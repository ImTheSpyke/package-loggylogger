(() => {
/**
 * Log Renderer - Handles log entry creation and rendering with syntax highlighting
 */
class LogRenderer {
    constructor() {
        this._syntaxHighlightEnabled = false;
        this._displayMode = 'box'; // 'box' or 'inline'
        this._objectDepth = 2;
        this._searchFilter = '';
        this._searchRegex = null;
        this._isRegexMode = false;
    }

    /**
     * Set syntax highlighting enabled
     * @param {boolean} enabled
     */
    setSyntaxHighlight(enabled) {
        this._syntaxHighlightEnabled = enabled;
    }

    /**
     * Get syntax highlighting state
     * @returns {boolean}
     */
    isSyntaxHighlightEnabled() {
        return this._syntaxHighlightEnabled;
    }

    /**
     * Set display mode
     * @param {string} mode - 'box' or 'inline'
     */
    setDisplayMode(mode) {
        this._displayMode = mode;
    }

    /**
     * Get display mode
     * @returns {string}
     */
    getDisplayMode() {
        return this._displayMode;
    }

    /**
     * Set object depth
     * @param {number} depth
     */
    setObjectDepth(depth) {
        this._objectDepth = depth;
    }

    /**
     * Set search filter
     * @param {string} filter
     * @param {boolean} isRegex
     */
    setSearchFilter(filter, isRegex = false) {
        this._searchFilter = filter;
        this._isRegexMode = isRegex;
        this._searchRegex = null;

        if (isRegex && filter) {
            try {
                this._searchRegex = new RegExp(filter, 'gi');
            } catch (e) {
                this._searchRegex = null;
            }
        }
    }

    /**
     * Format arguments for display
     * @param {Array} args - Argument list
     * @param {number} depth - Max depth
     * @returns {string}
     */
    formatArgs(args, depth = this._objectDepth) {
        if (!args || args.length === 0) return '';
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return this.stringifyWithDepth(arg, depth);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    /**
     * Stringify object with depth limit
     * @param {any} obj - Object to stringify
     * @param {number} maxDepth - Max depth
     * @param {number} currentDepth - Current depth
     * @returns {string}
     */
    stringifyWithDepth(obj, maxDepth, currentDepth = 0) {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (typeof obj !== 'object') return JSON.stringify(obj);

        if (currentDepth >= maxDepth) {
            if (Array.isArray(obj)) return `[Array(${obj.length})]`;
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            return `{${keys.join(', ')}}`;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            const items = obj.map(item => this.stringifyWithDepth(item, maxDepth, currentDepth + 1));
            return '[\n' + items.map(item => '  '.repeat(currentDepth + 1) + item).join(',\n') + '\n' + '  '.repeat(currentDepth) + ']';
        }

        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        const items = keys.map(key => {
            const value = this.stringifyWithDepth(obj[key], maxDepth, currentDepth + 1);
            return '  '.repeat(currentDepth + 1) + JSON.stringify(key) + ': ' + value;
        });
        return '{\n' + items.join(',\n') + '\n' + '  '.repeat(currentDepth) + '}';
    }

    /**
     * Apply syntax highlighting to text
     * @param {string} text - Text to highlight
     * @returns {string} - HTML with highlighting
     */
    applySyntaxHighlight(text) {

        // Tokenize and highlight
        let result = '';
        let i = 0;

        while (i < text.length) {
            // Check for string (double or single quotes)
            if (text[i] === '"' || text[i] === "'") {
                const quote = text[i];
                let j = i + 1;
                while (j < text.length && text[j] !== quote) {
                    if (text[j] === '\\') j++; // Skip escaped char
                    j++;
                }
                j++; // Include closing quote
                const str = text.slice(i, j);
                result += `<span class="syntax-string">${DOM.escapeHtml(str)}</span>`;
                i = j;
                continue;
            }

            // Check for number
            if (/[\d\-]/.test(text[i])) {
                let j = i;
                if (text[j] === '-') j++;
                while (j < text.length && /[\d.eE\-+]/.test(text[j])) j++;
                const num = text.slice(i, j);
                if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(num)) {
                    result += `<span class="syntax-number">${DOM.escapeHtml(num)}</span>`;
                    i = j;
                    continue;
                }
            }

            // Check for boolean/null
            const remaining = text.slice(i);
            const boolMatch = remaining.match(/^(true|false|null|undefined)\b/);
            if (boolMatch) {
                const keyword = boolMatch[1];
                const cls = keyword === 'null' || keyword === 'undefined' ? 'syntax-null' : 'syntax-boolean';
                result += `<span class="${cls}">${keyword}</span>`;
                i += keyword.length;
                continue;
            }

            // Check for key (word followed by colon)
            const keyMatch = remaining.match(/^"([^"]+)":/);
            if (keyMatch) {
                result += `<span class="syntax-key">"${DOM.escapeHtml(keyMatch[1])}"</span>:`;
                i += keyMatch[0].length;
                continue;
            }

            // Check for brackets/braces
            if (/[\[\]{}]/.test(text[i])) {
                result += `<span class="syntax-bracket">${text[i]}</span>`;
                i++;
                continue;
            }

            // Default: escape and add
            result += DOM.escapeHtml(text[i]);
            i++;
        }

        return result;
    }

    /**
     * Highlight search matches in text
     * @param {string} text - Text to highlight
     * @param {RegExp} regex - Search regex
     * @returns {string} - HTML with highlights
     */
    highlightMatches(text, regex) {
        if (!regex) return DOM.escapeHtml(text);

        regex.lastIndex = 0;
        const result = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                result.push(DOM.escapeHtml(text.slice(lastIndex, match.index)));
            }
            result.push(`<span class="highlight">${DOM.escapeHtml(match[0])}</span>`);
            lastIndex = regex.lastIndex;
            if (match[0].length === 0) regex.lastIndex++;
        }

        if (lastIndex < text.length) {
            result.push(DOM.escapeHtml(text.slice(lastIndex)));
        }

        return result.join('');
    }

    /**
     * Check if text matches search filter
     * @param {string} text - Text to check
     * @returns {boolean}
     */
    matchesSearch(text) {
        if (!this._searchFilter) return true;

        if (this._isRegexMode && this._searchRegex) {
            this._searchRegex.lastIndex = 0;
            return this._searchRegex.test(text);
        }

        return text.toLowerCase().includes(this._searchFilter.toLowerCase());
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string}
     */
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            });
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Create log entry element
     * @param {Object} log - Log object
     * @param {boolean} isNew - Is new log
     * @param {Array} enabledChecks - Enabled checks
     * @returns {HTMLElement}
     */
    createLogEntry(log, isNew = false, enabledChecks = []) {
        const entry = document.createElement('div');
        entry.dataset.logId = log.id;

        const logText = this.formatArgs(log.argList, this._objectDepth);

        if (this._displayMode === 'inline') {
            return this._createInlineEntry(entry, log, logText, isNew, enabledChecks);
        }
        return this._createBoxEntry(entry, log, logText, isNew, enabledChecks);
    }

    /**
     * Create inline mode entry
     */
    _createInlineEntry(entry, log, logText, isNew, enabledChecks) {
        entry.className = `log-entry ${log.type} inline-mode${isNew ? ' new' : ''}`;

        const dateSpan = DOM.create('span', {
            className: 'log-inline-date',
            text: log.date ? this.formatDate(log.date) : ''
        });

        const typeSpan = DOM.create('span', {
            className: `log-inline-type log-type ${log.type}`,
            text: log.type
        });

        const callLineSpan = DOM.create('span', {
            className: 'log-inline-callline',
            text: log.callLine || '',
            title: log.callLine || ''
        });

        const argsSpan = DOM.create('span', {
            className: 'log-inline-args',
            title: logText
        });

        this._applyContentWithHighlight(argsSpan, logText);

        const checksDiv = DOM.create('div', { className: 'log-inline-checks' });
        this._renderCheckIcons(checksDiv, log, enabledChecks, false);

        entry.appendChild(dateSpan);
        entry.appendChild(typeSpan);
        entry.appendChild(callLineSpan);
        entry.appendChild(argsSpan);
        entry.appendChild(checksDiv);

        return entry;
    }

    /**
     * Create box mode entry
     */
    _createBoxEntry(entry, log, logText, isNew, enabledChecks) {
        entry.className = `log-entry ${log.type}${isNew ? ' new' : ''}`;

        const header = DOM.create('div', { className: 'log-header' });
        const leftSide = DOM.create('div', { className: 'log-header-left' });
        const rightSide = DOM.create('div', { className: 'log-header-right' });

        const typeSpan = DOM.create('span', {
            className: `log-type ${log.type}`,
            text: log.type
        });

        const dateSpan = DOM.create('span', {
            className: 'log-date',
            text: log.date ? this.formatDate(log.date) : ''
        });

        const checksDiv = DOM.create('div', { className: 'log-checks' });
        this._renderCheckIcons(checksDiv, log, enabledChecks, false);

        leftSide.appendChild(typeSpan);
        leftSide.appendChild(dateSpan);
        leftSide.appendChild(checksDiv);

        const lineSpan = DOM.create('span', {
            className: 'log-line',
            text: log.callLine || ''
        });
        rightSide.appendChild(lineSpan);

        header.appendChild(leftSide);
        header.appendChild(rightSide);

        const content = DOM.create('div', { className: 'log-content' });
        this._applyContentWithHighlight(content, logText);

        entry.appendChild(header);
        entry.appendChild(content);

        return entry;
    }

    /**
     * Apply content with search highlighting and optional syntax highlighting
     */
    _applyContentWithHighlight(element, text) {
        if (this._searchFilter) {
            let regex;
            if (this._isRegexMode && this._searchRegex) {
                regex = new RegExp(this._searchFilter, 'gi');
            } else if (this._searchFilter) {
                regex = new RegExp(this._searchFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            }
            element.innerHTML = this.highlightMatches(text, regex);
        } else if (this._syntaxHighlightEnabled) {
            element.innerHTML = this.applySyntaxHighlight(text);
        } else {
            element.textContent = text;
        }
    }

    /**
     * Render check result icons
     */
    _renderCheckIcons(container, log, enabledChecks, showTime = false) {
        enabledChecks.forEach(check => {
            const { result, time } = ChecksManager.runCheck(check, log);
            const icon = DOM.create('span', {
                className: `log-check-icon ${result ? 'pass' : 'fail'}`,
                text: showTime ? time.toFixed(4) : String(check.id),
                title: `${check.name}: ${result ? 'Pass' : 'Fail'}${showTime ? ` (${time.toFixed(4)}ms)` : ''}`
            });
            container.appendChild(icon);
        });
    }

    /**
     * Create log detail content
     * @param {Object} log - Log object
     * @param {boolean} showExecTime - Show execution time instead of PASS/FAIL
     * @param {boolean} detailSyntaxHighlight - Override syntax highlighting for detail panel
     * @returns {string} - HTML content
     */
    createDetailContent(log, showExecTime = true, detailSyntaxHighlight = false) {
        const boundDatas = log.boundDatas || {};
        const enabledChecks = ChecksManager.getEnabled();
        const useSyntax = detailSyntaxHighlight;

        let checksHtml = enabledChecks.map(check => {
            const { result, time } = ChecksManager.runCheck(check, log);
            const display = showExecTime ? `${time.toFixed(4)}ms` : (result ? 'PASS' : 'FAIL');
            return `<span class="log-check-icon ${result ? 'pass' : 'fail'}">${check.id}: ${DOM.escapeHtml(check.name)} - ${display}</span>`;
        }).join('');

        if (!checksHtml) {
            checksHtml = '<span style="color: #858585;">No checks enabled</span>';
        }

        return `
            <div class="log-detail-meta">
                <div class="log-detail-meta-item">
                    <label>Type</label>
                    <span class="log-type ${log.type}">${log.type.toUpperCase()}</span>
                </div>
                <div class="log-detail-meta-item">
                    <label>Date</label>
                    <span>${log.date ? new Date(log.date).toLocaleString() : 'N/A'}</span>
                </div>
                <div class="log-detail-meta-item">
                    <label>Call Line</label>
                    <span>${log.callLine || 'N/A'}</span>
                </div>
            </div>
            <div class="log-detail-section">
                <h4>
                    Arguments (depth: 5)
                    <div class="copy-buttons">
                        <button class="secondary" id="toggleDetailSyntax">${useSyntax ? 'Disable' : 'Enable'} Syntax Highlighting</button>
                        <button class="secondary" id="copyCompact">Copy Compact</button>
                        <button class="secondary" id="copyExtended">Copy Extended</button>
                    </div>
                </h4>
                <pre id="logArgsContent">${useSyntax
                    ? this.applySyntaxHighlight(this.formatArgs(log.argList, 5))
                    : DOM.escapeHtml(this.formatArgs(log.argList, 5))}</pre>
            </div>
            <div class="log-detail-section">
                <h4>Bound Data</h4>
                <pre id="logBoundDataContent">${useSyntax
                    ? this.applySyntaxHighlight(Object.keys(boundDatas).length > 0 ? this.stringifyWithDepth(boundDatas, 5) : '{}')
                    : DOM.escapeHtml(Object.keys(boundDatas).length > 0 ? this.stringifyWithDepth(boundDatas, 5) : '{}')}</pre>
            </div>
            <div class="log-detail-section">
                <h4>Check Results${showExecTime ? ' (execution time)' : ''}</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${checksHtml}
                </div>
            </div>
        `;
    }
}

// Export singleton instance
window.LogRenderer = new LogRenderer();

})();