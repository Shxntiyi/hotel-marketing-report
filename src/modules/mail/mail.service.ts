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

  async sendReport(email: string, pdfBuffer: Buffer, period: string) {
    try {
      this.logger.log(`Intentando enviar reporte a ${email}`);

      const { data, error } = await this.resend.emails.send({
        from: 'Reportes Hotel <onboarding@resend.dev>', // Cambiar cuando tengas dominio verificado
        to: [email],
        subject: `Reporte Mensual - ${period}`,
        html: `
          <h2>Reporte Mensual del Hotel</h2>
          <p>Adjunto encontrarás el reporte correspondiente al período: <strong>${period}</strong></p>
          <p>Saludos cordiales,<br/>Sistema de Reportes</p>
        `,
        attachments: [
          {
            filename: `Reporte-${period}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (error) {
        this.logger.error('Error enviando email con Resend', error);
        throw error;
      }

      this.logger.log(`Email enviado exitosamente a ${email}`);
      return data;
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }

  // Método genérico por si lo necesitas
  async sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
    try {
      const attachmentsFormatted = attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
      }));

      const { data, error } = await this.resend.emails.send({
        from: 'Reportes Hotel <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html,
        attachments: attachmentsFormatted,
      });

      if (error) {
        this.logger.error('Error enviando email', error);
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