import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Font loading state
let fontLoaded = false;
let fontLoadPromise = null;
let fontBase64 = null;

// Load Sinhala font from CDN
async function loadSinhalaFont() {
  if (fontLoaded) return true;
  if (fontLoadPromise) return fontLoadPromise;
  
  fontLoadPromise = (async () => {
    try {
      const fontUrls = [
        'https://cdn.jsdelivr.net/npm/@aspect-build/aspect-fonts@0.0.1/fonts/NotoSansSinhala-Regular.ttf',
        'https://raw.githubusercontent.com/AbebeAsnake/Noto-Sans-Sinhala/main/NotoSansSinhala-Regular.ttf',
        'https://cdn.jsdelivr.net/gh/AbebeAsnake/Noto-Sans-Sinhala@main/NotoSansSinhala-Regular.ttf'
      ];
      
      let response = null;
      for (const url of fontUrls) {
        try {
          response = await fetch(url);
          if (response.ok) break;
        } catch {
          continue;
        }
      }
      
      if (!response || !response.ok) {
        console.warn('Could not load Sinhala font from any source, falling back to default');
        return false;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fontBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      fontLoaded = true;
      return true;
    } catch (error) {
      console.warn('Failed to load Sinhala font:', error);
      return false;
    }
  })();
  
  return fontLoadPromise;
}

// Register font with a specific jsPDF instance
function registerSinhalaFont(doc) {
  if (!fontLoaded || !fontBase64) return false;
  
  try {
    doc.addFileToVFS('NotoSansSinhala-Regular.ttf', fontBase64);
    doc.addFont('NotoSansSinhala-Regular.ttf', 'NotoSansSinhala', 'normal');
    return true;
  } catch (error) {
    console.warn('Failed to register Sinhala font:', error);
    return false;
  }
}

// Helper to check if text contains Sinhala characters
function containsSinhala(text) {
  if (!text) return false;
  return /[\u0D80-\u0DFF]/.test(text);
}

// Smart text rendering that handles Sinhala/English
function smartText(doc, text, x, y, options, hasSinhala) {
  if (!text) return;
  if (containsSinhala(text) && hasSinhala) {
    doc.setFont('NotoSansSinhala', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }
  doc.text(text, x, y, options || {});
}

// Initialize font loading
loadSinhalaFont();


export async function generateInvoicePDF(invoice, settings) {
  await loadSinhalaFont();
  
  const doc = new jsPDF();
  const hasSinhala = registerSinhalaFont(doc);
  const currency = settings.currency || 'Rs.';
  
  // Header
  doc.setFontSize(20);
  smartText(doc, settings.business_name || 'Mathaka Gift Store', 20, 25, null, hasSinhala);
  doc.setFontSize(10);
  smartText(doc, settings.business_address || '', 20, 32, null, hasSinhala);
  
  // Phone numbers
  let headerY = 38;
  try {
    const phones = JSON.parse(settings.phone_numbers || '[]');
    phones.forEach(p => {
      smartText(doc, p.label + ': ' + p.number, 20, headerY, null, hasSinhala);
      headerY += 5;
    });
  } catch (e) {}
  if (settings.business_email) {
    smartText(doc, settings.business_email, 20, headerY, null, hasSinhala);
  }
  
  // Invoice title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', 150, 25);
  doc.setFontSize(12);
  doc.text(invoice.invoice_number, 150, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: ' + new Date(invoice.created_at).toLocaleDateString(), 150, 42);
  doc.text('Status: ' + invoice.status.toUpperCase(), 150, 49);
  
  // Line
  doc.line(20, 55, 190, 55);
  
  // Bill To
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  smartText(doc, invoice.customer_name || '', 20, 72, null, hasSinhala);
  doc.text('WhatsApp: ' + (invoice.customer_whatsapp || ''), 20, 78);
  if (invoice.customer_country) {
    smartText(doc, 'Country: ' + invoice.customer_country, 20, 84, null, hasSinhala);
  }
  
  // Deliver To
  if (invoice.recipient_name) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deliver To:', 110, 65);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    smartText(doc, invoice.recipient_name, 110, 72, null, hasSinhala);
    if (invoice.recipient_phone) {
      doc.text('Phone: ' + invoice.recipient_phone, 110, 78);
    }
    if (invoice.recipient_address) {
      smartText(doc, invoice.recipient_address, 110, 84, { maxWidth: 80 }, hasSinhala);
    }
  }
  
  // Items table
  const tableData = (invoice.items || []).map(item => [
    item.description,
    item.category_name || '-',
    item.quantity,
    currency + ' ' + parseFloat(item.unit_price).toFixed(2),
    currency + ' ' + parseFloat(item.total).toFixed(2)
  ]);
  
  doc.autoTable({
    startY: 95,
    head: [['Description', 'Category', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [100, 100, 100] },
    styles: {
      font: hasSinhala ? 'NotoSansSinhala' : 'helvetica',
      fontStyle: 'normal'
    },
    didParseCell: function(data) {
      if (data.cell && data.cell.raw && containsSinhala(String(data.cell.raw))) {
        if (hasSinhala) {
          data.cell.styles.font = 'NotoSansSinhala';
        }
      }
    }
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal: ' + currency + ' ' + parseFloat(invoice.subtotal).toFixed(2), 140, finalY);
  
  let totalsY = finalY + 6;
  if (invoice.delivery_fee > 0) {
    doc.text('Delivery: ' + currency + ' ' + parseFloat(invoice.delivery_fee).toFixed(2), 140, totalsY);
    totalsY += 6;
  }
  if (invoice.discount > 0) {
    doc.text('Discount: - ' + currency + ' ' + parseFloat(invoice.discount).toFixed(2), 140, totalsY);
    totalsY += 6;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total: ' + currency + ' ' + parseFloat(invoice.total).toFixed(2), 140, totalsY);
  
  // Payment information
  const amountPaid = parseFloat(invoice.amount_paid) || 0;
  const balanceDue = parseFloat(invoice.total) - amountPaid;
  
  if (amountPaid > 0) {
    totalsY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 128, 0);
    doc.text('Amount Paid: ' + currency + ' ' + amountPaid.toLocaleString(), 140, totalsY);
    doc.setTextColor(0, 0, 0);
    
    if (balanceDue > 0) {
      totalsY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('Balance Due: ' + currency + ' ' + balanceDue.toLocaleString(), 140, totalsY);
      doc.setTextColor(0, 0, 0);
    }
  }
  
  // Bank details
  try {
    const banks = JSON.parse(settings.bank_accounts || '[]');
    if (banks.length > 0) {
      let bankY = totalsY + 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details:', 20, bankY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      bankY += 7;
      banks.forEach(bank => {
        smartText(doc, bank.bank_name + ' - ' + bank.account_name, 20, bankY, null, hasSinhala);
        doc.text('A/C: ' + bank.account_number + ' | Branch: ' + bank.branch, 20, bankY + 5);
        bankY += 14;
      });
    }
  } catch (e) {}
  
  // Notes
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, doc.internal.pageSize.height - 40);
    doc.setFont('helvetica', 'normal');
    smartText(doc, invoice.notes, 20, doc.internal.pageSize.height - 34, { maxWidth: 170 }, hasSinhala);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 15, { align: 'center' });
  
  return doc;
}


// Customer Invoice PDF - Shows packages with item list (no prices per item)
export async function generateCustomerInvoicePDF(invoice, settings) {
  await loadSinhalaFont();
  
  const doc = new jsPDF();
  const hasSinhala = registerSinhalaFont(doc);
  const currency = settings.currency || 'Rs.';
  
  // Header
  doc.setFontSize(20);
  smartText(doc, settings.business_name || 'Mathaka Gift Store', 20, 25, null, hasSinhala);
  doc.setFontSize(10);
  smartText(doc, settings.business_address || '', 20, 32, null, hasSinhala);
  
  // Phone numbers
  let headerY = 38;
  try {
    const phones = JSON.parse(settings.phone_numbers || '[]');
    phones.forEach(p => {
      smartText(doc, p.label + ': ' + p.number, 20, headerY, null, hasSinhala);
      headerY += 5;
    });
  } catch (e) {}
  if (settings.business_email) {
    smartText(doc, settings.business_email, 20, headerY, null, hasSinhala);
  }
  
  // Invoice title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', 150, 25);
  doc.setFontSize(12);
  doc.text(invoice.invoice_number, 150, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: ' + new Date(invoice.created_at).toLocaleDateString(), 150, 42);
  doc.text('Status: ' + invoice.status.toUpperCase(), 150, 49);
  
  // Line
  doc.line(20, 55, 190, 55);
  
  // Bill To
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  smartText(doc, invoice.customer_name || '', 20, 72, null, hasSinhala);
  doc.text('WhatsApp: ' + (invoice.customer_whatsapp || ''), 20, 78);
  if (invoice.customer_country) {
    smartText(doc, 'Country: ' + invoice.customer_country, 20, 84, null, hasSinhala);
  }
  
  // Deliver To
  if (invoice.recipient_name) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Deliver To:', 110, 65);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    smartText(doc, invoice.recipient_name, 110, 72, null, hasSinhala);
    if (invoice.recipient_phone) {
      doc.text('Phone: ' + invoice.recipient_phone, 110, 78);
    }
    if (invoice.recipient_address) {
      smartText(doc, invoice.recipient_address, 110, 84, { maxWidth: 80 }, hasSinhala);
    }
  }
  
  let currentY = 100;
  
  // Packages with items (no individual prices)
  if (invoice.packages && invoice.packages.length > 0) {
    invoice.packages.forEach(pkg => {
      // Package header
      doc.setFillColor(245, 240, 255);
      doc.rect(20, currentY - 5, 170, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      smartText(doc, pkg.package_name, 25, currentY + 2, null, hasSinhala);
      doc.text(currency + ' ' + parseFloat(pkg.package_price).toFixed(2), 165, currentY + 2, { align: 'right' });
      currentY += 12;
      
      // Items list (no prices)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      pkg.items.forEach(item => {
        smartText(doc, '• ' + item.description + ' (x' + item.quantity + ')', 30, currentY, null, hasSinhala);
        currentY += 5;
      });
      doc.setTextColor(0, 0, 0);
      currentY += 5;
    });
  } else {
    // Fallback for legacy invoices without packages
    const tableData = (invoice.items || []).map(item => [
      item.description,
      item.quantity,
      currency + ' ' + parseFloat(item.total).toFixed(2)
    ]);
    
    doc.autoTable({
      startY: currentY,
      head: [['Description', 'Qty', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100] },
      styles: {
        font: hasSinhala ? 'NotoSansSinhala' : 'helvetica',
        fontStyle: 'normal'
      },
      didParseCell: function(data) {
        if (data.cell && data.cell.raw && containsSinhala(String(data.cell.raw))) {
          if (hasSinhala) {
            data.cell.styles.font = 'NotoSansSinhala';
          }
        }
      }
    });
    currentY = doc.lastAutoTable.finalY + 10;
  }
  
  // Totals
  currentY += 5;
  doc.line(20, currentY, 190, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 130, currentY);
  doc.text(currency + ' ' + parseFloat(invoice.subtotal).toFixed(2), 190, currentY, { align: 'right' });
  currentY += 6;
  
  if (invoice.delivery_fee > 0) {
    doc.text('Delivery:', 130, currentY);
    doc.text(currency + ' ' + parseFloat(invoice.delivery_fee).toFixed(2), 190, currentY, { align: 'right' });
    currentY += 6;
  }
  if (invoice.discount > 0) {
    doc.text('Discount:', 130, currentY);
    doc.text('- ' + currency + ' ' + parseFloat(invoice.discount).toFixed(2), 190, currentY, { align: 'right' });
    currentY += 6;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 130, currentY + 2);
  doc.text(currency + ' ' + parseFloat(invoice.total).toFixed(2), 190, currentY + 2, { align: 'right' });
  currentY += 10;
  
  // Payment information
  const amountPaid = parseFloat(invoice.amount_paid) || 0;
  const balanceDue = parseFloat(invoice.total) - amountPaid;
  
  if (amountPaid > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 128, 0);
    doc.text('Amount Paid:', 130, currentY);
    doc.text(currency + ' ' + amountPaid.toLocaleString(), 190, currentY, { align: 'right' });
    currentY += 6;
    doc.setTextColor(0, 0, 0);
    
    if (balanceDue > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('Balance Due:', 130, currentY);
      doc.text(currency + ' ' + balanceDue.toLocaleString(), 190, currentY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      currentY += 8;
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 0);
      doc.text('FULLY PAID', 160, currentY, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      currentY += 8;
    }
  }
  
  // Bank details
  try {
    const banks = JSON.parse(settings.bank_accounts || '[]');
    if (banks.length > 0) {
      currentY += 20;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details:', 20, currentY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      currentY += 7;
      banks.forEach(bank => {
        smartText(doc, bank.bank_name + ' - ' + bank.account_name, 20, currentY, null, hasSinhala);
        doc.text('A/C: ' + bank.account_number + ' | Branch: ' + bank.branch, 20, currentY + 5);
        currentY += 14;
      });
    }
  } catch (e) {}
  
  // Gift message
  if (invoice.gift_message) {
    currentY += 10;
    doc.setFontSize(10);
    doc.setTextColor(200, 100, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('Gift Message:', 20, currentY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    smartText(doc, '"' + invoice.gift_message + '"', 20, currentY + 6, { maxWidth: 170 }, hasSinhala);
    doc.setTextColor(0, 0, 0);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing us!', 105, doc.internal.pageSize.height - 15, { align: 'center' });
  
  return doc;
}


export async function generateReceiptPDF(receipt, invoice, items, settings) {
  await loadSinhalaFont();
  
  const doc = new jsPDF();
  const hasSinhala = registerSinhalaFont(doc);
  const currency = settings.currency || 'Rs.';
  
  // Header
  doc.setFontSize(20);
  smartText(doc, settings.business_name || 'Mathaka Gift Store', 20, 25, null, hasSinhala);
  doc.setFontSize(10);
  smartText(doc, settings.business_address || '', 20, 32, null, hasSinhala);
  
  // Receipt title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('RECEIPT', 150, 25);
  doc.setFontSize(12);
  doc.text(receipt.receipt_number, 150, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: ' + new Date(receipt.created_at).toLocaleDateString(), 150, 42);
  doc.setTextColor(0, 128, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID', 150, 49);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  // Line
  doc.line(20, 55, 190, 55);
  
  // Received From
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Received From:', 20, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  smartText(doc, invoice.customer_name || '', 20, 72, null, hasSinhala);
  doc.text('WhatsApp: ' + (invoice.customer_whatsapp || ''), 20, 78);
  
  // For Invoice
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('For Invoice:', 110, 65);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 110, 72);
  
  // Items table
  const tableData = (items || []).map(item => [
    item.description,
    item.quantity,
    currency + ' ' + parseFloat(item.total).toFixed(2)
  ]);
  
  doc.autoTable({
    startY: 90,
    head: [['Description', 'Qty', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 128, 0] },
    styles: {
      font: hasSinhala ? 'NotoSansSinhala' : 'helvetica',
      fontStyle: 'normal'
    },
    didParseCell: function(data) {
      if (data.cell && data.cell.raw && containsSinhala(String(data.cell.raw))) {
        if (hasSinhala) {
          data.cell.styles.font = 'NotoSansSinhala';
        }
      }
    }
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal: ' + currency + ' ' + parseFloat(invoice.subtotal).toFixed(2), 140, finalY);
  
  let totalsY = finalY + 6;
  if (invoice.discount > 0) {
    doc.text('Discount: - ' + currency + ' ' + parseFloat(invoice.discount).toFixed(2), 140, totalsY);
    totalsY += 6;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid: ' + currency + ' ' + parseFloat(receipt.amount).toFixed(2), 140, totalsY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const paymentMethod = receipt.payment_method === 'bank_transfer' ? 'Bank Transfer' : receipt.payment_method;
  doc.text('Payment Method: ' + paymentMethod, 20, totalsY + 10);
  
  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 15, { align: 'center' });
  
  return doc;
}

// Pre-load font on module import for faster PDF generation
loadSinhalaFont();
