import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('preview')
  async getPreview(@Query('month') month: number, @Query('year') year: number) {
    // Ejemplo: /reports/preview?month=11&year=2024
    return this.reportsService.generateMonthlyReport(year, month);
  }
}