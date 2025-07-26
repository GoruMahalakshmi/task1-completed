/**
 * Main JavaScript functionality for Productivity Tracker
 * Handles general UI interactions, form validation, and common utilities
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize form enhancements
    initializeFormEnhancements();
    
    // Initialize navigation highlights
    highlightActiveNavigation();
    
    // Initialize auto-dismiss alerts
    initializeAlerts();
    
    // Initialize confirmation dialogs
    initializeConfirmationDialogs();
});

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Enhance forms with better UX
 */
function initializeFormEnhancements() {
    // Auto-focus first input in forms
    const firstInput = document.querySelector('form input:not([type="hidden"]):first-of-type');
    if (firstInput) {
        firstInput.focus();
    }
    
    // Add loading states to form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                const originalText = submitBtn.innerHTML || submitBtn.value;
                if (submitBtn.tagName === 'BUTTON') {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
                } else {
                    submitBtn.value = 'Processing...';
                }
                submitBtn.disabled = true;
                
                // Re-enable after a delay in case of validation errors
                setTimeout(() => {
                    if (submitBtn.tagName === 'BUTTON') {
                        submitBtn.innerHTML = originalText;
                    } else {
                        submitBtn.value = originalText;
                    }
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
    });
    
    // Real-time validation feedback
    document.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('is-invalid')) {
                validateField(this);
            }
        });
    });
}

/**
 * Validate individual form field
 */
function validateField(field) {
    const isValid = field.checkValidity();
    
    if (isValid) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    } else {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
    }
    
    return isValid;
}

/**
 * Highlight active navigation item
 */
function highlightActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (currentPath === href || (href !== '/' && currentPath.startsWith(href)))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Auto-dismiss alerts after delay
 */
function initializeAlerts() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    
    alerts.forEach(alert => {
        // Auto-dismiss success and info alerts after 5 seconds
        if (alert.classList.contains('alert-success') || alert.classList.contains('alert-info')) {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000);
        }
    });
}

/**
 * Initialize confirmation dialogs for dangerous actions
 */
function initializeConfirmationDialogs() {
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm') || 'Are you sure you want to perform this action?';
            if (!confirm(message)) {
                e.preventDefault();
                return false;
            }
        });
    });
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Format time for display (HH:MM:SS)
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Show loading spinner
 */
function showLoading(element, message = 'Loading...') {
    element.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${message}`;
    element.disabled = true;
}

/**
 * Hide loading spinner
 */
function hideLoading(element, originalContent) {
    element.innerHTML = originalContent;
    element.disabled = false;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toastContainer = getOrCreateToastContainer();
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    
    // Remove element after hiding
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

/**
 * Get or create toast container
 */
function getOrCreateToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy to clipboard', 'danger');
    }
}

/**
 * Debounce function for search inputs
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Local storage utilities
 */
const LocalStorage = {
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('LocalStorage set failed:', e);
        }
    },
    
    get: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('LocalStorage get failed:', e);
            return defaultValue;
        }
    },
    
    remove: function(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('LocalStorage remove failed:', e);
        }
    }
};

/**
 * Format date for display
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    return new Date(date).toLocaleDateString('en-US', formatOptions);
}

/**
 * Format datetime for display
 */
function formatDateTime(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Check if date is today
 */
function isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
}

/**
 * Check if date is overdue
 */
function isOverdue(date) {
    const now = new Date();
    const checkDate = new Date(date);
    return checkDate < now;
}

/**
 * Animate number counting up
 */
function animateNumber(element, endValue, duration = 1000) {
    const startValue = 0;
    const range = endValue - startValue;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (range * progress));
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

/**
 * Smooth scroll to element
 */
function scrollToElement(element, offset = 0) {
    const elementPosition = element.offsetTop - offset;
    
    window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
    });
}

/**
 * Export utilities
 */
window.ProductivityTracker = {
    formatDuration,
    formatTime,
    showLoading,
    hideLoading,
    showToast,
    copyToClipboard,
    debounce,
    LocalStorage,
    formatDate,
    formatDateTime,
    isToday,
    isOverdue,
    animateNumber,
    scrollToElement
};

// Make common functions globally available
window.formatDuration = formatDuration;
window.formatTime = formatTime;
window.showToast = showToast;
