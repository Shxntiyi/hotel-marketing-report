import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { CloudbedsModule } from '../cloudbeds/cloudbeds.module'; // Importante

@Module({
  imports: [CloudbedsModule], // Traemos el módulo que exporta CloudbedsService
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}