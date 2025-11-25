import { Controller, Get, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // 1. Ruta para iniciar el proceso: GET /auth/login
    @Get('login')
    login(@Res() res: Response) {
        const url = this.authService.getAuthotizationUrl();
        // Redirigimos al usuario a la web de Cloudbeds
        return res.redirect(url);
    }

    // 2. Ruta de retorno: GET /auth/callback
    @Get('callback')
    async callback(@Query('code') code: string) {
        if (!code) {
            return 'Error: No se recibió ningún código de autorización.';
        }

        await this.authService.exchangeCodeForToken(code);

        return `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: green;">¡Conexión Exitosa!</h1>
          <p>Los tokens se han guardado correctamente en el servidor.</p>
          <p>Ya puedes cerrar esta ventana y el sistema generará los reportes automáticamente.</p>
        </body>
      </html>
    `;
    }
}