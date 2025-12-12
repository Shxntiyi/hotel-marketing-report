import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587, // Puerto para STARTTLS
          secure: false, // false para puerto 587, true para 465
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
          tls: {
            rejectUnauthorized: false, // Para evitar problemas con certificados en la nube
          },
          // Timeouts aumentados para conexiones lentas
          connectionTimeout: 60000, // 60 segundos
          greetingTimeout: 30000,   // 30 segundos
          socketTimeout: 60000,     // 60 segundos
          
          // Forzar IPv4
          family: 4,
          
          // Pool de conexiones
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
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