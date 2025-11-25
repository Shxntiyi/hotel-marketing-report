export interface ReportItem {
  reservationId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  source: string;
  subtotal: number; // Monto base sin impuestos (usualmente sobre esto se cobra comisión)
  grandTotal: number; // Monto total con impuestos
  commission: number; // El 5%
}

export interface MonthlyReport {
  period: string; // Ej: "Noviembre 2024"
  generatedAt: Date;
  items: ReportItem[];
  totalSales: number;
  totalCommission: number;
}