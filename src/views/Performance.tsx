import React, { useMemo } from 'react';
import { CancellationData } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { formatCurrency, formatNumber } from '../utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PerformanceProps {
  data: CancellationData[];
}

export default function Performance({ data }: PerformanceProps) {
  // Leaderboard data
  const leaderboardData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.salesRepId]) {
        acc[item.salesRepId] = {
          name: item.salesRepName,
          dept: item.salesDept,
          count: 0,
          totalAmount: 0
        };
      }
      acc[item.salesRepId].count += 1;
      acc[item.salesRepId].totalAmount += item.prepaidAmount;
      return acc;
    }, {} as Record<string, { name: string, dept: string, count: number, totalAmount: number }>);

    return Object.entries(grouped)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data]);

  // Stacked Bar Data (Channel vs Cause)
  const channelCauseData = useMemo(() => {
    const channels = Array.from(new Set(data.map(d => d.salesChannel)));
    const causeGroups = Array.from(new Set(data.map(d => d.causeGroup)));

    return channels.map(channel => {
      const entry: any = { channel };
      causeGroups.forEach(cause => {
        entry[cause] = data.filter(d => d.salesChannel === channel && d.causeGroup === cause).length;
      });
      return entry;
    });
  }, [data]);

  // Blacklist Data
  const blacklistData = useMemo(() => {
    return data
      .filter(item => 
        item.causeGroup === 'Sale' || 
        item.detailedReason.includes('Nghi ngờ') ||
        item.detailedReason.includes('Tranh chấp') ||
        item.detailedReason.includes('ảo')
      )
      .sort((a, b) => new Date(b.cancelDate).getTime() - new Date(a.cancelDate).getTime())
      .slice(0, 15); // Show latest 15
  }, [data]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Nhân viên Hủy cao nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-slate-600">Acc nhân viên bán</th>
                    <th className="py-2 px-3 font-semibold text-slate-600">Phòng kinh doanh</th>
                    <th className="py-2 px-3 font-semibold text-slate-600 text-right">Số ca</th>
                    <th className="py-2 px-3 font-semibold text-slate-600 text-right">Tiền hoàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboardData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-800">{row.id}</div>
                        {row.name && row.name !== 'Không rõ' && (
                          <div className="text-xs text-slate-500">{row.name}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.dept}</td>
                      <td className="py-2 px-3 text-right font-bold text-red-600">{formatNumber(row.count)}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hủy theo Kênh bán & Nguyên nhân</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelCauseData} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="channel" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {Object.keys(channelCauseData[0] || {}).filter(k => k !== 'channel').map((key, index) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đen (Nghi ngờ trục lợi / Lỗi Sale)</CardTitle>
          <CardDescription>
            Các ca hủy có nguyên nhân thuộc nhóm Sale hoặc chứa từ khóa tranh chấp, nghi ngờ, ảo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-red-50 border-b border-red-100">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-700">Mã HĐ</th>
                  <th className="py-3 px-4 font-semibold text-slate-700">Ngày hủy</th>
                  <th className="py-3 px-4 font-semibold text-slate-700">Nhân viên</th>
                  <th className="py-3 px-4 font-semibold text-slate-700">Lý do chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blacklistData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{item.id}</td>
                    <td className="py-3 px-4 text-slate-600">{item.cancelDate}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{item.salesRepName}</div>
                      <div className="text-xs text-slate-500">{item.salesRepId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.detailedReason}
                      </span>
                    </td>
                  </tr>
                ))}
                {blacklistData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Không có dữ liệu rủi ro trong khoảng thời gian này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
