import { Controller, Get, Query, Res, Sse } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { MailService } from '../mail/mail.service';
import { LogStream } from '../cloudbeds/cloudbeds.service';

export interface MessageEvent {
  data: string | object;
}

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService
  ) { }

  // 1. DESCARGAR PDF
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

  // 2. ENVIAR POR EMAIL
  @Get('send-email')
  async sendEmailReport(
    @Query('month') month: number, 
    @Query('year') year: number,
    @Query('email') email?: string 
  ) {
    const targetEmail = email || this.configService.get('MAIL_TO');

    if (!targetEmail) {
        return { success: false, message: 'Error: No hay destinatario configurado en .env ni en la URL' };
    }

    const data = await this.reportsService.generateMonthlyReport(year, month);
    const pdfBuffer = await this.reportPdfService.generatePdf(data);
    
    await this.mailService.sendReport(targetEmail, pdfBuffer, data.period);

    return { success: true, message: `Reporte enviado a ${targetEmail}` };
  }

  // 3. EVENTOS EN VIVO (CONSOLA)
  @Sse('events')
  events(): Observable<MessageEvent> {
    return LogStream.asObservable().pipe(
      map((message) => ({ data: { message } }))
    );
  }
}