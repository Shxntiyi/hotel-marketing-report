import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY no configurada');
    } else {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid configurado correctamente');
    }
  }

  async sendReport(email: string, pdfBuffer: Buffer, period: string) {
    try {
      this.logger.log(`Intentando enviar reporte a ${email}`);

      const msg = {
        to: email,
        from: this.configService.get('SENDGRID_FROM_EMAIL'), // Email verificado en SendGrid
        subject: `Reporte Mensual - ${period}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reporte Mensual del Hotel</h2>
            <p>Adjunto encontrarás el reporte correspondiente al período: <strong>${period}</strong></p>
            <p style="margin-top: 20px;">Saludos cordiales,<br/>Sistema de Reportes</p>
          </div>
        `,
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `Reporte-${period}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      };

      await sgMail.send(msg);
      this.logger.log(`Email enviado exitosamente a ${email}`);
      
      return { success: true, message: `Email enviado a ${email}` };
    } catch (error) {
      this.logger.error('Error enviando email', error.response?.body || error);
      throw error;
    }
  }

  // Método genérico por si lo necesitas
  async sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
    try {
      const attachmentsFormatted = attachments?.map(att => ({
        content: att.content.toString('base64'),
        filename: att.filename,
        type: att.contentType || 'application/pdf',
        disposition: 'attachment',
      }));

      const msg = {
        to: to,
        from: this.configService.get('SENDGRID_FROM_EMAIL'),
        subject: subject,
        html: html,
        attachments: attachmentsFormatted,
      };

      await sgMail.send(msg);
      this.logger.log(`Email enviado exitosamente a ${to}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }
}