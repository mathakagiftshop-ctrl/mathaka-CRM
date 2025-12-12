import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Receipt, Download } from 'lucide-react';
import { generateReceiptPDF } from '../utils/pdfGenerator';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/receipts'), api.get('/settings')]).then(([rec, set]) => {
      setReceipts(rec.data);
      setSettings(set.data);
      setLoading(false);
    });
  }, []);

  const downloadPDF = async (receipt, e) => {
    e.preventDefault();
    try {
      const invRes = await api.get(`/invoices/${receipt.invoice_id}`);
      const invoice = invRes.data;
      const doc = generateReceiptPDF(receipt, invoice, invoice.items, settings);
      doc.save(`${receipt.receipt_number}.pdf`);
    } catch (err) {
      alert('Error generating PDF');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Receipts</h1>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {loading ? (
          <p className="p-4 text-center">Loading...</p>
        ) : receipts.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No receipts yet. Receipts are generated when invoices are marked as paid.</p>
        ) : (
          receipts.map(rec => (
            <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <Link to={`/invoices/${rec.invoice_id}`} className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Receipt className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="font-medium">{rec.receipt_number}</p>
                  <p className="text-sm text-gray-500">{rec.customer_name} • {rec.invoice_number}</p>
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">Rs. {rec.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{new Date(rec.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={(e) => downloadPDF(rec, e)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                  title="Download PDF"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
