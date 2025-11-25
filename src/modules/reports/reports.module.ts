import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service'; // <--- Importar
import { ReportsController } from './reports.controller';
import { CloudbedsModule } from '../cloudbeds/cloudbeds.module';

@Module({
  imports: [CloudbedsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService, 
    ReportPdfService // <--- Agregar a providers
  ], 
})
export class ReportsModule {}