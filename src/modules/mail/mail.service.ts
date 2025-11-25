import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendReport(emailTo: string, pdfBuffer: Buffer, monthName: string) {
    try {
      await this.mailerService.sendMail({
        to: emailTo,
        subject: `📊 Reporte de Comisiones - ${monthName}`,
        html: `
          <h3>Hola!</h3>
          <p>Adjunto encontrarás el reporte de comisiones generado automáticamente.</p>
          <p>Por favor revisa el PDF adjunto.</p>
          <br>
          <small>Sistema automático del Hotel</small>
        `,
        attachments: [
          {
            filename: `Reporte_${monthName}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Email enviado exitosamente a ${emailTo}`);
    } catch (error) {
      this.logger.error('Error enviando email', error);
      throw error;
    }
  }
}