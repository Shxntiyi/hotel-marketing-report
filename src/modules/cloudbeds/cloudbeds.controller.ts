import { Controller, Get, Query } from '@nestjs/common';
import { CloudbedsService } from './cloudbeds.service';

@Controller('cloudbeds')
export class CloudbedsController {
  constructor(private readonly cloudbedsService: CloudbedsService) {}

  @Get('test-reservations')
  async test(@Query('from') from: string, @Query('to') to: string) {
    // Ejemplo de uso: /cloudbeds/test-reservations?from=2023-10-01&to=2023-10-31
    return this.cloudbedsService.getReservationsByCheckOut(from, to);
  }
}