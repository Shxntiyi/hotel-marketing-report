import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
// import { CloudbedsModule } from './modules/cloudbeds/cloudbeds.module';
// import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
   
    ScheduleModule.forRoot(),
    
   
    AuthModule,
    // CloudbedsModule,
    // ReportsModule,
  ],
})
export class AppModule {}