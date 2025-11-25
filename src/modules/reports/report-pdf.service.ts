import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit-table';
import { MonthlyReport } from './interfaces/report.interface';
import { Response } from 'express';

@Injectable()
export class ReportPdfService {

    async generatePdf(report: MonthlyReport, res: Response) {
        const pdf = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });

        const fileName = `Reporte_${report.period.replace(' ', '_')}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
        });
        pdf.pipe(res);

        // --- DISEÑO ---

        // 1. CABECERA
        pdf
            .fillColor('#6366f1')
            .fontSize(20)
            .text('INFORME DE COMISIONES', { align: 'left' })
            .moveDown(0.2);

        pdf
            .fillColor('#6b7280')
            .fontSize(10)
            .text(`Generado automáticamente el: ${new Date().toLocaleDateString()}`, { align: 'left' });

        pdf.moveDown(2);

        // 2. TARJETAS (Resumen)
        this.drawSummaryCard(pdf, 50, 130, 'VENTAS TOTALES', `$${report.totalSales.toFixed(2)}`, '#10b981');
        this.drawSummaryCard(pdf, 200, 130, 'TU COMISIÓN (5%)', `$${report.totalCommission.toFixed(2)}`, '#6366f1');
        this.drawSummaryCard(pdf, 350, 130, 'RESERVAS', `${report.items.length}`, '#1f2937');

        pdf.moveDown(6);

        // 3. TÍTULO DE TABLA
        pdf
            .fillColor('#1f2937')
            .fontSize(12)
            .text(`Detalle de Reservas: ${report.period}`, { align: 'left' });

        pdf.moveDown(1);

        // 4. CONFIGURACIÓN DE LA TABLA (Aquí estaba el problema)
        const table = {
            title: '', // Dejar vacío para no duplicar título
            headers: [
                // Ajustamos los anchos para que sumen aprox 490-500px y encajen perfecto
                { label: 'ID', property: 'id', width: 90 },
                { label: 'HUÉSPED', property: 'guest', width: 160 }, // Más espacio para nombres largos
                { label: 'CHECK-OUT', property: 'checkout', width: 70 },
                { label: 'TOTAL', property: 'total', width: 80, align: 'right' },
                { label: 'COMISIÓN', property: 'commission', width: 90, align: 'right' },
            ],
            datas: report.items.map(item => ({
                id: item.reservationId,
                guest: item.guestName,
                checkout: item.checkOut,
                total: `$${item.grandTotal.toFixed(2)}`,
                commission: `$${item.commission.toFixed(2)}`,
            })),
        };
        // Renderizar la tabla forzando posición y ancho
        await pdf.table(table, {
            width: 490, // <--- FORZAMOS EL ANCHO TOTAL
            x: 50,      // <--- FORZAMOS QUE EMPIECE EN EL MARGEN IZQUIERDO
            prepareHeader: () => pdf.font('Helvetica-Bold').fontSize(9).fillColor('#374151'),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                pdf.font('Helvetica').fontSize(9).fillColor('#4b5563');
                // Efecto cebra
                if (indexRow && indexRow % 2 !== 0) {
                    (pdf as any).addBackground(rectRow, '#f9fafb', 0.5);
                }
                return pdf;
            },
        });

        // FOOTER
        pdf
            .fontSize(8)
            .fillColor('#9ca3af')
            .text('Este reporte fue generado basado en la data oficial de Cloudbeds.', 50, 750, { align: 'center', width: 500 });

        pdf.end();
    }

    private drawSummaryCard(doc: PDFDocument, x: number, y: number, title: string, value: string, accentColor: string) {
        doc.roundedRect(x, y, 130, 70, 8).fill('#f3f4f6');
        doc.roundedRect(x, y, 5, 70, 2).fill(accentColor);
        doc.fillColor('#6b7280').fontSize(8).text(title, x + 15, y + 15);
        doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold').text(value, x + 15, y + 35);
        doc.font('Helvetica');
    }
}