import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { MailService } from '../mail/mail.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService,
    private readonly mailService: MailService
  ) { }

  // Descargar PDF manualmente (Por mes)
  @Get('download')
  async downloadReport(
    @Query('month') month: number,
    @Query('year') year: number,
    @Res() res: Response
  ) {
    const data = await this.reportsService.generateMonthlyReport(year, month);
    const pdfBuffer = await this.reportPdfService.generatePdf(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Reporte.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  // Forzar envío de email (Por mes)
  @Get('send-email')
  async sendEmailReport(
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('email') email: string
  ) {
    const data = await this.reportsService.generateMonthlyReport(year, month);
    const pdfBuffer = await this.reportPdfService.generatePdf(data);

    await this.mailService.sendReport(email, pdfBuffer, data.period);

    return { success: true, message: `Reporte enviado a ${email}` };
  }
}