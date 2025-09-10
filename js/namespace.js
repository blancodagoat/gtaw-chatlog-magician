// Namespace for Chatlog Magician to avoid global pollution
(function(window) {
    'use strict';

    // Create main namespace
    window.ChatlogMagician = window.ChatlogMagician || {};

    // Create sub-namespaces
    window.ChatlogMagician.Utils = {};
    window.ChatlogMagician.UI = {};
    window.ChatlogMagician.Parser = {};
    window.ChatlogMagician.Storage = {};
    window.ChatlogMagician.ColorPalette = {};

    // Move global functions to namespace
    window.ChatlogMagician.Utils.escapeHtml = function(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    window.ChatlogMagician.Utils.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    window.ChatlogMagician.Utils.throttle = function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    // Performance monitoring
    window.ChatlogMagician.Performance = {
        mark: function(name) {
            if (window.performance && window.performance.mark) {
                window.performance.mark(name);
            }
        },
        measure: function(name, startMark) {
            if (window.performance && window.performance.measure) {
                window.performance.measure(name, startMark);
            }
        }
    };

    // Event system for decoupled communication
    window.ChatlogMagician.Events = {
        listeners: {},
        
        on: function(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        
        off: function(event, callback) {
            if (!this.listeners[event]) return;
            
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        },
        
        emit: function(event, data) {
            if (!this.listeners[event]) return;
            
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    };

    // Initialize namespace
    console.log('ChatlogMagician namespace initialized');

})(window);