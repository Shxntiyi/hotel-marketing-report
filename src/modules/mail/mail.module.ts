import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'), // smtp.gmail.com
          secure: true, // true para puerto 465
          port: 465,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'), // App Password de Gmail
          },
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