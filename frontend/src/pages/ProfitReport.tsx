import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Filter, TrendingUp, DollarSign, Calendar, Package } from 'lucide-react';

export default function ProfitReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  // Calculate profit data by program
  const profitData = useMemo(() => {
    const programProfits = state.programs.map(program => {
      const programBookings = state.bookings.filter(booking => booking.tripId === program.id);
      const totalBookings = programBookings.length;
      const totalSales = programBookings.reduce((sum, booking) => sum + booking.sellingPrice, 0);
      const totalProfit = programBookings.reduce((sum, booking) => sum + booking.profit, 0);
      const totalCost = programBookings.reduce((sum, booking) => sum + booking.basePrice, 0);

      return {
        id: program.id,
        programName: program.name,
        type: program.type,
        bookings: totalBookings,
        totalSales,
        totalProfit,
        totalCost,
        profitMargin: totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0
      };
    });

    // Apply filters
    let filteredData = programProfits;
    
    if (filterType !== 'all') {
      filteredData = filteredData.filter(item => item.type === filterType);
    }

    return filteredData.sort((a, b) => b.totalProfit - a.totalProfit);
  }, [state.programs, state.bookings, filterType]);

  // Calculate totals
  const totals = useMemo(() => {
    return profitData.reduce(
      (acc, item) => ({
        totalBookings: acc.totalBookings + item.bookings,
        totalSales: acc.totalSales + item.totalSales,
        totalProfit: acc.totalProfit + item.totalProfit,
        totalCost: acc.totalCost + item.totalCost
      }),
      { totalBookings: 0, totalSales: 0, totalProfit: 0, totalCost: 0 }
    );
  }, [profitData]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const monthlyData = state.bookings.reduce((acc: any, booking) => {
      const date = new Date(booking.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, sales: 0, profit: 0, bookings: 0 };
      }
      
      acc[monthKey].sales += booking.sellingPrice;
      acc[monthKey].profit += booking.profit;
      acc[monthKey].bookings += 1;
      
      return acc;
    }, {});

    return Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
  }, [state.bookings]);



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('profitReport')}</h1>
          <p className="text-gray-600 mt-2">Comprehensive profit analysis and performance metrics</p>
        </div>
    
 
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('totalBookings')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totals.totalBookings}</p>
              <p className="text-sm text-blue-600 mt-1">Active reservations</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('totalSales')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totals.totalSales.toLocaleString()} MAD</p>
              <p className="text-sm text-emerald-600 mt-1">Revenue generated</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('totalProfit')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totals.totalProfit.toLocaleString()} MAD</p>
              <p className="text-sm text-orange-600 mt-1">Net profit earned</p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {totals.totalSales > 0 ? ((totals.totalProfit / totals.totalSales) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-purple-600 mt-1">Average margin</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Program Types</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profit by Program Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Profit by Program</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="programName" 
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`${Number(value).toLocaleString()} MAD`, 'Profit']}
              />
              <Bar dataKey="totalProfit" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`${Number(value).toLocaleString()} MAD`, 'Profit']}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Program Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bookings')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('totalSales')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('totalProfit')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit Margin
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profitData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/booking/program/${item.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.programName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.type === 'Hajj' ? 'bg-blue-100 text-blue-700' :
                      item.type === 'Umrah' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalSales.toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.totalCost.toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                    {item.totalProfit.toLocaleString()} MAD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="mr-2">{item.profitMargin.toFixed(1)}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${Math.min(item.profitMargin, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {profitData.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No profit data available</h3>
          <p className="text-gray-500">Start adding bookings to see profit analytics.</p>
        </div>
      )}
    </div>
  );
}