import React, { useState, useMemo, useRef } from 'react';
import { LayoutDashboard, PieChart, Users, Filter, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { MOCK_DATA } from './data';
import Overview from './views/Overview';
import Reasons from './views/Reasons';
import Performance from './views/Performance';
import { FilterState, CancellationData } from './types';
import * as XLSX from 'xlsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reasons' | 'performance'>('overview');
  const [appData, setAppData] = useState<CancellationData[]>(MOCK_DATA);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'SYNCING' | 'ERROR'>('SYNCED');
  
  const [filters, setFilters] = useState<FilterState>({
    month: 'All',
    region: 'All',
    branch: 'All',
    servicePackage: 'All'
  });

  // Extract unique values for filters based on current appData
  const filterOptions = useMemo(() => {
    return {
      months: ['All', ...Array.from(new Set(appData.map(d => d.month)))].sort(),
      regions: ['All', ...Array.from(new Set(appData.map(d => d.region)))],
      branches: ['All', ...Array.from(new Set(appData.map(d => d.branch)))].sort(),
      services: ['All', ...Array.from(new Set(appData.map(d => d.servicePackage)))]
    };
  }, [appData]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return appData.filter(item => {
      if (filters.month !== 'All' && item.month !== filters.month) return false;
      if (filters.region !== 'All' && item.region !== filters.region) return false;
      if (filters.branch !== 'All' && item.branch !== filters.branch) return false;
      if (filters.servicePackage !== 'All' && item.servicePackage !== filters.servicePackage) return false;
      return true;
    });
  }, [filters, appData]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const navItems = [
    { id: 'overview', label: '1. Tổng quan', icon: LayoutDashboard },
    { id: 'reasons', label: '2. Phân tích nguyên nhân', icon: PieChart },
    { id: 'performance', label: '3. Hiệu suất & Rủi ro', icon: Users },
  ] as const;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncStatus('SYNCING');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Find the "chi tiet huy" sheet or fallback to the first sheet
        const targetSheetName = wb.SheetNames.find(name => {
          const cleanName = name.toLowerCase().normalize('NFC');
          return cleanName.includes('chi tiet huy') || cleanName.includes('chi tiết hủy');
        }) || wb.SheetNames[0];

        const ws = wb.Sheets[targetSheetName];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const mappedData: CancellationData[] = data.map((row: any, idx) => {
          // Robust key mapping function that ignores case, spaces, and robustly matches standard Vietnamese tones
          const getVal = (aliases: string[]) => {
            const cleanString = (str: string) => str.toLowerCase().replace(/\s+/g, '').normalize('NFC');
            const foundKey = Object.keys(row).find(k => 
              aliases.some(alias => cleanString(k) === cleanString(alias)) ||
              aliases.some(alias => cleanString(k).includes(cleanString(alias)))
            );
            return foundKey ? row[foundKey] : undefined;
          };

          return {
            id: getVal(['Mã HĐ', 'Hợp đồng']) || `HD_UPLOAD_${idx + 1}`,
            cancelDate: getVal(['Ngày hủy dịch vụ', 'Ngày tạo', 'Lập ngày']) || new Date().toISOString().split('T')[0],
            month: getVal(['Tháng']) || 'Tháng Chưa Rõ',
            region: getVal(['Vùng miền', 'Vung mien']) || 'Chưa Rõ',
            branch: getVal(['CN Quản lý', 'CN Bán', 'Chi nhánh']) || 'Chưa Rõ',
            servicePackage: getVal(['Gói dịch vụ', 'Gói']) || 'Chưa Rõ',
            prepaidAmount: Number(getVal(['Số tiền trả trước', 'Tiền trả trước'])) || 0,
            causeGroup: getVal(['Nhóm']) || 'Khác',
            detailedReason: getVal(['Lý do chuyển xử lý NOT OK', 'Lý do']) || 'Không rõ',
            salesRepId: getVal(['Acc nhân viên bán', 'Acc NV', 'Acc sale', 'Mã NV']) || `Chưa có thông tin Acc`,
            salesRepName: getVal(['Tên nhân viên bán', 'Tên nhân viên', 'Tên Sale']) || 'Không rõ',
            salesDept: getVal(['Phòng kinh doanh', 'Phòng KD']) || 'Không rõ',
            salesChannel: getVal(['Nguồn bán', 'Kênh']) || 'Không rõ',
            paymentMethod: getVal(['Hình thức thanh toán']) || 'Không rõ',
            techId: getVal(['ACT_ASSIGNMENT']) || `KTV_${idx + 1}`
          };
        });

        if (mappedData.length > 0) {
          setAppData(mappedData);
          setSyncStatus('SYNCED');
          alert(`Đã tải thành công ${mappedData.length} dòng dữ liệu.`);
        } else {
          setSyncStatus('ERROR');
          alert('Không tìm thấy dữ liệu hợp lệ trong file Excel.');
        }
      } catch (err) {
        console.error(err);
        setSyncStatus('ERROR');
        alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.onerror = () => {
      setSyncStatus('ERROR');
      alert("Lỗi đọc file.");
    }
    reader.readAsBinaryString(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ban_Ghi");
    XLSX.writeFile(wb, "BaoCao_Raw.xlsx");
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Header Section with Filters */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm shadow-sm"></div>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">
            Report Hủy TSD <span className="font-normal text-slate-400 mx-2">|</span> <span className="text-indigo-600">Dashboard Vận Hành</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <div className="flex flex-col px-3 py-0.5 border-r border-slate-200">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tháng</label>
            <select 
              value={filters.month} 
              onChange={e => updateFilter('month', e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
            >
              {filterOptions.months.map(m => (
                <option key={m} value={m}>{m === 'All' ? 'Tất cả các tháng' : m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col px-3 py-0.5 border-r border-slate-200">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vùng miền</label>
            <select 
              value={filters.region} 
              onChange={e => updateFilter('region', e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer max-w-[120px]"
            >
              {filterOptions.regions.map(r => (
                <option key={r} value={r}>{r === 'All' ? 'Tất cả vùng miền' : r}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col px-3 py-0.5 border-r border-slate-200">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">CN Quản lý</label>
            <select 
              value={filters.branch} 
              onChange={e => updateFilter('branch', e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer max-w-[120px]"
            >
              {filterOptions.branches.map(b => (
                <option key={b} value={b}>{b === 'All' ? 'Tất cả Chi nhánh' : b}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col px-3 py-0.5 pr-4">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gói dịch vụ</label>
            <select 
              value={filters.servicePackage} 
              onChange={e => updateFilter('servicePackage', e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer max-w-[120px]"
            >
              {filterOptions.services.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'Tất cả Gói dịch vụ' : s}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-56 bg-slate-900 flex flex-col shrink-0 py-6 overflow-y-auto">
          <div className="px-6 mb-8">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Phân tích chi tiết</p>
            <ul className="space-y-1">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-auto px-6">
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 mb-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Công thức Tỷ lệ</p>
              <p className="text-[11px] text-slate-300 italic">Hủy / Gross PTTB</p>
              <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-end">
                <span className="text-xs text-slate-500">Target:</span>
                <span className="text-sm font-bold text-emerald-400">&lt; 8.5%</span>
              </div>
            </div>
            
            <button 
              className="w-full flex items-center justify-center space-x-2 bg-indigo-50/10 text-indigo-200 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50/20 transition-colors text-sm"
              onClick={() => alert("Chức năng tải PDF")}
            >
              <Download className="w-4 h-4" />
              <span>Tải PDF</span>
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="space-y-6">
            
            {/* View Title */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {navItems.find(i => i.id === activeTab)?.label.split('. ')[1]}
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                  Đang hiển thị {filteredData.length} kết quả theo bộ lọc hiện tại.
                </p>
              </div>
            </div>

            {/* View Content */}
            {activeTab === 'overview' && <Overview data={filteredData} />}
            {activeTab === 'reasons' && <Reasons data={filteredData} />}
            {activeTab === 'performance' && <Performance data={filteredData} />}

            {/* Quick Action Footer Section */}
            <div className="flex space-x-6 shrink-0 mt-8">
              <div className="flex-1 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-4 shrink-0">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-900">Xuất Báo Cáo RAW (.XLSX)</p>
                  <p className="text-[10px] text-indigo-700 opacity-80">Tải danh sách Blacklist hoặc hiệu suất Sale</p>
                </div>
                <button 
                  onClick={handleExportCSV}
                  className="ml-auto bg-indigo-600 hover:bg-indigo-700 transition-colors text-white text-[10px] font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  TẢI NGAY
                </button>
              </div>
              <div className="flex-1 bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mr-4 shrink-0">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-900">Cập Nhật Data Master</p>
                  <p className="text-[10px] text-emerald-700 opacity-80">Tải file Excel/CSV để phân tích dữ liệu mới</p>
                </div>
                <div className="ml-auto flex items-center space-x-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Status</span>
                    <span className={`text-xs font-bold ${syncStatus === 'SYNCED' ? 'text-emerald-800' : syncStatus === 'SYNCING' ? 'text-amber-600' : 'text-red-600'}`}>
                      {syncStatus}
                    </span>
                  </div>
                  <label className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white text-[10px] font-bold px-4 py-2 rounded-lg cursor-pointer">
                    UPLOAD & PHÂN TÍCH
                    <input 
                      type="file" 
                      accept=".csv, .xlsx, .xls" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
