/**
 * Utilities for Final Year Project Groups App
 */

// Generate a unique ID for projects
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Show a toast notification
export const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ph-check-circle';
    if (type === 'error') icon = 'ph-x-circle';
    if (type === 'warning') icon = 'ph-warning-circle';

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
};

// Theme Toggle Logic
export const initTheme = () => {
    const toggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        body.classList.remove('theme-dark');
        if(toggleBtn) toggleBtn.innerHTML = '<i class="ph ph-moon"></i>';
    } else {
        body.classList.add('theme-dark');
        if(toggleBtn) toggleBtn.innerHTML = '<i class="ph ph-sun"></i>';
    }

    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (body.classList.contains('theme-dark')) {
                body.classList.remove('theme-dark');
                localStorage.setItem('theme', 'light');
                toggleBtn.innerHTML = '<i class="ph ph-moon"></i>';
            } else {
                body.classList.add('theme-dark');
                localStorage.setItem('theme', 'dark');
                toggleBtn.innerHTML = '<i class="ph ph-sun"></i>';
            }
        });
    }
};

// Escape HTML to prevent XSS
export const escapeHTML = (str) => {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', initTheme);
