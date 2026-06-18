export interface CancellationData {
  id: string;
  cancelDate: string; // YYYY-MM-DD
  month: string;
  region: string;
  branch: string;
  servicePackage: string;
  prepaidAmount: number;
  causeGroup: string;
  detailedReason: string;
  salesRepId: string;
  salesRepName: string;
  salesDept: string;
  salesChannel: string;
  paymentMethod: string;
  techId?: string;
}

export interface FilterState {
  month: string;
  region: string;
  branch: string;
  servicePackage: string;
}
