import React, { useMemo } from 'react';
import { CancellationData } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatNumber } from '../utils';

interface ReasonsProps {
  data: CancellationData[];
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export default function Reasons({ data }: ReasonsProps) {
  // Pie chart data
  const causeGroupData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      acc[item.causeGroup] = (acc[item.causeGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Bar chart data
  const detailedReasonData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      acc[item.detailedReason] = (acc[item.detailedReason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 reasons
  }, [data]);

  // Heatmap table data (Reason vs Region)
  const heatmapData = useMemo(() => {
    const regions = Array.from(new Set(data.map(d => d.region)));
    const reasons = Array.from(new Set(data.map(d => d.detailedReason)));
    
    // Calculate counts
    const matrix: Record<string, Record<string, number>> = {};
    let maxVal = 0;

    reasons.forEach(reason => {
      matrix[reason] = {};
      regions.forEach(region => {
        const count = data.filter(d => d.detailedReason === reason && d.region === region).length;
        matrix[reason][region] = count;
        if (count > maxVal) maxVal = count;
      });
    });
    
    const sortedReasons = reasons.sort((a, b) => {
      const sumA = regions.reduce((acc, r) => acc + (matrix[a][r] || 0), 0);
      const sumB = regions.reduce((acc, r) => acc + (matrix[b][r] || 0), 0);
      return sumB - sumA;
    }).slice(0, 8); // Display top 8 for space

    return { regions, reasons: sortedReasons, matrix, maxVal };
  }, [data]);

  const getHeatmapColor = (value: number, max: number) => {
    if (value === 0) return 'transparent';
    const intensity = Math.min(1, Math.max(0.1, value / max));
    return `rgba(239, 68, 68, ${intensity})`; // Red scale
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cơ cấu Nhóm Nguyên Nhân</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={causeGroupData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {causeGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết Lý do (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={detailedReasonData} margin={{ top: 0, right: 0, left: 100, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="reason" type="category" fontSize={11} tickLine={false} axisLine={false} width={150} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Số lượng" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ma trận Nhiệt - Nguyên nhân theo Vùng miền (Top 8)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-600">Lý do</th>
                  {heatmapData.regions.map(region => (
                    <th key={region} className="py-3 px-4 font-semibold text-slate-600 text-center">{region}</th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-slate-600 text-center">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heatmapData.reasons.map(reason => {
                  const rowSum = heatmapData.regions.reduce((sum, r) => sum + (heatmapData.matrix[reason][r] || 0), 0);
                  
                  return (
                    <tr key={reason} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-700 truncate max-w-[200px]" title={reason}>
                        {reason}
                      </td>
                      {heatmapData.regions.map(region => {
                        const val = heatmapData.matrix[reason][region] || 0;
                        return (
                          <td key={region} className="p-1 text-center font-medium">
                            <div 
                              className="py-2 px-1 rounded mx-auto min-w-[40px]"
                              style={{ backgroundColor: getHeatmapColor(val, heatmapData.maxVal), color: val > (heatmapData.maxVal / 2) ? 'white' : 'inherit' }}
                            >
                              {val > 0 ? formatNumber(val) : '-'}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {formatNumber(rowSum)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
