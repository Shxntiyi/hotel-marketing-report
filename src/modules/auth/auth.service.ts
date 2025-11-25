import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly tokensFile = path.join(process.cwd(), 'tokens.json');

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    getAuthotizationUrl(): string {
        const clientId = this.configService.get<string>('CLOUDBEDS_CLIENT_ID') || '';
        const redirectUri = this.configService.get<string>('CLOUDBEDS_REDIRECT_URI') || '';
        const baseUrl = 'https://hotels.cloudbeds.com/api/v1.1/oauth';

        const scope = 'read:reservation read:room read:rate';

        return `${baseUrl}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    }

    async exchangeCodeForToken(code: string) {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', this.configService.get('CLOUDBEDS_CLIENT_ID') || '');
        params.append('client_secret', this.configService.get('CLOUDBEDS_CLIENT_SECRET') || '');
        params.append('redirect_uri', this.configService.get('CLOUDBEDS_REDIRECT_URI') || '');

        try {
            const response = await lastValueFrom(
                this.httpService.post('https://hotels.cloudbeds.com/api/v1.1/access_token', params)
            );

            // Guardamos los tokens en archivo
            this.saveTokens(response.data);
            return response.data;

        } catch (error) {
            this.logger.error('Error intercambiando token', error.response?.data || error.message);
            throw new HttpException('Error autenticando con Cloudbeds', HttpStatus.BAD_REQUEST);
        }
    }

    async getValidAccessToken(): Promise<string> {
        const tokens = this.loadTokens();
        if (!tokens) throw new Error('No hay tokens guardados. Por favor inicia sesión primero.');
        return tokens.access_token;
    }

    async refreshToken() {
        const tokens = this.loadTokens();
        if (!tokens || !tokens.refresh_token) throw new Error('No hay refresh token disponible');

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', tokens.refresh_token);
        params.append('client_id', this.configService.get('CLOUDBEDS_CLIENT_ID') || '');
        params.append('client_secret', this.configService.get('CLOUDBEDS_CLIENT_SECRET') || '');

        try {
            const response = await lastValueFrom(
                this.httpService.post('https://hotels.cloudbeds.com/api/v1.1/access_token', params)
            );

            this.saveTokens(response.data);
            this.logger.log('Token refrescado exitosamente');
            return response.data.access_token;
        } catch (error) {
            this.logger.error('Error refrescando token', error.response?.data);
            throw new Error('No se pudo refrescar el token');
        }
    }

    private saveTokens(data: any) {
        const dataToSave = { ...data, saved_at: new Date().toISOString() };
        fs.writeFileSync(this.tokensFile, JSON.stringify(dataToSave, null, 2));
    }

    private loadTokens() {
        if (!fs.existsSync(this.tokensFile)) return null;
        const file = fs.readFileSync(this.tokensFile, 'utf8');
        return JSON.parse(file);
    }

}
