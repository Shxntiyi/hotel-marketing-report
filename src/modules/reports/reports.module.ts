import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportPdfService } from './report-pdf.service';
import { ReportsController } from './reports.controller';
import { CloudbedsModule } from '../cloudbeds/cloudbeds.module';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import { ReportsCron } from './reports.cron';

@Module({
  imports: [CloudbedsModule, MailModule],
  controllers: [ReportsController],
  providers: [
    ReportsService, 
    ReportPdfService,
    MailService,
    ReportsCron
  ], 
})
export class ReportsModule {}