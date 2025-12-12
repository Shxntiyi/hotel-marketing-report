import { Injectable, Logger } from '@nestjs/common';
import { CloudbedsService } from '../cloudbeds/cloudbeds.service';
import { MonthlyReport, ReportItem } from './interfaces/report.interface';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  // CONFIGURACIÓN: Lista exacta de fuentes que usa tu cliente
  private readonly TARGET_SOURCES = [
    'Google ADS',
    'Facebook ADS',
    'Social',
    'Google Hotel Ads',
    'Google',
    'Instagram',
    'Facebook'
  ];
  
  private readonly COMMISSION_RATE = 0.05; // 5%

  constructor(private readonly cloudbedsService: CloudbedsService) {}

  // 1. MÉTODO PRINCIPAL (Por fechas personalizadas)
  async generateReportByDates(startDate: string, endDate: string, titlePeriod: string): Promise<MonthlyReport> {
    
    this.logger.log(`Generando reporte rango: ${startDate} al ${endDate}`);

    // Obtenemos el listado general (Resumen)
    const response = await this.cloudbedsService.getReservationsByCheckOut(startDate, endDate);
    const allReservations = response.data || [];

    const reportItems: ReportItem[] = [];
    let totalSales = 0;
    let totalCommission = 0;

    for (const res of allReservations) {
      
      const currentSource = res.sourceName || 'Direct';

      // Verificamos si la fuente está en nuestra lista permitida
      if (this.TARGET_SOURCES.includes(currentSource)) {
        
        try {
            // Pedimos el detalle financiero completo
            const detailResponse = await this.cloudbedsService.getReservationDetails(res.reservationID);
            const fullDetails = detailResponse.data || {};

            // Buscamos el dinero (total global o suma de habitaciones)
            let reservationTotal = 0;

            if (fullDetails.total && parseFloat(fullDetails.total) > 0) {
               reservationTotal = parseFloat(fullDetails.total);
            } 
            else if (fullDetails.rooms && Array.isArray(fullDetails.rooms)) {
               reservationTotal = fullDetails.rooms.reduce((sum, room) => {
                 return sum + parseFloat(room.total || '0');
               }, 0);
            }

            const commission = reservationTotal * this.COMMISSION_RATE;

            const item: ReportItem = {
              reservationId: res.reservationID,
              guestName: res.guestName,
              checkIn: res.startDate,
              checkOut: res.endDate,
              source: currentSource, // Guardamos si fue FB, Google, etc.
              subtotal: reservationTotal,
              grandTotal: reservationTotal,
              commission: commission
            };

            reportItems.push(item);
            totalSales += reservationTotal;
            totalCommission += commission;

        } catch (error) {
            this.logger.error(`Error procesando reserva ${res.reservationID}`, error.message);
        }
      }
    }

    return {
      period: titlePeriod,
      generatedAt: new Date(),
      items: reportItems,
      totalSales,
      totalCommission
    };
  }

  // 2. MÉTODO WRAPPER (Para compatibilidad con endpoints mensuales manuales)
  async generateMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
    const periodTitle = dayjs(`${year}-${month}-01`).format('MMMM YYYY');

    return this.generateReportByDates(startDate, endDate, periodTitle);
  }
}