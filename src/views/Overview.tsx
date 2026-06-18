import React, { useMemo, useState } from 'react';
import { CancellationData } from '../types';
import { formatNumber } from '../utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface OverviewProps {
  data: CancellationData[];
}

export default function Overview({ data }: OverviewProps) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  // Apply cross-filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (selectedBranch && item.branch !== selectedBranch) return false;
      if (selectedReason && item.detailedReason !== selectedReason) return false;
      return true;
    });
  }, [data, selectedBranch, selectedReason]);

  // Data for left chart: Top 5 Branches (Filter by Reason ONLY, so you can see branches for a reason)
  const branchChartData = useMemo(() => {
    const list = selectedReason ? data.filter(d => d.detailedReason === selectedReason) : data;
    const grouped = list.reduce((acc, item) => {
      acc[item.branch] = (acc[item.branch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  }, [data, selectedReason]);

  // Data for right chart: Top Reasons (Filter by Branch ONLY)
  const reasonChartData = useMemo(() => {
    const list = selectedBranch ? data.filter(d => d.branch === selectedBranch) : data;
    const grouped = list.reduce((acc, item) => {
      acc[item.detailedReason] = (acc[item.detailedReason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7); // Top 7 for better view
  }, [data, selectedBranch]);

  // Tables data based on BOTH filters
  const saleTableData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const key = `${item.salesRepId}_${item.month}_${item.branch}`;
      if (!acc[key]) {
        acc[key] = { 
          id: item.salesRepId, 
          name: item.salesRepName, 
          dept: item.salesDept, 
          month: item.month, 
          branch: item.branch, 
          count: 0 
        };
      }
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { id: string, name: string, dept: string, month: string, branch: string, count: number }>);
    
    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  const deptTableData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const dept = item.salesDept || 'Không rõ';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Interaction Hint */}
      {(selectedBranch || selectedReason) && (
        <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm font-medium border border-indigo-100">
          <div className="flex items-center space-x-2">
            <span>Đang lọc theo:</span>
            {selectedBranch && <span className="bg-white px-2 py-1 rounded shadow-sm border border-indigo-100">Chi nhánh: {selectedBranch}</span>}
            {selectedReason && <span className="bg-white px-2 py-1 rounded shadow-sm border border-indigo-100">Lý do: {selectedReason}</span>}
          </div>
          <button 
            onClick={() => { setSelectedBranch(null); setSelectedReason(null); }}
            className="bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Block 2: Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[420px]">
        {/* Left: Top 5 Branches */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Top 5 Chi Nhánh Hủy Cao Nhất</h3>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter cursor-help" title="Nhấp vào cột để lọc chéo">Cross-filter Bật</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="branch" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  name="Số ca hủy TSD" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                  onClick={(data) => setSelectedBranch(data.branch === selectedBranch ? null : data.branch)}
                  className="cursor-pointer transition-opacity"
                >
                  {branchChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedBranch === entry.branch ? '#4f46e5' : '#6366f1'} opacity={selectedBranch && selectedBranch !== entry.branch ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Top Reasons */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Top Nguyên Nhân Gây Hủy</h3>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter cursor-help" title="Nhấp vào thanh để lọc chéo">Cross-filter Bật</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={reasonChartData} margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="reason" type="category" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  name="Số ca hủy TSD" 
                  radius={[0, 4, 4, 0]} 
                  barSize={16}
                  onClick={(data) => setSelectedReason(data.reason === selectedReason ? null : data.reason)}
                  className="cursor-pointer transition-opacity"
                >
                  {reasonChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedReason === entry.reason ? '#e11d48' : '#fb7185'} opacity={selectedReason && selectedReason !== entry.reason ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Block 3: Blacklist */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Top Nhân viên Kinh doanh (Sale) dính nhiều ca hủy nhất</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-600">Tháng</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Chi nhánh</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Acc nhân viên bán</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Phòng kinh doanh</th>
                  <th className="py-2 px-3 font-semibold text-slate-600 text-right">Số ca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saleTableData.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-600 font-medium">{row.month}</td>
                    <td className="py-2 px-3 text-slate-600">{row.branch}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-800">{row.id}</div>
                      {row.name && row.name !== 'Không rõ' && (
                        <div className="text-[10px] text-slate-500">{row.name}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{row.dept}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">{formatNumber(row.count)}</td>
                  </tr>
                ))}
                {saleTableData.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
