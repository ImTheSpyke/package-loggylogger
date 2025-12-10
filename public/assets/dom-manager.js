(() => {
/**
 * DOM Manager - Centralized DOM element access and manipulation
 */
class DOMManager {
    constructor() {
        this._cache = new Map();
        this._listeners = new Map();
    }

    /**
     * Get element by ID with caching
     * @param {string} id - Element ID
     * @returns {HTMLElement|null}
     */
    get(id, force = false) {
        if (!this._cache.has(id) || force == true) {
            const el = document.getElementById(id);
            if (el) this._cache.set(id, el);
            return el;
        }
        return this._cache.get(id);
    }

    /**
     * Query selector with optional caching
     * @param {string} selector - CSS selector
     * @param {boolean} cache - Whether to cache result
     * @returns {HTMLElement|null}
     */
    query(selector, cache = false) {
        if (cache && this._cache.has(selector)) {
            return this._cache.get(selector);
        }
        const el = document.querySelector(selector);
        if (cache && el) this._cache.set(selector, el);
        return el;
    }

    /**
     * Query all elements matching selector
     * @param {string} selector - CSS selector
     * @returns {NodeListOf<HTMLElement>}
     */
    queryAll(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * Create element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} options - Element options
     * @returns {HTMLElement}
     */
    create(tag, options = {}) {
        const el = document.createElement(tag);

        if (options.className) el.className = options.className;
        if (options.id) el.id = options.id;
        if (options.text) el.textContent = options.text;
        if (options.html) el.innerHTML = options.html;
        if (options.title) el.title = options.title;
        if (options.dataset) {
            Object.entries(options.dataset).forEach(([key, val]) => {
                el.dataset[key] = val;
            });
        }
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, val]) => {
                el.setAttribute(key, val);
            });
        }
        if (options.style) {
            Object.assign(el.style, options.style);
        }
        if (options.children) {
            options.children.forEach(child => el.appendChild(child));
        }
        if (options.events) {
            Object.entries(options.events).forEach(([event, handler]) => {
                el.addEventListener(event, handler);
            });
        }

        return el;
    }

    /**
     * Set text content of cached element
     * @param {string} id - Element ID
     * @param {string} text - Text content
     */
    setText(id, text) {
        const el = this.get(id);
        if (el) el.textContent = text;
    }

    /**
     * Set HTML content of cached element
     * @param {string} id - Element ID
     * @param {string} html - HTML content
     */
    setHtml(id, html) {
        const el = this.get(id);
        if (el) el.innerHTML = html;
    }

    /**
     * Toggle class on element
     * @param {string} id - Element ID
     * @param {string} className - Class name
     * @param {boolean} force - Force add/remove
     */
    toggleClass(id, className, force) {
        const el = this.get(id);
        if (el) el.classList.toggle(className, force);
    }

    /**
     * Add class to element
     * @param {string} id - Element ID
     * @param {string} className - Class name
     */
    addClass(id, className) {
        const el = this.get(id);
        if (el) el.classList.add(className);
    }

    /**
     * Remove class from element
     * @param {string} id - Element ID
     * @param {string} className - Class name
     */
    removeClass(id, className) {
        const el = this.get(id);
        if (el) el.classList.remove(className);
    }

    /**
     * Check if element has class
     * @param {string} id - Element ID
     * @param {string} className - Class name
     * @returns {boolean}
     */
    hasClass(id, className) {
        const el = this.get(id);
        return el ? el.classList.contains(className) : false;
    }

    /**
     * Set element disabled state
     * @param {string} id - Element ID
     * @param {boolean} disabled - Disabled state
     */
    setDisabled(id, disabled) {
        const el = this.get(id);
        if (el) el.disabled = disabled;
    }

    /**
     * Get element value
     * @param {string} id - Element ID
     * @returns {string}
     */
    getValue(id) {
        const el = this.get(id);
        return el ? el.value : '';
    }

    /**
     * Set element value
     * @param {string} id - Element ID
     * @param {string} value - Value to set
     */
    setValue(id, value) {
        const el = this.get(id);
        if (el) el.value = value;
    }

    /**
     * Add event listener with tracking
     * @param {string} id - Element ID
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    on(id, event, handler) {
        const el = this.get(id);
        if (el) {
            el.addEventListener(event, handler);
            const key = `${id}:${event}`;
            if (!this._listeners.has(key)) {
                this._listeners.set(key, []);
            }
            this._listeners.get(key).push(handler);
        }
    }

    /**
     * Remove event listener
     * @param {string} id - Element ID
     * @param {string} event - Event type
     * @param {Function} handler - Event handler (optional, removes all if not specified)
     */
    off(id, event, handler) {
        const el = this.get(id);
        if (!el) return;

        const key = `${id}:${event}`;
        if (handler) {
            el.removeEventListener(event, handler);
            const handlers = this._listeners.get(key);
            if (handlers) {
                const idx = handlers.indexOf(handler);
                if (idx > -1) handlers.splice(idx, 1);
            }
        } else {
            const handlers = this._listeners.get(key);
            if (handlers) {
                handlers.forEach(h => el.removeEventListener(event, h));
                this._listeners.delete(key);
            }
        }
    }

    /**
     * Show element
     * @param {string} id - Element ID
     */
    show(id) {
        this.addClass(id, 'visible');
    }

    /**
     * Hide element
     * @param {string} id - Element ID
     */
    hide(id) {
        this.removeClass(id, 'visible');
    }

    /**
     * Clear element cache
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton instance
window.DOM = new DOMManager();

})();