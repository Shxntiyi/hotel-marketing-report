import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          // 1. Usamos el servicio predefinido (maneja puertos y seguridad solo)
          service: 'gmail', 
          
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
          
          // 2. ESTA ES LA CLAVE DEL ARREGLO:
          // Forzamos el uso de IPv4. Node a veces intenta IPv6 en la nube y falla.
          family: 4, 
          
          // Opciones extra de seguridad
          ignoreTLS: false,
          secure: true, 
          pool: true, // Reutiliza conexiones para ser más eficiente
        },
        defaults: {
          from: `"Reportes Hotel" <${config.get('MAIL_USER')}>`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}