(() => {
/**
 * Toast Notification System
 * Supports multiple toast types: success, error, warning, info
 */
class ToastManager {
    constructor() {
        this._container = null;
        this._queue = [];
        this._activeToasts = [];
        this._maxToasts = 5;
        this._defaultDuration = 3000;
        this._init();
    }

    _init() {
        // Create container if it doesn't exist
        this._container = document.getElementById('toast-container');
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = 'toast-container';
            this._container.className = 'toast-container';
            document.body.appendChild(this._container);
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {Object} options - Toast options
     * @returns {HTMLElement} - Toast element
     */
    show(message, options = {}) {
        const {
            type = 'info',
            duration = this._defaultDuration,
            closable = true
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = this._getIcon(type);
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icon;

        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;

        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '\u00D7';
            closeBtn.addEventListener('click', () => this._remove(toast));
            toast.appendChild(closeBtn);
        }

        // Add to container
        this._container.appendChild(toast);
        this._activeToasts.push(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this._remove(toast), duration);
        }

        // Limit active toasts
        while (this._activeToasts.length > this._maxToasts) {
            this._remove(this._activeToasts[0]);
        }

        return toast;
    }

    _remove(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hiding');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            const idx = this._activeToasts.indexOf(toast);
            if (idx > -1) this._activeToasts.splice(idx, 1);
        }, 300);
    }

    _getIcon(type) {
        const icons = {
            success: '\u2713',
            error: '\u2717',
            warning: '\u26A0',
            info: '\u2139'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show success toast
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    success(message, duration) {
        return this.show(message, { type: 'success', duration });
    }

    /**
     * Show error toast
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    error(message, duration) {
        return this.show(message, { type: 'error', duration });
    }

    /**
     * Show warning toast
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    warning(message, duration) {
        return this.show(message, { type: 'warning', duration });
    }

    /**
     * Show info toast
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    info(message, duration) {
        return this.show(message, { type: 'info', duration });
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        [...this._activeToasts].forEach(toast => this._remove(toast));
    }
}

// Export singleton instance
window.Toast = new ToastManager();

})();