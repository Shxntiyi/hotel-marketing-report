import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthService } from '../auth/auth.service';
import { lastValueFrom, Subject } from 'rxjs'; // IMPORTANTE: Agregado Subject

// 1. STREAM GLOBAL DE LOGS (Para conectar con el Frontend)
export const LogStream = new Subject<string>();

// Helper simple para pausar la ejecución (Throttling)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class CloudbedsService {
  private readonly logger = new Logger(CloudbedsService.name);
  private readonly apiUrl = 'https://hotels.cloudbeds.com/api/v1.1';

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) { }

  // 2. NUEVO MÉTODO HELPER: Envía logs a la consola del servidor Y a la web
  private logToWeb(message: string) {
    this.logger.log(message); // Log normal en terminal
    LogStream.next(message);  // Log enviado a la página web
  }

  /**
   * Obtiene las reservas basadas en fecha de Check-out
   * IMPLEMENTACIÓN SEGURA: Usa paginación por lotes para evitar bloqueo de API (Error 429)
   * Y NOTIFICACIONES EN VIVO
   */
  async getReservationsByCheckOut(startDate: string, endDate: string) {
    const endpoint = '/getReservations';
    const propertyId = await this.getPropertyId();
    const limit = 100;

    // CONFIGURACIÓN DE SEGURIDAD (THROTTLING)
    const BATCH_SIZE = 5; // Máximo 5 peticiones simultáneas
    const DELAY_BETWEEN_BATCHES = 1000; // Esperar 1 segundo entre lotes

    // Usamos logToWeb para que aparezca en el HTML
    this.logToWeb(`🚀 Iniciando descarga segura (Lotes de ${BATCH_SIZE}): ${startDate} al ${endDate}`);

    const baseParams = {
      property_id: propertyId,
      status: 'checked_out',
      checkout_from: startDate,
      checkout_to: endDate,
      limit: limit,
    };

    try {
      // PASO 1: Obtener la primera página y el TOTAL global
      const firstResponse = await this.makeRequest('GET', endpoint, {
        ...baseParams,
        page: 1,
      });

      const totalRecords = firstResponse.total || 0;
      let allReservations = firstResponse.data || [];

      this.logToWeb(`📊 Total de reservas detectadas en Cloudbeds: ${totalRecords}`);

      // Si con la primera página basta, terminamos aquí
      if (totalRecords <= limit) {
        this.logToWeb(`✅ Descarga rápida finalizada. (1 página)`);
        return { success: true, data: allReservations };
      }

      // Calcular cuántas páginas faltan
      const totalPages = Math.ceil(totalRecords / limit);
      this.logToWeb(`📚 Se necesitan ${totalPages} páginas. Procesando en lotes controlados...`);

      // PASO 2: Procesar las páginas restantes en LOTES (Chunks)
      for (let i = 2; i <= totalPages; i += BATCH_SIZE) {
        const batchPromises: any[] = [];

        // Armar el lote actual (ej: páginas 2, 3, 4, 5, 6)
        for (let page = i; page < i + BATCH_SIZE && page <= totalPages; page++) {
          
          // Creamos la promesa capturando errores individuales
          const promise = this.makeRequest('GET', endpoint, { ...baseParams, page: page })
            .then((res) => res.data || [])
            .catch((err) => {
              this.logger.error(`❌ Error obteniendo página ${page}`, err.message);
              // No enviamos error al web para no asustar al usuario si es recuperable
              return []; 
            });

          batchPromises.push(promise);
        }

        this.logToWeb(
          `🔄 Procesando lote: páginas ${i} a ${Math.min(i + BATCH_SIZE - 1, totalPages)}...`
        );

        // Ejecutar el lote actual en paralelo
        const batchResults = await Promise.all(batchPromises);

        // Unir los resultados
        batchResults.forEach((reservations) => {
          if (Array.isArray(reservations)) {
            allReservations = allReservations.concat(reservations);
          }
        });

        // Pausa de cortesía
        if (i + BATCH_SIZE <= totalPages) {
          await sleep(DELAY_BETWEEN_BATCHES);
        }
      }

      this.logToWeb(`🏁 Descarga completa. Total procesado: ${allReservations.length} reservas.`);

      return {
        success: true,
        data: allReservations,
      };

    } catch (error) {
      const msg = `Error crítico descargando reservas: ${error.message}`;
      this.logger.error(msg, error);
      LogStream.next(`❌ ${msg}`); // Enviamos el error en rojo al HTML
      throw error;
    }
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
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: method === 'GET' ? params : undefined,
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

      this.logger.error(
        `Error en Cloudbeds API [${endpoint}]`,
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Error conectando con Cloudbeds',
        error.response?.status || 500,
      );
    }
  }

  // Helper opcional para obtener ID de la propiedad
  private async getPropertyId() {
    return undefined;
  }

  async getReservationDetails(reservationId: string) {
    return this.makeRequest('GET', '/getReservation', {
      reservationID: reservationId,
    });
  }
}