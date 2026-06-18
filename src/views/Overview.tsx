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
  Cell,
  LabelList
} from 'recharts';

interface OverviewProps {
  data: CancellationData[];
}

const GROUPS_MAPPING: Record<string, string[]> = {
  "Hạ tầng": ["Chưa phủ hạ tầng", "Quá lastmile", "Khu vực độc quyền NCC khác", "Hết Port"],
  "Khách hàng": [
    "KH đổi ý, Không sử dụng", 
    "KH chưa xác định được thời gian triển khai và lắp đặt", 
    "Lên lại hợp đồng do sửa hợp đồng",
    "cước phí phát sinh", "tư vấn lại", "phí chuyển dịch vụ", "dây LAN", "Phí QLTN", "nâng cấp thiết bị",
    "Không liên hệ được khách hàng", "Không tìm được nhà",
    "sử dụng tại địa chỉ cũ", "địa chỉ khác",
    "không đồng ý thanh toán",
    "đổi ý hủy, chuyển nhà cung cấp khác",
    "Nguyên nhân khác",
    "Sai thông tin", "sai địa chỉ", "sai vị trí lắp đặt",
    "chưa có TV", "TV hỏng",
    "đổi ý hủy, không sử dụng",
    "Khách không liên hệ được", "sai số", "khóa máy", "không nghe máy",
    "đã hủy đơn", "không còn nhu cầu",
    "Tủ chưa sẵn sàng", "tủ lỗi", "chưa lắp G6",
    "không cho lắp đặt", "khu vực sản xuất", "an ninh cao",
    "chưa có lịch cụ thể",
    "bàn giao hợp đồng"
  ],
  "Phương án thi công": [
    "chủ trọ", "BQL", "hàng xóm không cho kéo dây",
    "Hướng thi công không ATLĐ", "An toàn điện", "Trạm biến áp", "Cột trung thế", "cột điện NCC",
    "Ngầm hóa", "không có trụ neo",
    "Vật cản", "cây xanh", "bình điện", "bảng hiệu",
    "Đối tác chưa thi công", "đấu nối tín hiệu",
    "Điện lực cắt cáp",
    "Không có vị trí lắp đặt"
  ],
  "Sale": ["IBB tranh chấp", "trùng địa chỉ", "Nghi ngờ hủy cũ ký mới", "Nghi ngờ IBB lên hợp đồng ảo"],
  "Chưa lên PTC": ["Hủy phiếu chưa có phiếu thi công", "chưa lên ptc"]
};

export default function Overview({ data }: OverviewProps) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const groupDataPercent = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return { percents: [], details: {} };
    
    const counts: Record<string, number> = {
      "Hạ tầng": 0,
      "Khách hàng": 0,
      "Phương án thi công": 0,
      "Sale": 0,
      "Chưa lên PTC": 0,
      "Khác": 0
    };

    const details: Record<string, Record<string, number>> = {
      "Hạ tầng": {},
      "Khách hàng": {},
      "Phương án thi công": {},
      "Sale": {},
      "Chưa lên PTC": {},
      "Khác": {}
    };

    filteredData.forEach(item => {
      let matchedGroup = "Khác";
      const reasonStr = item.detailedReason || "Không rõ";
      if (item.detailedReason) {
        const reasonLower = item.detailedReason.toLowerCase();
        for (const [groupName, keywords] of Object.entries(GROUPS_MAPPING)) {
          if (keywords.some(kw => reasonLower.includes(kw.toLowerCase()))) {
            matchedGroup = groupName;
            break;
          }
        }
      }
      counts[matchedGroup]++;
      details[matchedGroup][reasonStr] = (details[matchedGroup][reasonStr] || 0) + 1;
    });

    const percents = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: ((count / total) * 100).toFixed(1)
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const formattedDetails: Record<string, { reason: string; count: number }[]> = {};
    for (const [group, reasonsObj] of Object.entries(details)) {
      formattedDetails[group] = Object.entries(reasonsObj)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    }

    return { percents, details: formattedDetails };
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[460px]">
        {/* Left: Top 5 Branches */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Top 5 Chi Nhánh Hủy Cao Nhất</h3>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter cursor-help" title="Nhấp vào cột để lọc chéo">Cross-filter Bật</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
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
                  <LabelList dataKey="count" position="top" fill="#64748b" fontSize={11} fontWeight="bold" />
                  {branchChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedBranch === entry.branch ? '#4f46e5' : '#818cf8'} opacity={selectedBranch && selectedBranch !== entry.branch ? 0.3 : 1} />
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
          <div className="flex flex-1 min-h-0 gap-4">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={reasonChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="reason" type="category" hide />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Số ca hủy TSD" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                    onClick={(data) => setSelectedReason(data.reason === selectedReason ? null : data.reason)}
                    className="cursor-pointer transition-opacity"
                  >
                    <LabelList dataKey="count" position="right" fill="#64748b" fontSize={11} fontWeight="bold" />
                    {/* Diverse colors for the reasons */}
                    {reasonChartData.map((entry, index) => {
                      const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#14b8a6', '#0ea5e9', '#8b5cf6'];
                      const color = colors[index % colors.length];
                      return <Cell key={`cell-${index}`} fill={color} opacity={selectedReason && selectedReason !== entry.reason ? 0.3 : 0.9} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="w-1/3 flex flex-col justify-center gap-2 overflow-y-auto pl-2 border-l border-slate-100">
              {reasonChartData.map((entry, index) => {
                const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#14b8a6', '#0ea5e9', '#8b5cf6'];
                const color = colors[index % colors.length];
                const isSelected = selectedReason === entry.reason;
                const isMuted = selectedReason && !isSelected;
                return (
                  <div 
                    key={`legend-${index}`} 
                    className={`flex items-start gap-2 cursor-pointer transition-opacity text-xs ${isMuted ? 'opacity-40' : 'opacity-100'}`}
                    onClick={() => setSelectedReason(isSelected ? null : entry.reason)}
                  >
                    <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: color }}></div>
                    <span className="text-slate-600 font-medium leading-tight line-clamp-2" title={entry.reason}>{entry.reason}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Block 3: Phân loại nguyên nhân */}
      {groupDataPercent.percents.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Tỷ Lệ Nhóm Nguyên Nhân Gây Hủy</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {groupDataPercent.percents.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors ${expandedGroups[item.name] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                onClick={() => setExpandedGroups(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
              >
                <div className="text-xs font-semibold text-slate-500 mb-2">{item.name}</div>
                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-bold ${expandedGroups[item.name] ? 'text-indigo-700' : 'text-slate-800'}`}>{item.percent}%</div>
                  <div className="text-sm font-medium text-slate-400 mb-0.5">{item.count} ca</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {groupDataPercent.percents.filter(p => expandedGroups[p.name]).map((group) => {
              const details = groupDataPercent.details[group.name] || [];
              if (details.length === 0) return null;
              
              // Only take top reasons if there's too many
              const displayData = details.slice(0, 10);

              return (
                <div key={`chart-${group.name}`} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col">
                  <h4 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">Chi tiết nhóm: {group.name}</h4>
                  <div className="h-[300px] w-full flex gap-4">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={displayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis dataKey="reason" type="category" hide />
                          <Tooltip 
                            cursor={{ fill: '#e2e8f0' }} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                          />
                          <Bar 
                            dataKey="count" 
                            name="Số ca"
                            radius={[0, 4, 4, 0]} 
                            barSize={16}
                          >
                            <LabelList dataKey="count" position="right" fill="#64748b" fontSize={11} fontWeight="bold" />
                            {displayData.map((entry, index) => {
                               const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];
                               return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} opacity={0.85} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom Legend for Details */}
                    <div className="w-1/3 flex flex-col justify-center gap-2 overflow-y-auto pl-2 border-l border-slate-200">
                      {displayData.map((entry, index) => {
                        const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];
                        const color = colors[index % colors.length];
                        return (
                          <div key={`legend-${index}`} className="flex items-start gap-2 text-xs opacity-90">
                            <div className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: color }}></div>
                            <span className="text-slate-600 font-medium leading-tight">{entry.reason}</span>
                          </div>
                        );
                      })}
                      {details.length > 10 && (
                        <div className="text-xs text-slate-400 italic">Và {details.length - 10} lý do khác...</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Block 4: Blacklist */}
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
