import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { CloudbedsModule } from './modules/cloudbeds/cloudbeds.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MailModule } from './modules/mail/mail.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Carpeta donde guardaremos el HTML
    }),
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
   
    ScheduleModule.forRoot(),
    
   
    AuthModule,
    CloudbedsModule,
    ReportsModule,
    MailModule,
  ],
})
export class AppModule {}