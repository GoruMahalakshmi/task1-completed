/**
 * Export functionality for Productivity Tracker
 * Handles data export to various formats and file downloads
 */

/**
 * Export data handler
 */
class DataExporter {
    constructor() {
        this.supportedFormats = ['csv', 'pdf', 'json'];
        this.isExporting = false;
    }
    
    /**
     * Export data in specified format
     */
    async exportData(format, options = {}) {
        if (this.isExporting) {
            showToast('Export already in progress', 'warning');
            return;
        }
        
        if (!this.supportedFormats.includes(format)) {
            showToast('Unsupported export format', 'error');
            return;
        }
        
        this.isExporting = true;
        
        try {
            const url = this.buildExportUrl(format, options);
            await this.downloadFile(url, this.getFileName(format, options));
            showToast(`${format.toUpperCase()} export completed`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast(`Failed to export ${format.toUpperCase()}`, 'error');
        } finally {
            this.isExporting = false;
        }
    }
    
    /**
     * Build export URL with parameters
     */
    buildExportUrl(format, options) {
        let url = `/reports/${format}`;
        const params = new URLSearchParams();
        
        if (options.startDate) {
            params.append('start_date', options.startDate);
        }
        
        if (options.endDate) {
            params.append('end_date', options.endDate);
        }
        
        if (options.category) {
            params.append('category', options.category);
        }
        
        if (options.status) {
            params.append('status', options.status);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        return url;
    }
    
    /**
     * Generate filename for export
     */
    getFileName(format, options) {
        const date = new Date().toISOString().split('T')[0];
        let filename = `productivity_report_${date}`;
        
        if (options.startDate && options.endDate) {
            filename = `productivity_report_${options.startDate}_to_${options.endDate}`;
        } else if (options.startDate) {
            filename = `productivity_report_from_${options.startDate}`;
        } else if (options.endDate) {
            filename = `productivity_report_until_${options.endDate}`;
        }
        
        return `${filename}.${format}`;
    }
    
    /**
     * Download file from URL
     */
    async downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay to ensure download starts
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Export with date range
     */
    exportDateRange(format, startDate, endDate) {
        return this.exportData(format, {
            startDate: startDate,
            endDate: endDate
        });
    }
    
    /**
     * Export last week's data
     */
    exportLastWeek(format) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        return this.exportDateRange(
            format,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );
    }
    
    /**
     * Export last month's data
     */
    exportLastMonth(format) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 1);
        
        return this.exportDateRange(
            format,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );
    }
    
    /**
     * Export all data
     */
    exportAll(format) {
        return this.exportData(format);
    }
}

/**
 * Client-side PDF generator for simple reports
 */
class ClientPDFGenerator {
    constructor() {
        this.doc = null;
    }
    
    /**
     * Generate simple PDF report
     */
    generateTaskSummary(tasks, filename = 'task_summary.pdf') {
        if (typeof jsPDF === 'undefined') {
            showToast('PDF library not loaded', 'error');
            return;
        }
        
        this.doc = new jsPDF.jsPDF();
        
        // Add title
        this.doc.setFontSize(20);
        this.doc.text('Task Summary Report', 20, 30);
        
        // Add generated date
        this.doc.setFontSize(12);
        this.doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
        
        // Add task list
        let yPosition = 65;
        this.doc.setFontSize(14);
        this.doc.text('Tasks:', 20, yPosition);
        
        yPosition += 10;
        this.doc.setFontSize(10);
        
        tasks.forEach((task, index) => {
            if (yPosition > 270) {
                this.doc.addPage();
                yPosition = 30;
            }
            
            const taskText = `${index + 1}. ${task.title} - ${task.status}`;
            this.doc.text(taskText, 25, yPosition);
            yPosition += 8;
            
            if (task.description) {
                const description = this.doc.splitTextToSize(task.description, 160);
                this.doc.text(description, 30, yPosition);
                yPosition += description.length * 6;
            }
            
            yPosition += 5;
        });
        
        // Save the PDF
        this.doc.save(filename);
    }
    
    /**
     * Generate time tracking report
     */
    generateTimeReport(timeEntries, filename = 'time_report.pdf') {
        if (typeof jsPDF === 'undefined') {
            showToast('PDF library not loaded', 'error');
            return;
        }
        
        this.doc = new jsPDF.jsPDF();
        
        // Add title
        this.doc.setFontSize(20);
        this.doc.text('Time Tracking Report', 20, 30);
        
        // Add generated date
        this.doc.setFontSize(12);
        this.doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
        
        // Calculate total time
        const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const totalHours = (totalTime / 3600).toFixed(2);
        
        this.doc.text(`Total Time Tracked: ${totalHours} hours`, 20, 60);
        
        // Add time entries
        let yPosition = 80;
        this.doc.setFontSize(14);
        this.doc.text('Time Entries:', 20, yPosition);
        
        yPosition += 15;
        this.doc.setFontSize(10);
        
        timeEntries.forEach((entry, index) => {
            if (yPosition > 270) {
                this.doc.addPage();
                yPosition = 30;
            }
            
            const duration = formatDuration(entry.duration || 0);
            const entryText = `${index + 1}. ${entry.task_title} - ${duration}`;
            this.doc.text(entryText, 25, yPosition);
            yPosition += 8;
            
            if (entry.start_time) {
                const startTime = new Date(entry.start_time).toLocaleString();
                this.doc.text(`Started: ${startTime}`, 30, yPosition);
                yPosition += 6;
            }
            
            yPosition += 5;
        });
        
        // Save the PDF
        this.doc.save(filename);
    }
}

/**
 * Initialize export functionality
 */
function initializeExport() {
    window.dataExporter = new DataExporter();
    window.pdfGenerator = new ClientPDFGenerator();
    
    // Bind export form events
    const exportForm = document.getElementById('exportForm');
    if (exportForm) {
        bindExportFormEvents(exportForm);
    }
    
    // Bind quick export buttons
    bindQuickExportButtons();
}

/**
 * Bind export form events
 */
function bindExportFormEvents(form) {
    const csvButton = form.querySelector('[data-export="csv"]');
    const pdfButton = form.querySelector('[data-export="pdf"]');
    
    if (csvButton) {
        csvButton.addEventListener('click', (e) => {
            e.preventDefault();
            exportFormData('csv');
        });
    }
    
    if (pdfButton) {
        pdfButton.addEventListener('click', (e) => {
            e.preventDefault();
            exportFormData('pdf');
        });
    }
}

/**
 * Export data from form
 */
function exportFormData(format) {
    const form = document.getElementById('exportForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const options = {
        startDate: formData.get('start_date'),
        endDate: formData.get('end_date')
    };
    
    // Remove empty values
    Object.keys(options).forEach(key => {
        if (!options[key]) {
            delete options[key];
        }
    });
    
    window.dataExporter.exportData(format, options);
}

/**
 * Bind quick export buttons
 */
function bindQuickExportButtons() {
    // Last week buttons
    document.querySelectorAll('[data-quick-export="week"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const format = button.getAttribute('data-format') || 'csv';
            window.dataExporter.exportLastWeek(format);
        });
    });
    
    // Last month buttons
    document.querySelectorAll('[data-quick-export="month"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const format = button.getAttribute('data-format') || 'csv';
            window.dataExporter.exportLastMonth(format);
        });
    });
    
    // All data buttons
    document.querySelectorAll('[data-quick-export="all"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const format = button.getAttribute('data-format') || 'csv';
            window.dataExporter.exportAll(format);
        });
    });
}

/**
 * Load and display quick stats
 */
function loadQuickStats() {
    fetch('/api/stats')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }
            return response.json();
        })
        .then(data => {
            updateQuickStats(data);
        })
        .catch(error => {
            console.error('Error loading quick stats:', error);
            showToast('Failed to load statistics', 'warning');
        });
}

/**
 * Update quick stats display
 */
function updateQuickStats(data) {
    const elements = {
        totalTasks: document.getElementById('totalTasks'),
        completedTasks: document.getElementById('completedTasks'),
        totalTime: document.getElementById('totalTime'),
        totalCategories: document.getElementById('totalCategories')
    };
    
    if (elements.totalTasks) {
        elements.totalTasks.textContent = data.total_tasks || 0;
    }
    
    if (elements.completedTasks) {
        elements.completedTasks.textContent = data.completed_tasks || 0;
    }
    
    if (elements.totalTime) {
        const hours = (data.total_time_hours || 0).toFixed(1);
        elements.totalTime.textContent = `${hours}h`;
    }
    
    if (elements.totalCategories) {
        const categories = data.time_by_category ? Object.keys(data.time_by_category).length : 0;
        elements.totalCategories.textContent = categories;
    }
}

/**
 * Export current page data as JSON
 */
function exportPageData() {
    const pageData = collectPageData();
    
    if (!pageData || Object.keys(pageData).length === 0) {
        showToast('No data to export on this page', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(pageData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${window.location.pathname.replace('/', '_')}_data.json`;
    link.click();
    
    showToast('Page data exported as JSON', 'success');
}

/**
 * Collect data from current page
 */
function collectPageData() {
    const data = {};
    
    // Collect table data
    const tables = document.querySelectorAll('table');
    tables.forEach((table, index) => {
        const tableData = extractTableData(table);
        if (tableData.length > 0) {
            data[`table_${index}`] = tableData;
        }
    });
    
    // Collect form data
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
        const formData = new FormData(form);
        const formObject = {};
        formData.forEach((value, key) => {
            formObject[key] = value;
        });
        if (Object.keys(formObject).length > 0) {
            data[`form_${index}`] = formObject;
        }
    });
    
    return data;
}

/**
 * Extract data from HTML table
 */
function extractTableData(table) {
    const rows = table.querySelectorAll('tr');
    const data = [];
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        
        cells.forEach(cell => {
            rowData.push(cell.textContent.trim());
        });
        
        if (rowData.length > 0) {
            data.push(rowData);
        }
    });
    
    return data;
}

// Global export functions
window.exportData = function(format) {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    
    window.dataExporter.exportData(format, options);
};

window.exportLastWeek = function(format) {
    window.dataExporter.exportLastWeek(format);
};

window.exportLastMonth = function(format) {
    window.dataExporter.exportLastMonth(format);
};

window.loadQuickStats = loadQuickStats;
window.exportPageData = exportPageData;

// Initialize export functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeExport);
