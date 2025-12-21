import { useState, useEffect } from 'react';
import api from '../api';
import { BarChart3, Users, TrendingUp, Globe, MessageCircle, DollarSign, Percent, Download } from 'lucide-react';
import { exportSalesReport, exportProfitabilityReport, exportTopCustomers, downloadCSV } from '../utils/exportHelpers';

export default function Reports() {
  const [salesData, setSalesData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [inactiveCustomers, setInactiveCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    Promise.all([
      api.get('/reports/sales'),
      api.get('/reports/profitability'),
      api.get('/reports/inactive-customers?days=60')
    ]).then(([sales, profit, inactive]) => {
      setSalesData(sales.data);
      setProfitData(profit.data);
      setInactiveCustomers(inactive.data);
      setLoading(false);
    }).catch(() => {
      // If profitability endpoint doesn't exist yet, continue without it
      Promise.all([
        api.get('/reports/sales'),
        api.get('/reports/inactive-customers?days=60')
      ]).then(([sales, inactive]) => {
        setSalesData(sales.data);
        setInactiveCustomers(inactive.data);
        setLoading(false);
      });
    });
  }, []);

  const openWhatsApp = (phone, name) => {
    const message = encodeURIComponent(`Hi ${name}! This is Mathaka Gift Store. We miss you! 🎁 Would you like to send a special gift to your loved ones?`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="text-purple-600" /> Reports & Analytics
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'sales' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
        >
          Sales Report
        </button>
        <button
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'profitability' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
        >
          Profitability
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'customers' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
        >
          Customer Insights
        </button>
      </div>

      {activeTab === 'sales' && salesData && (
        <div className="space-y-6">
          {/* Monthly Revenue */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp size={18} /> Monthly Revenue
              </h2>
              <button
                onClick={() => exportSalesReport(salesData)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
              >
                <Download size={14} /> Export
              </button>
            </div>
            <div className="space-y-3">
              {salesData.monthly.slice(-6).map(m => (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{m.month}</span>
                    <span className="font-medium">Rs. {m.revenue.toLocaleString()} <span className="text-gray-400">({m.orders})</span></span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min((m.revenue / Math.max(...salesData.monthly.map(x => x.revenue))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Category */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4">Sales by Category</h2>
              <div className="space-y-3">
                {salesData.byCategory.slice(0, 8).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <span className="text-sm">{cat.name}</span>
                    <span className="font-medium">Rs. {cat.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Globe size={18} /> Sales by Country
              </h2>
              <div className="space-y-3">
                {salesData.byCountry.slice(0, 8).map(c => (
                  <div key={c.country} className="flex items-center justify-between">
                    <span className="text-sm">{c.country}</span>
                    <div className="text-right">
                      <span className="font-medium">Rs. {c.revenue.toLocaleString()}</span>
                      <span className="text-xs text-gray-500 ml-2">({c.orders} orders)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Users size={18} /> Top Customers
            </h2>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {salesData.topCustomers.map((c, i) => (
                <div key={c.name} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-gray-400">#{i + 1}</span>
                      <p className="font-medium">{c.name}</p>
                    </div>
                    <span className="font-medium text-purple-600">Rs. {c.revenue.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.orders} orders</p>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-right p-3">Orders</th>
                    <th className="text-right p-3">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {salesData.topCustomers.map((c, i) => (
                    <tr key={c.name}>
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 text-right">{c.orders}</td>
                      <td className="p-3 text-right font-medium text-purple-600">Rs. {c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profitability' && profitData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign size={16} />
                <span className="text-sm">Total Revenue</span>
              </div>
              <p className="text-xl font-bold text-purple-600">Rs. {profitData.summary.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign size={16} />
                <span className="text-sm">Total Cost</span>
              </div>
              <p className="text-xl font-bold text-red-600">Rs. {profitData.summary.totalCost.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingUp size={16} />
                <span className="text-sm">Total Profit</span>
              </div>
              <p className={`text-xl font-bold ${profitData.summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {profitData.summary.totalProfit.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Percent size={16} />
                <span className="text-sm">Avg Margin</span>
              </div>
              <p className={`text-xl font-bold ${profitData.summary.avgMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitData.summary.avgMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Monthly Profitability */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp size={18} /> Monthly Profitability
              </h2>
              <button
                onClick={() => exportProfitabilityReport(profitData)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
              >
                <Download size={14} /> Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Month</th>
                    <th className="text-right p-3">Revenue</th>
                    <th className="text-right p-3">Cost</th>
                    <th className="text-right p-3">Profit</th>
                    <th className="text-right p-3">Margin</th>
                    <th className="text-right p-3">Markup</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {profitData.monthly.map(m => (
                    <tr key={m.month}>
                      <td className="p-3 font-medium">{m.month}</td>
                      <td className="p-3 text-right">Rs. {m.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-red-600">Rs. {m.cost.toLocaleString()}</td>
                      <td className={`p-3 text-right font-medium ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Rs. {m.profit.toLocaleString()}
                      </td>
                      <td className={`p-3 text-right ${m.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.margin.toFixed(1)}%
                      </td>
                      <td className={`p-3 text-right ${m.markup >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.markup.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Packaging Cost Analysis */}
          {profitData.packagingCosts && profitData.packagingCosts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="font-semibold mb-4">Packaging Cost Analysis</h2>
              <div className="space-y-3">
                {profitData.packagingCosts.map(p => (
                  <div key={p.month} className="flex justify-between items-center">
                    <span>{p.month}</span>
                    <span className="text-orange-600 font-medium">Rs. {p.cost.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profitability' && !profitData && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Profitability data will appear here once you start creating orders with cost tracking.</p>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Inactive Customers (60+ days)</h2>
            <p className="text-sm text-gray-500">Customers who haven't ordered recently. Send them a reminder!</p>
          </div>
          <div className="divide-y">
            {inactiveCustomers.length === 0 ? (
              <p className="p-8 text-center text-gray-500">All customers are active! 🎉</p>
            ) : (
              inactiveCustomers.slice(0, 20).map(c => (
                <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-sm text-gray-500">
                      {c.country || 'Unknown'} • Last: {c.last_order ? new Date(c.last_order).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-sm text-orange-600 font-medium whitespace-nowrap">{c.days_inactive}d inactive</span>
                    <button
                      onClick={() => openWhatsApp(c.whatsapp, c.name)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 active:bg-green-200 touch-target"
                    >
                      <MessageCircle size={18} /> <span className="hidden sm:inline">Remind</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
