import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

// Activamos plugin para manejar semanas correctamente
dayjs.extend(isoWeek);

@Injectable()
export class ReportsCron {
  private readonly logger = new Logger(ReportsCron.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfService: ReportPdfService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  // 1. REPORTE MENSUAL (Día 1 de cada mes a las 08:00 AM)
  @Cron('0 8 1 * *') 
  async handleMonthlyReport() {
    this.logger.log('📅 Ejecutando Reporte MENSUAL...');
    
    const lastMonth = dayjs().subtract(1, 'month');
    const start = lastMonth.startOf('month').format('YYYY-MM-DD');
    const end = lastMonth.endOf('month').format('YYYY-MM-DD');
    const title = `REPORTE MENSUAL - ${lastMonth.format('MMMM YYYY')}`;

    await this.processAndSend(start, end, title);
  }

  // 2. REPORTE SEMANAL (Cada Lunes a las 07:00 AM)
  @Cron('0 7 * * 1') 
  async handleWeeklyReport() {
    this.logger.log('📈 Ejecutando Reporte SEMANAL...');

    // Calculamos la semana pasada completa (Lunes a Domingo)
    const lastWeek = dayjs().subtract(1, 'week');
    const start = lastWeek.startOf('isoWeek').format('YYYY-MM-DD');
    const end = lastWeek.endOf('isoWeek').format('YYYY-MM-DD');
    const title = `REPORTE SEMANAL - ${start} al ${end}`;

    await this.processAndSend(start, end, title);
  }

  // Helper para generar y enviar
  private async processAndSend(start: string, end: string, title: string) {
    try {
      const reportData = await this.reportsService.generateReportByDates(start, end, title);
      const pdfBuffer = await this.pdfService.generatePdf(reportData);
      const targetEmail = this.configService.get('MAIL_TO'); 
      
      await this.mailService.sendReport(targetEmail, pdfBuffer, title);
      this.logger.log(`✅ ${title} enviado correctamente a ${targetEmail}`);

    } catch (error) {
      this.logger.error(`❌ Error en ${title}`, error);
    }
  }
}