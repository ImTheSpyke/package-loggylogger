(() => {
/**
 * Settings Manager - Handles settings panel and resizable functionality
 */
class SettingsManager {
    constructor() {
        this._panelWidth = 320;
        this._minWidth = 320;
        this._maxWidthPercent = 50;
        this._isResizing = false;
        this._syntaxHighlightEnabled = false;
        this._onSettingsChangeCallbacks = [];
    }

    /**
     * Initialize resizable panel
     */
    initResizablePanel() {
        const panel = DOM.get('settingsPanel');
        if (!panel) return;

        // Create resize handle
        const handle = DOM.create('div', {
            className: 'resize-handle',
            id: 'resizeHandle'
        });
        panel.insertBefore(handle, panel.firstChild);

        // Mouse events for resizing
        handle.addEventListener('mousedown', (e) => this._startResize(e));
        document.addEventListener('mousemove', (e) => this._onResize(e));
        document.addEventListener('mouseup', () => this._stopResize());

        // Touch events for mobile
        handle.addEventListener('touchstart', (e) => this._startResize(e.touches[0]));
        document.addEventListener('touchmove', (e) => {
            if (this._isResizing) this._onResize(e.touches[0]);
        });
        document.addEventListener('touchend', () => this._stopResize());

        // Load saved width
        const savedWidth = localStorage.getItem('settingsPanelWidth');
        if (savedWidth) {
            this._panelWidth = parseInt(savedWidth, 10);
            this._applyWidth();
        }
    }

    _startResize(e) {
        this._isResizing = true;
        this._startX = e.clientX;
        this._startWidth = this._panelWidth;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }

    _onResize(e) {
        if (!this._isResizing) return;

        const diff = this._startX - e.clientX;
        const maxWidth = window.innerWidth * (this._maxWidthPercent / 100);
        let newWidth = this._startWidth + diff;

        // Clamp to min/max
        newWidth = Math.max(this._minWidth, Math.min(maxWidth, newWidth));

        this._panelWidth = newWidth;
        this._applyWidth();
    }

    _stopResize() {
        if (!this._isResizing) return;

        this._isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Save width
        localStorage.setItem('settingsPanelWidth', this._panelWidth);
    }

    _applyWidth() {
        const panel = DOM.get('settingsPanel');
        if (panel) {
            panel.style.width = `${this._panelWidth}px`;
            panel.style.minWidth = `${this._panelWidth}px`;
        }
    }

    /**
     * Get panel width
     * @returns {number}
     */
    getPanelWidth() {
        return this._panelWidth;
    }

    /**
     * Set syntax highlight enabled
     * @param {boolean} enabled
     */
    setSyntaxHighlight(enabled) {
        this._syntaxHighlightEnabled = enabled;
        localStorage.setItem('syntaxHighlight', enabled);
        LogRenderer.setSyntaxHighlight(enabled);
        this._notifyChange('syntaxHighlight', enabled);
    }

    /**
     * Get syntax highlight state
     * @returns {boolean}
     */
    isSyntaxHighlightEnabled() {
        return this._syntaxHighlightEnabled;
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        // Load syntax highlight setting
        const syntaxHighlight = localStorage.getItem('syntaxHighlight');
        if (syntaxHighlight !== null) {
            this._syntaxHighlightEnabled = syntaxHighlight === 'true';
            LogRenderer.setSyntaxHighlight(this._syntaxHighlightEnabled);
        }

        // Update UI
        const toggle = DOM.get('syntaxHighlightToggle');
        if (toggle) {
            toggle.checked = this._syntaxHighlightEnabled;
        }
    }

    /**
     * Register settings change callback
     * @param {Function} callback
     */
    onSettingsChange(callback) {
        this._onSettingsChangeCallbacks.push(callback);
    }

    _notifyChange(setting, value) {
        this._onSettingsChangeCallbacks.forEach(cb => cb(setting, value));
    }
}

// Export singleton instance
window.Settings = new SettingsManager();

})();