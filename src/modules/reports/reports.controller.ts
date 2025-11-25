import { Controller, Get, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import { ReportPdfService } from './report-pdf.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportPdfService: ReportPdfService
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
    @Res() res: Response // Necesario para enviar el archivo
  ) {
    // 1. Obtener datos crudos
    const data = await this.reportsService.generateMonthlyReport(year, month);

    // 2. Generar PDF y enviarlo al stream de respuesta
    return this.reportPdfService.generatePdf(data, res);
  }
}