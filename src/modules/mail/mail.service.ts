import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
    try {
      const attachmentsFormatted = attachments?.map(att => ({
        filename: att.filename,
        content: att.content, // Buffer o base64
      }));

      const { data, error } = await this.resend.emails.send({
        from: 'Reportes Hotel <onboarding@resend.dev>', // Usa tu dominio verificado
        to: [to],
        subject: subject,
        html: html,
        attachments: attachmentsFormatted,
      });

      if (error) {
        this.logger.error('Error enviando email con Resend', error);
        throw error;
      }

      this.logger.log(`Email enviado exitosamente a ${to}`);
      return data;
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }
}