'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { aggregateByMonth, aggregateByWeek } from '../hooks/useMetricsData';

const TIME_RANGES = ['daily', 'weekly', 'monthly'];

export default function RevenueChart({ data, totalRevenue }) {
  const [timeRange, setTimeRange] = useState('daily');

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    switch (timeRange) {
      case 'weekly':
        return aggregateByWeek(data, 'revenue');
      case 'monthly':
        return aggregateByMonth(data, 'revenue');
      default:
        return data;
    }
  }, [data, timeRange]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value / 100); // Convert cents to dollars
  };

  const formatAxisDate = (dateStr) => {
    if (timeRange === 'monthly') return dateStr;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            backgroundColor: 'var(--bg-elev-1)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {timeRange === 'monthly' ? label : formatAxisDate(label)}
          </p>
          <p className="text-sm" style={{ color: 'var(--accent)' }}>
            Revenue: {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.orders !== undefined && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Orders: {payload[0].payload.orders}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        backgroundColor: 'var(--bg-elev-1)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Revenue
          </h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Total all-time revenue
          </p>
        </div>

        <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-elev-2)' }}>
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all"
              style={{
                backgroundColor: timeRange === range ? 'var(--bg-elev-1)' : 'transparent',
                color: timeRange === range ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: timeRange === range ? 'var(--shadow-card)' : 'none',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                stroke="var(--border-subtle)"
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                stroke="var(--border-subtle)"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p style={{ color: 'var(--text-secondary)' }}>No revenue data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
