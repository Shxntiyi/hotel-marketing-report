import { Injectable, Logger } from '@nestjs/common';
import { CloudbedsService, LogStream } from '../cloudbeds/cloudbeds.service'; // Importamos LogStream
import { MonthlyReport, ReportItem } from './interfaces/report.interface';
import dayjs from 'dayjs';

// Helper para pausas
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  // CONFIGURACIÓN: Solo rastreamos el Motor de Reservas (Web)
  private readonly TARGET_SOURCES = [
    'Website',
    'Website/Booking Engine',
    'Web' 
  ];
  
  private readonly COMMISSION_RATE = 0.05; // 5%

  constructor(private readonly cloudbedsService: CloudbedsService) {}

  // Helper para enviar logs a la consola web
  private logToWeb(msg: string) {
    this.logger.log(msg);
    LogStream.next(msg);
  }

  // 1. MÉTODO PRINCIPAL OPTIMIZADO
  async generateReportByDates(startDate: string, endDate: string, titlePeriod: string): Promise<MonthlyReport> {
    
    this.logToWeb(`📊 Generando reporte de ventas WEB: ${startDate} al ${endDate}`);

    // PASO 1: Descarga Masiva (Ya optimizada)
    const response = await this.cloudbedsService.getReservationsByCheckOut(startDate, endDate);
    const allReservations = response.data || [];

    // PASO 2: Filtrado en Memoria (Identificar candidatos)
    this.logToWeb(`🔍 Analizando ${allReservations.length} reservas para detectar ventas Web...`);
    
    const webCandidates = allReservations.filter(res => {
        const sourceName = (res.sourceName || '').toLowerCase();
        return sourceName.includes('website') || 
               sourceName.includes('booking engine') ||
               this.TARGET_SOURCES.some(s => s.toLowerCase() === sourceName);
    });

    this.logToWeb(`✅ Se encontraron ${webCandidates.length} reservas Web potenciales. Obteniendo detalles financieros...`);

    const reportItems: ReportItem[] = [];
    let totalSales = 0;
    let totalCommission = 0;

    // PASO 3: Procesamiento por Lotes (Batching) para los Detalles
    // Esto evita procesar 1 por 1 y tardar horas.
    const BATCH_SIZE = 10; // Procesamos 10 reservas simultáneas
    const DELAY = 500;     // 0.5 segundos de descanso entre lotes

    for (let i = 0; i < webCandidates.length; i += BATCH_SIZE) {
        const batch = webCandidates.slice(i, i + BATCH_SIZE);
        const currentProgress = Math.min(i + BATCH_SIZE, webCandidates.length);
        
        // Log de progreso cada cierto tiempo para no saturar
        this.logToWeb(`💸 Procesando finanzas: ${currentProgress} / ${webCandidates.length}...`);

        // Ejecutamos el lote en paralelo
        const batchPromises = batch.map(async (res) => {
            try {
                // Pedimos el detalle financiero
                const detailResponse = await this.cloudbedsService.getReservationDetails(res.reservationID);
                const fullDetails = detailResponse.data || {};

                let reservationTotal = 0;

                // Prioridad 1: Total global de la reserva
                if (fullDetails.total && parseFloat(fullDetails.total) > 0) {
                   reservationTotal = parseFloat(fullDetails.total);
                } 
                // Prioridad 2: Suma de habitaciones
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
                  source: 'Página Web',
                  subtotal: reservationTotal,
                  grandTotal: reservationTotal,
                  commission: commission
                };

                return item;

            } catch (error) {
                this.logger.error(`Error procesando reserva ${res.reservationID}`, error.message);
                return null; // Retornamos null si falla para filtrarlo después
            }
        });

        // Esperamos a que termine el lote
        const results = await Promise.all(batchPromises);

        // Guardamos los resultados válidos
        results.forEach(item => {
            if (item) {
                reportItems.push(item);
                totalSales += item.grandTotal;
                totalCommission += item.commission;
            }
        });

        // Pausa para respetar Rate Limits
        if (i + BATCH_SIZE < webCandidates.length) {
            await sleep(DELAY);
        }
    }

    this.logToWeb(`✅ Procesamiento finalizado. Total Ventas Web: $${totalSales.toFixed(2)}`);

    return {
      period: titlePeriod,
      generatedAt: new Date(),
      items: reportItems,
      totalSales,
      totalCommission
    };
  }

  // 2. MÉTODO WRAPPER (Mensual)
  async generateMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
    const periodTitle = dayjs(`${year}-${month}-01`).format('MMMM YYYY');

    return this.generateReportByDates(startDate, endDate, periodTitle);
  }

  // 3. Método de Diagnóstico
  async getSourcesSummary(startDate: string, endDate: string) {
      const response = await this.cloudbedsService.getReservationsByCheckOut(startDate, endDate);
      const allReservations = response.data || [];
      const sourceCounts = {};
      
      allReservations.forEach(res => {
          const s = res.sourceName || 'Direct / Sin Fuente';
          sourceCounts[s] = (sourceCounts[s] || 0) + 1;
      });
      
      return { total: allReservations.length, counts: sourceCounts };
  }
}