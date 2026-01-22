import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit-table';
import { MonthlyReport } from './interfaces/report.interface';

@Injectable()
export class ReportPdfService {
    private readonly logger = new Logger(ReportPdfService.name);

    async generatePdf(report: MonthlyReport): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            
            // 1. Configuración del Documento
            const pdf = new PDFDocument({
                margin: 50,
                size: 'A4',
                bufferPages: true,
                autoFirstPage: true
            });

            // 2. Captura de datos en memoria (Buffer)
            const chunks: Buffer[] = [];
            pdf.on('data', (chunk) => chunks.push(chunk));
            pdf.on('end', () => {
                const result = Buffer.concat(chunks);
                resolve(result);
            });
            pdf.on('error', (err) => {
                this.logger.error('Error generando PDF', err);
                reject(err);
            });

            // 3. Diseño del Reporte
            try {
                // Cabecera
                pdf.fillColor('#6366f1').fontSize(20).text('INFORME DE COMISIONES', { align: 'left' }).moveDown(0.2);
                pdf.fillColor('#6b7280').fontSize(10).text(`Generado el: ${new Date().toLocaleDateString()}`, { align: 'left' });
                pdf.moveDown(2);

                // Tarjetas de Resumen
                // Usamos Number() y || 0 para evitar errores si llega null
                this.drawSummaryCard(pdf, 50, 130, 'VENTAS TOTALES', `$${Number(report.totalSales || 0).toFixed(2)}`, '#10b981');
                this.drawSummaryCard(pdf, 200, 130, 'TU COMISIÓN (5%)', `$${Number(report.totalCommission || 0).toFixed(2)}`, '#6366f1');
                this.drawSummaryCard(pdf, 350, 130, 'RESERVAS', `${report.items.length}`, '#1f2937');
                pdf.moveDown(6);

                // Título de Tabla
                pdf.fillColor('#1f2937').fontSize(12).text(`Detalle de Reservas: ${report.period}`, { align: 'left' });
                pdf.moveDown(1);

                // Configuración de la Tabla
                const table = {
                    title: '',
                    headers: [
                        { label: 'ID', property: 'id', width: 70 },
                        { label: 'FUENTE', property: 'source', width: 90 },
                        { label: 'HUÉSPED', property: 'guest', width: 130 },
                        { label: 'CHECK-OUT', property: 'checkout', width: 60 },
                        { label: 'TOTAL', property: 'total', width: 70, align: 'right' },
                        { label: 'COMISIÓN', property: 'commission', width: 70, align: 'right' },
                    ],
                    datas: report.items.map(item => ({
                        id: String(item.reservationId),
                        source: String(item.source),
                        guest: String(item.guestName),
                        checkout: String(item.checkOut),
                        total: `$${Number(item.grandTotal || 0).toFixed(2)}`,
                        commission: `$${Number(item.commission || 0).toFixed(2)}`,
                    })),
                };

                // Si no hay datos, mostramos mensaje en vez de tabla vacía
                if (report.items.length === 0) {
                    pdf.fontSize(10).fillColor('#ef4444').text('No se encontraron reservas Web en este periodo.', { align: 'center' });
                } else {
                    // ¡CRÍTICO! Usamos await para esperar a que la tabla se termine de dibujar
                    await pdf.table(table, {
                        width: 490,
                        x: 50,
                        prepareHeader: () => pdf.font('Helvetica-Bold').fontSize(9).fillColor('#374151'),
                        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                            pdf.font('Helvetica').fontSize(9).fillColor('#4b5563');
                            // Fondo alternado para filas
                            if (indexRow !== undefined && indexRow % 2 !== 0 && rectRow) {
                                try {
                                    (pdf as any).addBackground(rectRow, '#f9fafb', 0.5);
                                } catch (e) {}
                            }
                            return pdf;
                        },
                    });
                }

                // Footer
                const pageHeight = pdf.page.height;
                pdf.fontSize(8).fillColor('#9ca3af').text('Reporte generado automáticamente.', 50, pageHeight - 50, { align: 'center', width: 500 });
                
                // Finalizamos el documento (Esto dispara el evento 'end' y resuelve la promesa)
                pdf.end();

            } catch (error) {
                this.logger.error('Error crítico en diseño PDF', error);
                reject(error);
            }
        });
    }

    private drawSummaryCard(doc: PDFDocument, x: number, y: number, title: string, value: string, accentColor: string) {
        doc.roundedRect(x, y, 130, 70, 8).fill('#f3f4f6');
        doc.roundedRect(x, y, 5, 70, 2).fill(accentColor);
        doc.fillColor('#6b7280').fontSize(8).text(title, x + 15, y + 15);
        doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text(value, x + 15, y + 35);
        doc.font('Helvetica');
    }
}