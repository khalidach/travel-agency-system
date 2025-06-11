import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, DollarSign, TrendingUp, Package, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const { state } = useAppContext();

  // Calculate statistics
  const totalBookings = state.bookings.length;
  const totalRevenue = state.bookings.reduce((sum, booking) => sum + booking.sellingPrice, 0);
  const totalProfit = state.bookings.reduce((sum, booking) => sum + booking.profit, 0);
  const activePrograms = state.programs.length;
  const fullyPaidBookings = state.bookings.filter(b => b.isFullyPaid).length;
  const pendingPayments = state.bookings.filter(b => !b.isFullyPaid).length;

  // Chart data
  const programTypeData = [
    { name: 'Hajj', value: state.programs.filter(p => p.type === 'Hajj').length, color: '#3b82f6' },
    { name: 'Umrah', value: state.programs.filter(p => p.type === 'Umrah').length, color: '#059669' },
    { name: 'Tourism', value: state.programs.filter(p => p.type === 'Tourism').length, color: '#ea580c' }
  ];

  const monthlyData = [
    { month: 'Jan', bookings: 12, revenue: 48000 },
    { month: 'Feb', bookings: 8, revenue: 32000 },
    { month: 'Mar', bookings: 15, revenue: 60000 },
    { month: 'Apr', bookings: 10, revenue: 40000 },
    { month: 'May', bookings: 18, revenue: 72000 },
  ];

  const stats = [
    {
      title: t('totalBookings'),
      value: totalBookings,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: t('totalRevenue'),
      value: `${totalRevenue.toLocaleString()} MAD`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      change: '+8%'
    },
    {
      title: t('totalProfit'),
      value: `${totalProfit.toLocaleString()} MAD`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+15%'
    },
    {
      title: t('activePrograms'),
      value: activePrograms,
      icon: Package,
      color: 'bg-purple-500',
      change: '+3'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="text-gray-600 mt-2">
          Overview of your travel agency performance and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-emerald-600 mt-1">{stat.change} from last month</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
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
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Program Types Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Program Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={programTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {programTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {programTypeData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <Calendar className="w-5 h-5 text-blue-500 mr-3" />
              <span className="text-sm font-medium text-gray-700">New Booking</span>
            </button>
            <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <Package className="w-5 h-5 text-emerald-500 mr-3" />
              <span className="text-sm font-medium text-gray-700">Add Program</span>
            </button>
            <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <TrendingUp className="w-5 h-5 text-orange-500 mr-3" />
              <span className="text-sm font-medium text-gray-700">View Reports</span>
            </button>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />
                <span className="text-sm text-gray-600">Fully Paid</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{fullyPaidBookings}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-orange-500 mr-2" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{pendingPayments}</span>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
          <div className="space-y-3">
            {state.bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.clientNameFr}</p>
                  <p className="text-xs text-gray-500">{booking.passportNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{booking.sellingPrice.toLocaleString()} MAD</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    booking.isFullyPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {booking.isFullyPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}