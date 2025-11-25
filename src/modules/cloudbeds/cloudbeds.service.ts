import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CloudbedsService {
  private readonly logger = new Logger(CloudbedsService.name);
  private readonly apiUrl = 'https://hotels.cloudbeds.com/api/v1.1';

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Obtiene las reservas basadas en fecha de Check-out (Recomendado para pagar comisiones)
   * @param startDate Formato YYYY-MM-DD
   * @param endDate Formato YYYY-MM-DD
   */
  async getReservationsByCheckOut(startDate: string, endDate: string) {
    const endpoint = '/getReservations';
    
    // Parámetros oficiales de Cloudbeds
    const params = {
      property_id: await this.getPropertyId(), // Opcional si el token es de una sola propiedad, pero bueno tenerlo
      status: 'checked_out', // Solo cobramos lo que ya se consumió
      checkout_from: startDate,
      checkout_to: endDate,
      limit: 100, // Paginación (para el MVP asumimos menos de 100 al mes, si son más hay que iterar)
      page: 1
    };

    return this.makeRequest('GET', endpoint, params);
  }

  /**
   * Método genérico para hacer peticiones re-intentando si el token expiró
   */
  private async makeRequest(method: string, endpoint: string, params: any = {}) {
    try {
      // 1. Obtener token actual
      let token = await this.authService.getValidAccessToken();

      // 2. Configurar Headers
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: method === 'GET' ? params : undefined
      };

      // 3. Hacer la petición
      const url = `${this.apiUrl}${endpoint}`;
      const response = await lastValueFrom(this.httpService.get(url, config));
      
      return response.data;

    } catch (error) {
      // 4. Manejo de Token Expirado (401)
      if (error.response?.status === 401) {
        this.logger.warn('Token expirado. Intentando refrescar...');
        
        // Refrescamos el token
        await this.authService.refreshToken();
        
        // Reintentamos la operación recursivamente (una sola vez)
        return this.makeRequest(method, endpoint, params);
      }

      this.logger.error(`Error en Cloudbeds API [${endpoint}]`, error.response?.data || error.message);
      throw new HttpException('Error conectando con Cloudbeds', error.response?.status || 500);
    }
  }

  // Helper opcional para obtener ID de la propiedad si no lo tienes en .env
  private async getPropertyId() {
    // Para simplificar, podrías ponerlo en el .env si lo sabes, 
    // si no, la API suele responder sin él si el usuario solo tiene un hotel.
    return undefined; 
  }

  async getReservationDetails(reservationId: string) {
  return this.makeRequest('GET', '/getReservation', { reservationID: reservationId });
}
}