import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generateInvoicePDF(invoice, settings) {
  const doc = new jsPDF();
  const currency = settings.currency || 'Rs.';
  
  // Header
  doc.setFontSize(20);
  doc.text(settings.business_name || 'Mathaka Gift Store', 20, 25);
  doc.setFontSize(10);
  doc.text(settings.business_address || '', 20, 32);
  
  // Phone numbers
  let headerY = 38;
  try {
    const phones = JSON.parse(settings.phone_numbers || '[]');
    phones.forEach(p => {
      doc.text(`${p.label}: ${p.number}`, 20, headerY);
      headerY += 5;
    });
  } catch {}
  if (settings.business_email) doc.text(settings.business_email, 20, headerY);
  
  // Invoice title
  doc.setFontSize(24);
  doc.text('INVOICE', 150, 25);
  doc.setFontSize(12);
  doc.text(invoice.invoice_number, 150, 35);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 150, 42);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 150, 49);
  
  // Line
  doc.line(20, 55, 190, 55);
  
  // Bill To
  doc.setFontSize(12);
  doc.text('Bill To:', 20, 65);
  doc.setFontSize(10);
  doc.text(invoice.customer_name || '', 20, 72);
  doc.text(`WhatsApp: ${invoice.customer_whatsapp || ''}`, 20, 78);
  if (invoice.customer_country) doc.text(`Country: ${invoice.customer_country}`, 20, 84);
  
  // Deliver To
  if (invoice.recipient_name) {
    doc.setFontSize(12);
    doc.text('Deliver To:', 110, 65);
    doc.setFontSize(10);
    doc.text(invoice.recipient_name, 110, 72);
    if (invoice.recipient_phone) doc.text(`Phone: ${invoice.recipient_phone}`, 110, 78);
    if (invoice.recipient_address) doc.text(invoice.recipient_address, 110, 84, { maxWidth: 80 });
  }
  
  // Items table
  const tableData = invoice.items.map(item => [
    item.description,
    item.category_name || '-',
    item.quantity,
    `${currency} ${parseFloat(item.unit_price).toFixed(2)}`,
    `${currency} ${parseFloat(item.total).toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: 95,
    head: [['Description', 'Category', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [100, 100, 100] }
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Subtotal: ${currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, 140, finalY);
  
  let totalsY = finalY + 6;
  if (invoice.delivery_fee > 0) {
    doc.text(`Delivery: ${currency} ${parseFloat(invoice.delivery_fee).toFixed(2)}`, 140, totalsY);
    totalsY += 6;
  }
  if (invoice.discount > 0) {
    doc.text(`Discount: - ${currency} ${parseFloat(invoice.discount).toFixed(2)}`, 140, totalsY);
    totalsY += 6;
  }
  doc.setFontSize(12);
  doc.text(`Total: ${currency} ${parseFloat(invoice.total).toFixed(2)}`, 140, totalsY);
  
  // Bank details
  try {
    const banks = JSON.parse(settings.bank_accounts || '[]');
    if (banks.length > 0) {
      let bankY = totalsY + 15;
      doc.setFontSize(12);
      doc.text('Bank Details:', 20, bankY);
      doc.setFontSize(10);
      bankY += 7;
      banks.forEach(bank => {
        doc.text(`${bank.bank_name} - ${bank.account_name}`, 20, bankY);
        doc.text(`A/C: ${bank.account_number} | Branch: ${bank.branch}`, 20, bankY + 5);
        bankY += 14;
      });
    }
  } catch {}
  
  // Notes
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.text('Notes:', 20, doc.internal.pageSize.height - 40);
    doc.text(invoice.notes, 20, doc.internal.pageSize.height - 34, { maxWidth: 170 });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 15, { align: 'center' });
  
  return doc;
}

export function generateReceiptPDF(receipt, invoice, items, settings) {
  const doc = new jsPDF();
  const currency = settings.currency || 'Rs.';
  
  // Header
  doc.setFontSize(20);
  doc.text(settings.business_name || 'Mathaka Gift Store', 20, 25);
  doc.setFontSize(10);
  doc.text(settings.business_address || '', 20, 32);
  
  // Receipt title
  doc.setFontSize(24);
  doc.text('RECEIPT', 150, 25);
  doc.setFontSize(12);
  doc.text(receipt.receipt_number, 150, 35);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date(receipt.created_at).toLocaleDateString()}`, 150, 42);
  doc.setTextColor(0, 128, 0);
  doc.text('PAID', 150, 49);
  doc.setTextColor(0, 0, 0);
  
  // Line
  doc.line(20, 55, 190, 55);
  
  // Received From
  doc.setFontSize(12);
  doc.text('Received From:', 20, 65);
  doc.setFontSize(10);
  doc.text(invoice.customer_name || '', 20, 72);
  doc.text(`WhatsApp: ${invoice.customer_whatsapp || ''}`, 20, 78);
  
  // For Invoice
  doc.setFontSize(12);
  doc.text('For Invoice:', 110, 65);
  doc.setFontSize(10);
  doc.text(invoice.invoice_number, 110, 72);
  
  // Items table
  const tableData = items.map(item => [
    item.description,
    item.quantity,
    `${currency} ${parseFloat(item.total).toFixed(2)}`
  ]);
  
  doc.autoTable({
    startY: 90,
    head: [['Description', 'Qty', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 128, 0] }
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Subtotal: ${currency} ${parseFloat(invoice.subtotal).toFixed(2)}`, 140, finalY);
  
  let totalsY = finalY + 6;
  if (invoice.discount > 0) {
    doc.text(`Discount: - ${currency} ${parseFloat(invoice.discount).toFixed(2)}`, 140, totalsY);
    totalsY += 6;
  }
  doc.setFontSize(12);
  doc.text(`Amount Paid: ${currency} ${parseFloat(receipt.amount).toFixed(2)}`, 140, totalsY);
  
  doc.setFontSize(10);
  doc.text(`Payment Method: ${receipt.payment_method === 'bank_transfer' ? 'Bank Transfer' : receipt.payment_method}`, 20, totalsY + 10);
  
  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 15, { align: 'center' });
  
  return doc;
}
