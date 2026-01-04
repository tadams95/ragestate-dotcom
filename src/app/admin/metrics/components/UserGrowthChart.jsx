'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const VIEW_MODES = ['signups', 'cumulative'];

export default function UserGrowthChart({ data, totalUsers }) {
  const [viewMode, setViewMode] = useState('signups');

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  const formatAxisDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            backgroundColor: 'var(--bg-elev-1)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatAxisDate(label)}
          </p>
          <p className="text-sm" style={{ color: '#3b82f6' }}>
            New Signups: {dataPoint.signups}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Total Users: {dataPoint.cumulative}
          </p>
        </div>
      );
    }
    return null;
  };

  const dataKey = viewMode === 'cumulative' ? 'cumulative' : 'signups';
  const strokeColor = viewMode === 'cumulative' ? '#10b981' : '#3b82f6';

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
            User Growth
          </h3>
          <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
            {totalUsers.toLocaleString()}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Total registered users
          </p>
        </div>

        <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-elev-2)' }}>
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all"
              style={{
                backgroundColor: viewMode === mode ? 'var(--bg-elev-1)' : 'transparent',
                color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: viewMode === mode ? 'var(--shadow-card)' : 'none',
              }}
            >
              {mode === 'cumulative' ? 'Total' : 'Daily'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                stroke="var(--border-subtle)"
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                stroke="var(--border-subtle)"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={strokeColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: strokeColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p style={{ color: 'var(--text-secondary)' }}>No user data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
