import { Controller, Get, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import { ReportPdfService } from './report-pdf.service';
import { MailService } from '../mail/mail.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService,
    private readonly mailService: MailService
  ) { }

  @Get('preview')
  async getPreview(@Query('month') month: number, @Query('year') year: number) {
    // Ejemplo: /reports/preview?month=11&year=2024
    return this.reportsService.generateMonthlyReport(year, month);
  }

  @Get('download')
  async downloadReport(
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response
  ) {
    // 1. Obtener datos crudos
    const data = await this.reportsService.generateMonthlyReport(year, month);

    // 2. Generar PDF (ahora devuelve un Buffer)
    const buffer = await this.reportPdfService.generatePdf(data);

    // 3. Configurar headers y enviar respuesta
    const fileName = `Reporte_${data.period.replace(' ', '_')}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }

  @Get('send-email')
  async sendEmailReport(
    @Query('month') month: number, 
    @Query('year') year: number,
    @Query('email') email: string // A quien se lo enviamos
  ) {
    const data = await this.reportsService.generateMonthlyReport(year, month);
    const pdfBuffer = await this.reportPdfService.generatePdf(data);
    
    // Enviamos el correo
    await this.mailService.sendReport(email, pdfBuffer, data.period);

    return { success: true, message: `Reporte enviado a ${email}` };
  }
}