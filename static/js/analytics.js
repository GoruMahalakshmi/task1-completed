/**
 * Analytics and Charts functionality for Productivity Tracker
 * Handles Chart.js initialization and data visualization
 */

let charts = {};

/**
 * Initialize analytics charts
 */
function initializeAnalytics(stats7d, stats30d) {
    // Initialize all charts with 7-day data by default
    createStatusChart(stats7d);
    createPriorityChart(stats7d);
    createCategoryTimeChart(stats7d);
    createDailyActivityChart(stats7d);
    
    // Store data for period switching
    window.analyticsData = {
        '7d': stats7d,
        '30d': stats30d
    };
}

/**
 * Create task status distribution chart
 */
function createStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.statusChart) {
        charts.statusChart.destroy();
    }
    
    const statusData = data.tasks_by_status;
    const labels = Object.keys(statusData).map(status => {
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
    const values = Object.values(statusData);
    
    charts.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#6c757d', // Pending - Gray
                    '#ffc107', // In Progress - Warning
                    '#28a745'  // Completed - Success
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create task priority distribution chart
 */
function createPriorityChart(data) {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.priorityChart) {
        charts.priorityChart.destroy();
    }
    
    const priorityData = data.tasks_by_priority;
    const labels = Object.keys(priorityData).map(priority => {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    });
    const values = Object.values(priorityData);
    
    charts.priorityChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#17a2b8', // Low - Info
                    '#ffc107', // Medium - Warning
                    '#dc3545'  // High - Danger
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create time spent by category chart
 */
function createCategoryTimeChart(data) {
    const ctx = document.getElementById('categoryTimeChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.categoryTimeChart) {
        charts.categoryTimeChart.destroy();
    }
    
    const categoryData = data.time_by_category;
    const labels = Object.keys(categoryData);
    const values = Object.values(categoryData).map(seconds => seconds / 3600); // Convert to hours
    
    // Generate colors for categories
    const colors = generateColors(labels.length);
    
    charts.categoryTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours Spent',
                data: values,
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + 'h';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(2)} hours`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create daily activity chart
 */
function createDailyActivityChart(data) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.dailyChart) {
        charts.dailyChart.destroy();
    }
    
    const dailyData = data.daily_activity;
    const dates = Object.keys(dailyData).sort().reverse().slice(0, 7); // Last 7 days
    const hours = dates.map(date => dailyData[date] || 0);
    
    const labels = dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    charts.dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours Tracked',
                data: hours,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#007bff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + 'h';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toFixed(2)} hours`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update charts with new data
 */
function updateCharts(data) {
    createStatusChart(data);
    createPriorityChart(data);
    createCategoryTimeChart(data);
    createDailyActivityChart(data);
}

/**
 * Generate colors for charts
 */
function generateColors(count) {
    const baseColors = [
        '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
        '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6f42c1'
    ];
    
    const background = [];
    const border = [];
    
    for (let i = 0; i < count; i++) {
        const colorIndex = i % baseColors.length;
        const baseColor = baseColors[colorIndex];
        
        background.push(hexToRgba(baseColor, 0.8));
        border.push(baseColor);
    }
    
    return { background, border };
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Create productivity overview chart for dashboard
 */
function createProductivityOverview(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(data.daily_activity).slice(-7).map(date => {
                return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Daily Hours',
                data: Object.values(data.daily_activity).slice(-7),
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    display: false
                },
                x: {
                    display: false
                }
            }
        }
    });
}

/**
 * Create mini chart for cards
 */
function createMiniChart(canvasId, data, type = 'line') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    return new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        }
    });
}

/**
 * Export analytics data as image
 */
function exportChartAsImage(chartId, filename) {
    const chart = charts[chartId];
    if (!chart) {
        showToast('Chart not found', 'error');
        return;
    }
    
    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = filename || 'chart.png';
    link.href = url;
    link.click();
}

/**
 * Refresh analytics data
 */
function refreshAnalytics() {
    const refreshButton = document.querySelector('[data-refresh="analytics"]');
    if (refreshButton) {
        showLoading(refreshButton, 'Refreshing...');
    }
    
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            updateCharts(data);
            showToast('Analytics refreshed', 'success');
        })
        .catch(error => {
            console.error('Error refreshing analytics:', error);
            showToast('Failed to refresh analytics', 'error');
        })
        .finally(() => {
            if (refreshButton) {
                hideLoading(refreshButton, '<i class="fas fa-sync-alt me-2"></i>Refresh');
            }
        });
}

// Export functions for global use
window.initializeAnalytics = initializeAnalytics;
window.updateCharts = updateCharts;
window.createProductivityOverview = createProductivityOverview;
window.createMiniChart = createMiniChart;
window.exportChartAsImage = exportChartAsImage;
window.refreshAnalytics = refreshAnalytics;
