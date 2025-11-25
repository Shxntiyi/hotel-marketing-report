import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit-table';
import { MonthlyReport } from './interfaces/report.interface';

@Injectable()
export class ReportPdfService {

    // YA NO RECIBE "res" (Response), AHORA DEVUELVE UN BUFFER
    async generatePdf(report: MonthlyReport): Promise<Buffer> {
        return new Promise((resolve, reject) => {

            const pdf = new PDFDocument({
                margin: 50,
                size: 'A4',
                bufferPages: true
            });

            // Capturamos los datos en un buffer en memoria
            const chunks: Buffer[] = [];
            pdf.on('data', (chunk) => chunks.push(chunk));
            pdf.on('end', () => {
                const result = Buffer.concat(chunks);
                resolve(result);
            });
            pdf.on('error', (err) => reject(err));

            // --- AQUÍ EMPIEZA EL DISEÑO (IGUAL QUE ANTES) ---

            // 1. CABECERA
            pdf.fillColor('#6366f1').fontSize(20).text('INFORME DE COMISIONES', { align: 'left' }).moveDown(0.2);
            pdf.fillColor('#6b7280').fontSize(10).text(`Generado el: ${new Date().toLocaleDateString()}`, { align: 'left' });
            pdf.moveDown(2);

            // 2. TARJETAS
            this.drawSummaryCard(pdf, 50, 130, 'VENTAS TOTALES', `$${report.totalSales.toFixed(2)}`, '#10b981');
            this.drawSummaryCard(pdf, 200, 130, 'TU COMISIÓN (5%)', `$${report.totalCommission.toFixed(2)}`, '#6366f1');
            this.drawSummaryCard(pdf, 350, 130, 'RESERVAS', `${report.items.length}`, '#1f2937');
            pdf.moveDown(6);

            // 3. TABLA
            pdf.fillColor('#1f2937').fontSize(12).text(`Detalle de Reservas: ${report.period}`, { align: 'left' });
            pdf.moveDown(1);

            const table = {
                title: '',
                headers: [
                { label: 'ID', property: 'id', width: 70 }, // Reducimos un poco
                { label: 'FUENTE', property: 'source', width: 90 }, // <--- NUEVA COLUMNA
                { label: 'HUÉSPED', property: 'guest', width: 130 },
                { label: 'CHECK-OUT', property: 'checkout', width: 60 },
                { label: 'TOTAL', property: 'total', width: 70, align: 'right' },
                { label: 'COMISIÓN', property: 'commission', width: 70, align: 'right' },
                ],
                datas: report.items.map(item => ({
                id: item.reservationId,
                source: item.source, // <--- Mapeamos el dato
                guest: item.guestName,
                checkout: item.checkOut,
                total: `$${item.grandTotal.toFixed(2)}`,
                commission: `$${item.commission.toFixed(2)}`,
                })),
            };

            // Nota: Como estamos dentro de una Promise, el await de la tabla debe manejarse con cuidado
            // pdfkit-table a veces no soporta await dentro de flujos síncronos de buffer, 
            // pero probemos así. Si falla, quitamos el await y usamos callback.
            pdf.table(table, {
                width: 490,
                x: 50,
                prepareHeader: () => pdf.font('Helvetica-Bold').fontSize(9).fillColor('#374151'),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    pdf.font('Helvetica').fontSize(9).fillColor('#4b5563');
                    if (indexRow !== undefined && indexRow % 2 !== 0) (pdf as any).addBackground(rectRow, '#f9fafb', 0.5);
                    return pdf;
                },
            }).then(() => {
                // FOOTER Y FIN
                pdf.fontSize(8).fillColor('#9ca3af').text('Reporte oficial.', 50, 750, { align: 'center', width: 500 });
                pdf.end(); // ¡IMPORTANTE! Aquí cerramos el PDF
            });
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