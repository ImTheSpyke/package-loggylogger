/**
 * Main Application - Orchestrates all modules
 */
class LoggyLoggerApp {
    constructor() {
        this._logs = [];
        this._logElements = new Map();
        this._logIdCounter = 0;
        this._availableFiles = [];
        this._selectedFiles = new Set();
        this._lineFilters = {};
        this._enabledLogLevels = new Set(['info', 'success', 'warn', 'error', 'fatal']);
        this._bufferSize = 1000;
        this._autoScroll = true;
        this._recording = {
            isRecording: false,
            recordDatas: [],
            start: '',
            end: ''
        };
        this._currentDetailLog = null;
        this._filterDebounceTimer = null;
        this._statsInterval = null;

        this.LOG_LEVELS = ['silly', 'verbose', 'debug', 'log', 'info', 'success', 'warn', 'error', 'fatal'];
        this.BUFFER_PRESETS = [100, 500, 1000, 5000, 10000, 50000];
    }

    /**
     * Initialize the application
     */
    init() {
        this._setupEventListeners();
        this._setupWebSocket();
        this._setupChecksManager();
        this._setupSettings();
        this._startStatsUpdater();

        // Load initial data
        this._fetchLogFiles();
        this._renderChecksContainer();
        this._renderChecksFilterContainer();
        this._updateLogLevelButtons();

        // Set initial buffer display
        DOM.setText('bufferValue', this.BUFFER_PRESETS[2].toLocaleString());
        DOM.setText('bufferInfo', this.BUFFER_PRESETS[2].toLocaleString());

        // Connect after short delay
        setTimeout(() => WS.connect(), 500);
    }

    _setupEventListeners() {
        // Connect/Disconnect buttons
        DOM.on('connectBtn', 'click', () => {
            WS.connect();
        });

        DOM.on('disconnectBtn', 'click', () => {
            WS.disconnect();
            DOM.removeClass('disconnectOverlay', 'visible');
        });

        // Clear logs
        DOM.on('clearBtn', 'click', () => this._clearLogs());

        // Record button
        DOM.on('recordBtn', 'click', () => this._toggleRecording());

        // Filter input with debounce
        DOM.on('filterInput', 'input', () => {
            if (this._filterDebounceTimer) {
                clearTimeout(this._filterDebounceTimer);
            }
            this._filterDebounceTimer = setTimeout(() => {
                this._updateSearchFilter();
                this._filterDebounceTimer = null;
            }, 500);
        });

        // Regex toggle
        DOM.on('regexToggle', 'click', () => {
            const isRegex = DOM.hasClass('regexToggle', 'active');
            DOM.toggleClass('regexToggle', 'active', !isRegex);
            DOM.get('filterInput').placeholder = !isRegex ? 'Regex search...' : 'Search logs...';
            this._updateSearchFilter();
        });

        // Log level buttons
        DOM.get('logLevelButtons').addEventListener('click', (e) => {
            const btn = e.target.closest('.log-level-btn');
            if (btn) this._toggleLogLevel(btn.dataset.level);
        });

        DOM.on('selectAllLevels', 'click', () => {
            this._enabledLogLevels = new Set(this.LOG_LEVELS);
            this._updateLogLevelButtons();
            this._fullRender();
        });

        DOM.on('selectNoneLevels', 'click', () => {
            this._enabledLogLevels.clear();
            this._updateLogLevelButtons();
            this._fullRender();
        });

        DOM.on('selectInfoAndAbove', 'click', () => {
            this._enabledLogLevels = new Set(['info', 'success', 'warn', 'error', 'fatal']);
            this._updateLogLevelButtons();
            this._fullRender();
        });

        // File filter
        DOM.on('fileFilterInput', 'input', (e) => {
            this._fileFilter = e.target.value;
            this._renderFileList();
        });

        DOM.on('clearFilesBtn', 'click', () => {
            this._selectedFiles.clear();
            this._lineFilters = {};
            this._renderFileList();
            this._updateSelectedFilesInfo();
            this._fullRender();
        });

        // Depth slider
        DOM.on('depthSlider', 'input', (e) => {
            const depth = parseInt(e.target.value, 10);
            LogRenderer.setObjectDepth(depth);
            DOM.setText('depthValue', depth);
            this._fullRender();
        });

        // Buffer slider
        DOM.on('bufferSlider', 'input', (e) => {
            const index = parseInt(e.target.value, 10);
            this._bufferSize = this.BUFFER_PRESETS[index];
            DOM.setText('bufferValue', this._bufferSize.toLocaleString());
            DOM.setText('bufferInfo', this._bufferSize.toLocaleString());
            this._trimBuffer();
        });

        // Display mode toggle
        DOM.query('.display-mode-toggle').addEventListener('click', (e) => {
            const btn = e.target.closest('.display-mode-btn');
            if (btn) {
                const mode = btn.dataset.mode;
                LogRenderer.setDisplayMode(mode);
                DOM.queryAll('.display-mode-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });
                this._fullRender();
            }
        });

        // Scroll handling
        DOM.get('logsContainer').addEventListener('scroll', () => {
            this._autoScroll = this._isAtBottom();
            this._updateScrollIndicator();
        });

        DOM.on('scrollIndicator', 'click', () => this._scrollToBottom());
        DOM.on('backToLiveBtn', 'click', () => this._scrollToBottom());

        // Add check button
        DOM.on('addCheckBtn', 'click', () => this._openCheckModal());

        // Disable all checks button
        DOM.on('disableAllChecksBtn', 'click', () => {
            ChecksManager.disableAll();
            this._renderChecksContainer();
            this._renderChecksFilterContainer();
            this._fullRender();
        });

        // Check modal buttons
        DOM.on('cancelCheckBtn', 'click', () => this._closeCheckModal());
        DOM.on('saveCheckBtn', 'click', () => this._saveCheck());

        DOM.get('checkModal').addEventListener('mousedown', (e) => {
            if (e.target.id === 'checkModal') this._closeCheckModal();
        });

        // Line filter modal
        DOM.on('addRangeBtn', 'click', () => this._addLineRange());
        DOM.on('cancelModalBtn', 'click', () => this._closeLineFilterModal());
        DOM.on('clearRangesBtn', 'click', () => this._clearLineRanges());
        DOM.on('saveRangesBtn', 'click', () => this._saveLineRanges());

        DOM.get('lineFilterModal').addEventListener('mousedown', (e) => {
            if (e.target.id === 'lineFilterModal') this._closeLineFilterModal();
        });

        // Log detail overlay
        DOM.on('closeLogDetail', 'click', () => this._closeLogDetail());
        DOM.get('logDetailOverlay').addEventListener('mousedown', (e) => {
            if (e.target.id === 'logDetailOverlay') this._closeLogDetail();
        });

        // Syntax highlight toggle
        DOM.on('syntaxHighlightToggle', 'change', (e) => {
            Settings.setSyntaxHighlight(e.target.checked);
            this._fullRender();
        });

        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (DOM.hasClass('logDetailOverlay', 'visible')) this._closeLogDetail();
                else if (DOM.hasClass('checkModal', 'visible')) this._closeCheckModal();
                else if (DOM.hasClass('lineFilterModal', 'visible')) this._closeLineFilterModal();
            }
        });
    }

    _setupWebSocket() {
        WS.onStatusChange((connected) => {
            this._updateConnectionStatus(connected);
        });

        WS.onMessage((logData) => {
            this._addLog(logData);
        });

        WS.onPong(({ timestamp, delay }) => {
            DOM.setText('lastRoadtripDelay', `${delay}ms`);
            DOM.setText('performanceWarningPing', (delay / 1000).toFixed(1));

            if (delay > 500) {
                DOM.addClass('performanceWarning', 'visible');
                DOM.setText('performanceWarningAmount', delay);
            } else {
                DOM.removeClass('performanceWarning', 'visible');
            }
        });
    }

    _setupChecksManager() {
        ChecksManager.onChange(() => {
            this._renderChecksContainer();
            this._renderChecksFilterContainer();
        });
    }

    _setupSettings() {
        Settings.initResizablePanel();
        Settings.loadSettings();

        Settings.onSettingsChange((setting, value) => {
            if (setting === 'syntaxHighlight') {
                this._fullRender();
            }
        });
    }

    _startStatsUpdater() {
        this._statsInterval = setInterval(() => {
            this._updateStatistics();
            this._updatePerformanceWarnings();
            this._updateChecksTimingDisplay();
        }, 1000);
    }

    _updateConnectionStatus(connected) {
        if (connected) {
            DOM.addClass('statusIndicator', 'connected');
            DOM.setText('statusText', 'Connected');
            DOM.setDisabled('connectBtn', true);
            DOM.setDisabled('disconnectBtn', false);
            DOM.removeClass('disconnectOverlay', 'visible');
        } else {
            DOM.removeClass('statusIndicator', 'connected');
            DOM.setText('statusText', 'Disconnected');
            DOM.setDisabled('connectBtn', false);
            DOM.setDisabled('disconnectBtn', true);
            if (!WS.isManuallyDisconnected()) {
                DOM.addClass('disconnectOverlay', 'visible');
            }
        }
    }

    _updateStatistics() {
        const stats = PerfMonitor.getStats();

        DOM.setText('logsPerSecondReceived', stats.receivedPerSec);
        DOM.setText('logsPerMinuteReceived', stats.receivedPerMin);
        DOM.setText('logsPerSecondDisplayed', stats.displayedPerSec);
        DOM.setText('logsPerMinuteDisplayed', stats.displayedPerMin);
        DOM.setText('avgRenderTime', stats.renderAvg.toFixed(2));
        DOM.setText('avgChecksTime', stats.checksAvg.toFixed(2));
        DOM.setText('lastRenderTime', stats.lastRender.toFixed(2));
        DOM.setText('lastChecksTime', stats.lastChecks.toFixed(2));

        // Update visible count
        const container = DOM.get('logsContainer');
        const count = container ? container.children.length - 2 : 0; // Exclude scroll indicator and back button
        DOM.setText('visibleCount', Math.max(0, count));
    }

    _updatePerformanceWarnings() {
        const warnings = PerfMonitor.checkPerformance();
        const stats = PerfMonitor.getStats();

        // Display warning
        if (warnings.highDisplayRate) {
            DOM.addClass('performanceWarning_recommendation_display', 'visible');
        } else {
            DOM.removeClass('performanceWarning_recommendation_display', 'visible');
        }

        // Checks warning
        if (warnings.renderSlow || warnings.checksSlow) {
            DOM.addClass('performanceWarning_recommendation_checks', 'visible');
            DOM.setText('performanceWarning_recommendation_checks_text',
                `Avg render: ${stats.renderAvg.toFixed(2)}ms, Avg checks: ${stats.checksAvg.toFixed(2)}ms`);
        } else {
            DOM.removeClass('performanceWarning_recommendation_checks', 'visible');
        }
    }

    _addLog(logData) {
        const startTime = performance.now();

        if (!logData.date) {
            logData.date = new Date().toISOString();
        }
        if (logData.boundDatas == null) {
            logData.boundDatas = {};
        }

        const log = {
            id: ++this._logIdCounter,
            ...logData,
            type: logData.type.slice(4), // Remove 'log-' prefix
            isNew: true
        };

        this._logs.push(log);
        PerfMonitor.trackLogReceived();

        // Trim buffer
        this._trimBuffer();

        // Update file list if new file
        const file = Utils.getFileFromCallLine(logData.callLine);
        if (file && !this._availableFiles.includes(file)) {
            this._availableFiles.push(file);
            this._availableFiles = Utils.sortFiles(this._availableFiles);
            this._renderFileList();
        }

        // Remove empty state
        const emptyState = DOM.get('logsContainer').querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        // Check if log should be displayed
        if (this._shouldShowLog(log)) {
            if (this._recording.isRecording) {
                this._recording.recordDatas.push(logData);
            }

            const wasAtBottom = this._isAtBottom();
            const enabledChecks = ChecksManager.getEnabled();
            const entry = LogRenderer.createLogEntry(log, true, enabledChecks);

            entry.addEventListener('click', () => this._openLogDetail(log));

            const container = DOM.get('logsContainer');
            const scrollIndicator = container.querySelector('#scrollIndicator');
            if (scrollIndicator) {
                container.insertBefore(entry, scrollIndicator);
            } else {
                container.appendChild(entry);
            }
            this._logElements.set(log.id, entry);

            if (wasAtBottom && this._autoScroll) {
                container.scrollTop = container.scrollHeight;
            }

            PerfMonitor.trackLogDisplayed();
        }

        DOM.setText('totalCount', this._logs.length);
        this._updateScrollIndicator();

        // Track checks execution time
        const checksStart = performance.now();
        this._updateChecksResultsHeader();
        const checksTime = performance.now() - checksStart;

        // Track performance
        const renderTime = performance.now() - startTime;
        PerfMonitor.addRenderTime(renderTime);
        PerfMonitor.addChecksTime(checksTime);

        // Emergency disconnect if checks too slow
        if (checksTime > 1000) {
            WS.disconnect();
            console.error(`Checks execution too long: ${checksTime}ms. WebSocket disconnected.`);
            alert(`Checks execution took too long: ${checksTime}ms. WebSocket disconnected.\n\nPlease fix the issue and reload the page.`);
        }
    }

    _trimBuffer() {
        while (this._logs.length > this._bufferSize) {
            const removed = this._logs.shift();
            const element = this._logElements.get(removed.id);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this._logElements.delete(removed.id);
        }

        // Clean checks cache
        const validIds = new Set(this._logs.map(l => l.id));
        ChecksManager.cleanCache(validIds);
    }

    _shouldShowLog(log) {
        // Check log level
        if (!this._enabledLogLevels.has(log.type.toLowerCase())) return false;

        // Check search filter
        const logText = LogRenderer.formatArgs(log.argList);
        if (!LogRenderer.matchesSearch(logText)) return false;

        // Check file filter
        if (this._selectedFiles.size > 0) {
            const file = Utils.getFileFromCallLine(log.callLine);
            if (!file || !this._selectedFiles.has(file)) return false;

            const ranges = this._lineFilters[file];
            if (ranges && ranges.length > 0) {
                const line = Utils.getLineFromCallLine(log.callLine);
                if (line === null || !Utils.isLineInRanges(line, ranges)) return false;
            }
        }

        // Check checks filter
        if (!ChecksManager.passesFilter(log)) return false;

        return true;
    }

    _fullRender() {
        const wasAtBottom = this._isAtBottom();
        const container = DOM.get('logsContainer');

        // Clear container except scroll indicator and back button
        container.innerHTML = '';
        const scrollIndicator = DOM.create('div', {
            className: 'scroll-indicator',
            id: 'scrollIndicator',
            text: 'New logs - Click to scroll down'
        });
        const backBtn = DOM.create('button', {
            className: 'back-to-live-btn',
            id: 'backToLiveBtn',
            html: '<span class="live-dot"></span>Back to Live'
        });

        container.appendChild(backBtn);
        container.appendChild(scrollIndicator);

        // Re-attach listeners
        scrollIndicator.addEventListener('click', () => this._scrollToBottom());
        backBtn.addEventListener('click', () => this._scrollToBottom());

        this._logElements.clear();

        const filtered = this._logs.filter(log => this._shouldShowLog(log));
        const enabledChecks = ChecksManager.getEnabled();

        if (filtered.length === 0 && this._logs.length === 0) {
            const empty = DOM.create('div', {
                className: 'empty-state',
                text: 'No logs received. Connect to WebSocket to start.'
            });
            container.insertBefore(empty, backBtn);
        } else if (filtered.length === 0) {
            const empty = DOM.create('div', {
                className: 'empty-state',
                text: 'No logs match the filters.'
            });
            container.insertBefore(empty, backBtn);
        } else {
            filtered.forEach(log => {
                const entry = LogRenderer.createLogEntry(log, false, enabledChecks);
                entry.addEventListener('click', () => this._openLogDetail(log));
                container.insertBefore(entry, backBtn);
                this._logElements.set(log.id, entry);
                log.isNew = false;
            });
        }

        if (wasAtBottom && this._autoScroll) {
            container.scrollTop = container.scrollHeight;
        }

        DOM.setText('totalCount', this._logs.length);
        this._updateScrollIndicator();
        this._updateChecksResultsHeader();
    }

    _clearLogs() {
        this._logs = [];
        this._logElements.clear();
        this._logIdCounter = 0;
        PerfMonitor.reset();
        DOM.removeClass('performanceWarning', 'visible');
        this._fullRender();
    }

    _updateSearchFilter() {
        const filter = DOM.getValue('filterInput');
        const isRegex = DOM.hasClass('regexToggle', 'active');

        LogRenderer.setSearchFilter(filter, isRegex);

        // Update input styling
        DOM.removeClass('filterInput', 'regex-error');
        DOM.removeClass('filterInput', 'regex-mode');

        if (isRegex && filter) {
            try {
                new RegExp(filter, 'gi');
                DOM.addClass('filterInput', 'regex-mode');
            } catch (e) {
                DOM.addClass('filterInput', 'regex-error');
            }
        }

        this._fullRender();
    }

    _toggleLogLevel(level) {
        if (this._enabledLogLevels.has(level)) {
            this._enabledLogLevels.delete(level);
        } else {
            this._enabledLogLevels.add(level);
        }
        this._updateLogLevelButtons();
        this._fullRender();
    }

    _updateLogLevelButtons() {
        DOM.queryAll('.log-level-btn').forEach(btn => {
            const level = btn.dataset.level;
            btn.classList.toggle('active', this._enabledLogLevels.has(level));
        });
    }

    _isAtBottom() {
        const container = DOM.get('logsContainer');
        const threshold = 50;
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }

    _updateScrollIndicator() {
        if (!this._autoScroll && this._logs.length > 0) {
            DOM.addClass('scrollIndicator', 'visible');
            DOM.addClass('backToLiveBtn', 'visible');
        } else {
            DOM.removeClass('scrollIndicator', 'visible');
            DOM.removeClass('backToLiveBtn', 'visible');
        }
    }

    _scrollToBottom() {
        const container = DOM.get('logsContainer');
        container.scrollTop = container.scrollHeight;
        this._autoScroll = true;
        this._updateScrollIndicator();
    }

    // File handling
    async _fetchLogFiles() {
        try {
            const response = await fetch('/api/logFiles');
            if (response.ok) {
                const files = await response.json();
                this._availableFiles = Utils.sortFiles(files);
                this._renderFileList();
            } else {
                DOM.setHtml('fileList', '<div class="empty-state" style="padding: 15px; font-size: 11px;">Failed to load files</div>');
            }
        } catch (e) {
            console.error('Error fetching log files:', e);
            DOM.setHtml('fileList', '<div class="empty-state" style="padding: 15px; font-size: 11px;">Error loading files</div>');
        }
    }

    _renderFileList() {
        const filtered = this._fileFilter
            ? this._availableFiles.filter(f => f.toLowerCase().includes(this._fileFilter.toLowerCase()))
            : this._availableFiles;

        const fileList = DOM.get('fileList');

        if (filtered.length === 0) {
            fileList.innerHTML = '<div class="empty-state" style="padding: 15px; font-size: 11px;">No files match</div>';
            return;
        }

        fileList.innerHTML = '';

        filtered.forEach(file => {
            const item = DOM.create('div', {
                className: 'file-item' + (this._selectedFiles.has(file) ? ' selected' : ''),
                title: file
            });

            const parts = file.split(/[/\\]/);
            const fileName = parts.pop();
            const directory = parts.join('/');

            const namePart = DOM.create('span', { className: 'file-name-part' });
            if (directory) {
                namePart.innerHTML = `<span class="directory">${directory}/</span>${fileName}`;
            } else {
                namePart.textContent = fileName;
            }
            item.appendChild(namePart);

            // Line filter button
            if (this._selectedFiles.has(file) && this._selectedFiles.size <= 10) {
                const lineBtn = DOM.create('button', {
                    className: 'line-filter-btn' + (this._lineFilters[file] ? ' active' : ''),
                    text: this._lineFilters[file] ? String(this._lineFilters[file].length) : 'L'
                });
                lineBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._openLineFilterModal(file);
                });
                item.appendChild(lineBtn);
            }

            item.addEventListener('click', () => {
                if (this._selectedFiles.has(file)) {
                    this._selectedFiles.delete(file);
                    delete this._lineFilters[file];
                } else {
                    this._selectedFiles.add(file);
                }
                this._updateSelectedFilesInfo();
                this._renderFileList();
                this._fullRender();
            });

            fileList.appendChild(item);
        });
    }

    _updateSelectedFilesInfo() {
        const count = this._selectedFiles.size;
        if (count === 0) {
            DOM.setText('selectedFilesInfo', 'No files selected (all logs)');
        } else {
            const lineFilterCount = Object.keys(this._lineFilters).length;
            let text = `${count} file${count > 1 ? 's' : ''}`;
            if (lineFilterCount > 0) text += ` (${lineFilterCount} filtered)`;
            DOM.setText('selectedFilesInfo', text);
        }
    }

    // Line filter modal
    _currentEditingFile = null;

    _openLineFilterModal(file) {
        this._currentEditingFile = file;
        const parts = file.split(/[/\\]/);
        const fileName = parts.pop();
        DOM.setText('modalTitle', `Line Filter: ${fileName}`);

        const ranges = this._lineFilters[file] || [];
        this._renderLineRanges(ranges);
        DOM.addClass('lineFilterModal', 'visible');
    }

    _closeLineFilterModal() {
        DOM.removeClass('lineFilterModal', 'visible');
        this._currentEditingFile = null;
    }

    _renderLineRanges(ranges) {
        const container = DOM.get('lineRangesContainer');
        container.innerHTML = '';

        if (ranges.length === 0) ranges = [[null, null]];

        ranges.forEach((range, index) => {
            const row = DOM.create('div', { className: 'line-range-row' });
            row.innerHTML = `
                <span>Lines</span>
                <input type="number" placeholder="Start" value="${range[0] || ''}" data-index="${index}" data-type="start" min="1">
                <span>to</span>
                <input type="number" placeholder="End" value="${range[1] || ''}" data-index="${index}" data-type="end" min="1">
                <button type="button" data-index="${index}" class="remove-range-btn small danger">X</button>
            `;
            container.appendChild(row);

            row.querySelector('.remove-range-btn').addEventListener('click', () => {
                const rows = container.querySelectorAll('.line-range-row');
                if (rows.length > 1) row.remove();
            });
        });
    }

    _addLineRange() {
        const currentRanges = this._getModalRanges();
        currentRanges.push([null, null]);
        this._renderLineRanges(currentRanges);
    }

    _getModalRanges() {
        const ranges = [];
        DOM.queryAll('.line-range-row').forEach(row => {
            const start = parseInt(row.querySelector('input[data-type="start"]').value) || null;
            const end = parseInt(row.querySelector('input[data-type="end"]').value) || null;
            if (start !== null && end !== null && start <= end) {
                ranges.push([start, end]);
            }
        });
        return ranges;
    }

    _clearLineRanges() {
        if (this._currentEditingFile) {
            delete this._lineFilters[this._currentEditingFile];
            this._renderFileList();
            this._fullRender();
        }
        this._closeLineFilterModal();
    }

    _saveLineRanges() {
        if (this._currentEditingFile) {
            const ranges = this._getModalRanges();
            if (ranges.length > 0) {
                this._lineFilters[this._currentEditingFile] = ranges;
            } else {
                delete this._lineFilters[this._currentEditingFile];
            }
            this._renderFileList();
            this._fullRender();
        }
        this._closeLineFilterModal();
    }

    // Checks UI
    _editingCheckId = null;

    _renderChecksContainer() {
        DOM.setText('checksCount', ChecksManager.getCountInfo());
        DOM.setDisabled('addCheckBtn', ChecksManager.isAtMax());

        const container = DOM.get('checksContainer');
        const checks = ChecksManager.getAll();

        if (checks.length === 0) {
            container.innerHTML = '<div style="font-size: 11px; color: #858585; padding: 10px; text-align: center;">No checks defined</div>';
            return;
        }

        container.innerHTML = '';

        checks.forEach(check => {
            const stats = ChecksManager.getExecutionTimeStats(check.id);
            const item = DOM.create('div', { className: 'check-item' });
            item.dataset.checkId = check.id;

            // Build timing display string
            let avgTimingHtml = '';
            let lastTimingHtml = '';
            if (stats.sampleCount > 0) {
                const timeSpanStr = stats.timeSpanSeconds > 0 ? `/${stats.timeSpanSeconds}s` : '';
                avgTimingHtml = `avg: ${stats.avg.toFixed(2)}ms (${stats.sampleCount}${timeSpanStr})`;
                if (stats.last > 0) {
                    lastTimingHtml = `last: ${stats.last.toFixed(2)}ms`;
                }
            }

            item.innerHTML = `
                <input type="checkbox" ${check.enabled ? 'checked' : ''} ${check.killed ? 'disabled' : ''} data-id="${check.id}">
                <span class="check-name" title="${DOM.escapeHtml(check.name)}${check.killed ? ' (KILLED)' : ''}">
                    ${check.id}: ${DOM.escapeHtml(check.name)}
                    <span class="check-avg-time" data-check-avg="${check.id}">${avgTimingHtml}</span>
                    <span class="check-last-time" data-check-last="${check.id}">${lastTimingHtml}</span>
                    ${check.killed ? '<span class="check-killed">[KILLED]</span>' : ''}
                </span>
                <div class="check-actions">
                    <button class="secondary edit-check" data-id="${check.id}">Edit</button>
                    <button class="danger del-check" data-id="${check.id}">X</button>
                </div>
            `;

            // Checkbox handler
            item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                ChecksManager.setEnabled(parseInt(e.target.dataset.id), e.target.checked);
                this._fullRender();
            });

            // Edit handler
            item.querySelector('.edit-check').addEventListener('click', (e) => {
                this._openCheckModal(parseInt(e.target.dataset.id));
            });

            // Delete handler
            item.querySelector('.del-check').addEventListener('click', (e) => {
                ChecksManager.remove(parseInt(e.target.dataset.id));
                this._fullRender();
            });

            container.appendChild(item);
        });
    }

    _updateChecksTimingDisplay() {
        const checks = ChecksManager.getAll();

        checks.forEach(check => {
            const avgSpan = document.querySelector(`[data-check-avg="${check.id}"]`);
            const lastSpan = document.querySelector(`[data-check-last="${check.id}"]`);

            if (!avgSpan || !lastSpan) return;

            // If check is disabled, clear the "last" display but keep avg
            if (!check.enabled) {
                lastSpan.textContent = '';
                return;
            }

            const stats = ChecksManager.getExecutionTimeStats(check.id);

            if (stats.sampleCount > 0) {
                const timeSpanStr = stats.timeSpanSeconds > 0 ? `/${stats.timeSpanSeconds}s` : '';
                avgSpan.textContent = `avg: ${stats.avg.toFixed(2)}ms (${stats.sampleCount}${timeSpanStr})`;

                // Only update "last" if there's a new value (last > 0 means we have data)
                if (stats.last > 0) {
                    lastSpan.textContent = `last: ${stats.last.toFixed(2)}ms`;
                }
            }
        });
    }

    _renderChecksFilterContainer() {
        const container = DOM.get('checksFilterContainer');
        const enabledChecks = ChecksManager.getEnabled();
        const filter = ChecksManager.getFilter();

        if (enabledChecks.length === 0) {
            container.innerHTML = '<span style="font-size: 11px; color: #666;">No checks enabled</span>';
            return;
        }

        container.innerHTML = '';

        enabledChecks.forEach(check => {
            const chip = DOM.create('span', {
                className: 'check-filter-chip' + (filter.has(check.id) ? ' active' : ''),
                text: String(check.id),
                title: check.name
            });

            chip.addEventListener('click', () => {
                ChecksManager.toggleFilter(check.id);
                this._renderChecksFilterContainer();
                this._fullRender();
            });

            container.appendChild(chip);
        });
    }

    _openCheckModal(checkId = null) {
        this._editingCheckId = checkId;

        if (checkId !== null) {
            const check = ChecksManager.getById(checkId);
            if (check) {
                DOM.setText('checkModalTitle', 'Edit Check');
                DOM.setValue('checkNameInput', check.name);
                DOM.setValue('checkCodeInput', check.code);
            }
        } else {
            DOM.setText('checkModalTitle', 'Create Check');
            DOM.setValue('checkNameInput', '');
            DOM.setValue('checkCodeInput', '// Example: return argList.some(arg => arg?.error);\nreturn true;');
        }

        DOM.addClass('checkModal', 'visible');
        DOM.get('checkNameInput').focus();
    }

    _closeCheckModal() {
        DOM.removeClass('checkModal', 'visible');
        this._editingCheckId = null;
    }

    _saveCheck() {
        const name = DOM.getValue('checkNameInput').trim() || 'Unnamed Check';
        const code = DOM.getValue('checkCodeInput');

        let success;
        if (this._editingCheckId !== null) {
            success = ChecksManager.update(this._editingCheckId, name, code);
        } else {
            success = ChecksManager.add(name, code) !== null;
        }

        if (success) {
            this._fullRender();
            this._closeCheckModal();
        }
    }

    _updateChecksResultsHeader() {
        const enabledChecks = ChecksManager.getEnabled();
        const resultsContainer = DOM.get('checksResults');

        if (enabledChecks.length === 0) {
            resultsContainer.innerHTML = '';
            return;
        }

        resultsContainer.innerHTML = '';
        const visibleLogs = this._logs.filter(log => this._shouldShowLog(log));

        enabledChecks.forEach(check => {
            let passCount = 0;
            let failCount = 0;

            visibleLogs.forEach(log => {
                const { result } = ChecksManager.runCheck(check, log);
                if (result) passCount++;
                else failCount++;
            });

            const icon = DOM.create('span', {
                className: `check-result-icon ${passCount > failCount ? 'pass' : failCount > 0 ? 'fail' : 'neutral'}`,
                text: String(check.id),
                title: `${check.name}\nPass: ${passCount}, Fail: ${failCount}`
            });
            resultsContainer.appendChild(icon);
        });
    }

    // Log detail
    _openLogDetail(log) {
        this._currentDetailLog = log;
        const content = DOM.get('logDetailContent');
        content.innerHTML = LogRenderer.createDetailContent(log, true); // Show execution time

        // Add copy button handlers
        DOM.get('copyCompact').addEventListener('click', () => {
            navigator.clipboard.writeText(JSON.stringify(log.argList));
            Toast.success('Copied compact JSON');
        });

        DOM.get('copyExtended').addEventListener('click', () => {
            navigator.clipboard.writeText(JSON.stringify(log.argList, null, 2));
            Toast.success('Copied extended JSON');
        });

        DOM.addClass('logDetailOverlay', 'visible');
    }

    _closeLogDetail() {
        DOM.removeClass('logDetailOverlay', 'visible');
        this._currentDetailLog = null;
    }

    // Recording
    _toggleRecording() {
        if (this._recording.isRecording) {
            this._recording.end = new Date().toISOString();
            this._recording.isRecording = false;
            DOM.removeClass('recordBtn', 'recording');
            DOM.setText('recordBtn', 'Record');
            this._saveRecording();
        } else {
            this._recording.start = new Date().toISOString();
            this._recording.recordDatas = [];
            this._recording.isRecording = true;
            DOM.addClass('recordBtn', 'recording');
            DOM.setText('recordBtn', 'Recording...');
        }
    }

    _saveRecording() {
        const confirm = window.confirm('Click OK to download the recording file.');
        if (!confirm) return;

        const lines = this._recording.recordDatas
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(log => {
                const args = log.argList.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ');
                return `${log.date} ${log.type.toUpperCase()} (${log.callLine}): ${args}\n`;
            })
            .join('\n');

        const blob = new Blob([lines], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this._recording.start}_${this._recording.end}_LoggyLogger_record.log`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Create and export app instance
window.App = new LoggyLoggerApp();

// Initialize on load
window.addEventListener('load', () => {
    App.init();
});
