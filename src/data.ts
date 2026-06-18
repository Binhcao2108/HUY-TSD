import { CancellationData } from './types';

const regions = ['Miền Bắc', 'Miền Trung', 'Miền Nam'];
const branchesByRegion: Record<string, string[]> = {
  'Miền Bắc': ['CN Hà Nội', 'CN Hải Phòng', 'CN Quảng Ninh'],
  'Miền Trung': ['CN Đà Nẵng', 'CN Huế', 'CN Nha Trang'],
  'Miền Nam': ['CN TP.HCM', 'CN Cần Thơ', 'CN Bình Dương'],
};
const servicePackages = ['Internet 150Mbps', 'Internet 300Mbps', 'Combo Internet + TV', 'Camera Cloud'];
const causeGroups = ['Khách hàng', 'Hạ tầng', 'Phương án thi công', 'Sale', 'Chưa lên PTC'];

const reasonsByGroup: Record<string, string[]> = {
  'Khách hàng': ['Khách hàng đổi ý', 'Hủy do phải đi công tác', 'Chờ quá lâu không thấy lắp', 'Chuyển nhà'],
  'Hạ tầng': ['Hạ tầng độc quyền', 'Hết Port', 'Tuyến cáp xa, không kéo được', 'Không xin được phép cắt đường'],
  'Phương án thi công': ['Phải khoan tường khách không chịu', 'Khách không cho kéo cáp lộ'],
  'Sale': ['Tư vấn sai giá', 'Nghi ngờ hợp đồng ảo trục lợi', 'Tranh chấp đơn hàng giữa 2 Sale'],
  'Chưa lên PTC': ['Quá hạn chưa khảo sát', 'Chưa liên hệ được khách khảo sát'],
};

const salesChannels = ['Online (Web/App)', 'Telesale', 'D2D (Đi thị trường)', 'Đại lý'];
const paymentMethods = ['Thanh toán COD', 'Chuyển khoản trực tiếp', 'Qua MoMo', 'Visa/MasterCard'];

function randomDate(month: number): string {
  const day = Math.floor(Math.random() * 28) + 1;
  const d = new Date(2024, month - 1, day);
  return d.toISOString().split('T')[0];
}

function generateMockData(): CancellationData[] {
  const data: CancellationData[] = [];
  const basePrepaid = [0, 500000, 1000000, 1500000, 2000000];

  for (let i = 0; i < 800; i++) {
    const monthInt = [3, 4, 5][Math.floor(Math.random() * 3)];
    const month = `Tháng ${monthInt}`;
    
    const region = regions[Math.floor(Math.random() * regions.length)];
    const validBranches = branchesByRegion[region];
    const branch = validBranches[Math.floor(Math.random() * validBranches.length)];
    
    const servicePackage = servicePackages[Math.floor(Math.random() * servicePackages.length)];
    const prepaidAmount = basePrepaid[Math.floor(Math.random() * basePrepaid.length)];
    
    // Weight the groups to make it realistic (82% KH)
    const randCause = Math.random();
    let causeGroup = 'Khách hàng';
    if (randCause > 0.82) causeGroup = 'Hạ tầng';
    if (randCause > 0.90) causeGroup = 'Sale';
    if (randCause > 0.95) causeGroup = 'Phương án thi công';
    if (randCause > 0.98) causeGroup = 'Chưa lên PTC';

    const detailedReasons = reasonsByGroup[causeGroup];
    let detailedReason = detailedReasons[Math.floor(Math.random() * detailedReasons.length)];
    
    const salesChannel = salesChannels[Math.floor(Math.random() * salesChannels.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    const salesId = `S_` + Math.floor(Math.random() * 50 + 1000);
    const techIdPrefixes = ['BAOPV', 'HOANGNM', 'HUNG', 'TUANNA', 'TUNG'];
    const bCode = branch.split(' ').pop()?.toUpperCase() || 'BDG';
    const techId = `${bCode}01.${techIdPrefixes[Math.floor(Math.random() * techIdPrefixes.length)]}_${Math.floor(Math.random() * 99)}`;

    data.push({
      id: `HD${10000 + i}`,
      cancelDate: randomDate(monthInt),
      month,
      region,
      branch,
      servicePackage,
      prepaidAmount,
      causeGroup,
      detailedReason,
      salesRepId: salesId,
      salesRepName: `Nhân viên ${salesId.split('_')[1]}`,
      salesDept: `Phòng KD ${Math.floor(Math.random() * 5 + 1)}`,
      salesChannel,
      paymentMethod,
      techId,
    });
  }
  
  // Sort by date ascending
  data.sort((a, b) => new Date(a.cancelDate).getTime() - new Date(b.cancelDate).getTime());
  
  return data;
}

export const MOCK_DATA = generateMockData();
