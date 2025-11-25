import { Injectable, Logger } from '@nestjs/common';
import { CloudbedsService } from '../cloudbeds/cloudbeds.service';
import { MonthlyReport, ReportItem } from './interfaces/report.interface';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    // CONFIGURACIÓN
    // Cuando termines las pruebas, cambia 'Walk-In' por el nombre real (ej: 'Agencia_Marketing')
     private readonly TARGET_SOURCES = [
    'Google ADS',
    'Google SEO Organico',
    'Social Media Organico',
    'Facebook ADS'
  ]; 
    private readonly COMMISSION_RATE = 0.05;

    constructor(private readonly cloudbedsService: CloudbedsService) { }

    async generateMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
        // 1. Definir rango de fechas (Inicio y Fin de mes)
        const startDate = dayjs(`${year}-${month}-01`).format('YYYY-MM-DD');
        const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

        this.logger.log(`Generando reporte para: ${startDate} al ${endDate}`);

        // 2. Obtener lista de reservas (Resumen sin precios detallados)
        const response = await this.cloudbedsService.getReservationsByCheckOut(startDate, endDate);
        const allReservations = response.data || [];

        const reportItems: ReportItem[] = [];
        let totalSales = 0;
        let totalCommission = 0;

        // 3. Iterar y filtrar
        for (const res of allReservations) {

            const currentSource = res.sourceName || 'Direct';

            // Si coincide con nuestra fuente objetivo...
            if (this.TARGET_SOURCES.includes(currentSource)) {

                try {
                    // 4. ¡MAGIA! Pedimos el detalle completo para obtener el PRECIO REAL
                    // Esta llamada es necesaria porque el endpoint de lista devuelve total: 0
                    const detailResponse = await this.cloudbedsService.getReservationDetails(res.reservationID);
                    const fullDetails = detailResponse.data || {};

                    // 5. Extraer el monto total (Cloudbeds suele mandarlo como string o number)
                    const rawTotal = fullDetails.total || fullDetails.grandTotal || '0';
                    const amount = parseFloat(rawTotal.toString());

                    const commission = amount * this.COMMISSION_RATE;

                    const item: ReportItem = {
                        reservationId: res.reservationID,
                        guestName: res.guestName,
                        checkIn: res.startDate,
                        checkOut: res.endDate,
                        source: currentSource,
                        subtotal: amount,     // Monto real obtenido del detalle
                        grandTotal: amount,   // Monto real obtenido del detalle
                        commission: commission
                    };

                    reportItems.push(item);
                    totalSales += amount;
                    totalCommission += commission;

                } catch (error) {
                    this.logger.error(`Error obteniendo precio para reserva ${res.reservationID}:`, error.message);
                }
            }
        }

        // 6. Retornar reporte final
        return {
            period: dayjs(`${year}-${month}-01`).format('MMMM YYYY'),
            generatedAt: new Date(),
            items: reportItems,
            totalSales,
            totalCommission
        };
    }
}