/**
 * Export Helper Utilities
 * Functions for exporting data as CSV and other formats
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column definitions [{key: 'fieldName', label: 'Column Header'}]
 * @returns {string} CSV formatted string
 */
export function arrayToCSV(data, columns) {
    if (!data || data.length === 0) return '';

    // Header row
    const headers = columns.map(col => `"${col.label}"`).join(',');

    // Data rows
    const rows = data.map(item => {
        return columns.map(col => {
            let value = item[col.key];

            // Handle nested properties (e.g., 'customer.name')
            if (col.key.includes('.')) {
                const keys = col.key.split('.');
                value = keys.reduce((obj, key) => obj?.[key], item);
            }

            // Format value
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'number') {
                value = value.toString();
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            }

            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headers, ...rows].join('\n');
}

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column definitions
 * @param {string} filename - Name of the file (without extension)
 */
export function downloadCSV(data, columns, filename) {
    const csv = arrayToCSV(data, columns);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${formatDateForFilename(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Format date for filename (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateForFilename(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Export sales report data
 */
export function exportSalesReport(salesData) {
    if (!salesData) return;

    // Monthly revenue
    const monthlyColumns = [
        { key: 'month', label: 'Month' },
        { key: 'revenue', label: 'Revenue (Rs.)' },
        { key: 'orders', label: 'Orders' }
    ];
    downloadCSV(salesData.monthly, monthlyColumns, 'sales_monthly');
}

/**
 * Export profitability report data
 */
export function exportProfitabilityReport(profitData) {
    if (!profitData) return;

    const columns = [
        { key: 'month', label: 'Month' },
        { key: 'revenue', label: 'Revenue (Rs.)' },
        { key: 'cost', label: 'Cost (Rs.)' },
        { key: 'profit', label: 'Profit (Rs.)' },
        { key: 'margin', label: 'Margin (%)' },
        { key: 'markup', label: 'Markup (%)' }
    ];
    downloadCSV(profitData.monthly, columns, 'profitability');
}

/**
 * Export customer list data
 */
export function exportCustomers(customers) {
    if (!customers || customers.length === 0) return;

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'whatsapp', label: 'WhatsApp' },
        { key: 'country', label: 'Country' },
        { key: 'invoice_count', label: 'Orders' },
        { key: 'notes', label: 'Notes' }
    ];
    downloadCSV(customers, columns, 'customers');
}

/**
 * Export top customers data
 */
export function exportTopCustomers(topCustomers) {
    if (!topCustomers || topCustomers.length === 0) return;

    const columns = [
        { key: 'name', label: 'Customer Name' },
        { key: 'orders', label: 'Total Orders' },
        { key: 'revenue', label: 'Total Revenue (Rs.)' }
    ];
    downloadCSV(topCustomers, columns, 'top_customers');
}

/**
 * Export invoices data
 */
export function exportInvoices(invoices) {
    if (!invoices || invoices.length === 0) return;

    const columns = [
        { key: 'invoice_number', label: 'Invoice Number' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'created_at', label: 'Date' },
        { key: 'status', label: 'Payment Status' },
        { key: 'order_status', label: 'Order Status' },
        { key: 'subtotal', label: 'Subtotal (Rs.)' },
        { key: 'discount', label: 'Discount (Rs.)' },
        { key: 'delivery_fee', label: 'Delivery Fee (Rs.)' },
        { key: 'total', label: 'Total (Rs.)' }
    ];
    downloadCSV(invoices, columns, 'invoices');
}
