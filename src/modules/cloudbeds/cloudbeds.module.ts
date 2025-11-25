import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CloudbedsService } from './cloudbeds.service';
import { CloudbedsController } from './cloudbeds.controller';
import { AuthModule } from '../auth/auth.module'; 

@Module({
  imports: [
    HttpModule,
    AuthModule 
  ],
  controllers: [CloudbedsController],
  providers: [CloudbedsService],
  exports: [CloudbedsService]
})
export class CloudbedsModule {}