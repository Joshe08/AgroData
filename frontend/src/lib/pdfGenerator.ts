import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PDFReportOptions {
  organizationName: string;
  reportType: string;
  fincaLabel: string;
  periodLabel: string;
  kpis: { label: string; val: string | number; note: string }[];
  headers: string[];
  rows: string[][];
}

export const generatePDFReport = (options: PDFReportOptions) => {
  const { organizationName, reportType, fincaLabel, periodLabel, kpis, headers, rows } = options;

  // Orientación horizontal (landscape) para que quepan bien las tablas
  const doc = new jsPDF({ orientation: 'l', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const fechaGeneracion = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

  // 1. PORTADA
  doc.setFillColor(16, 185, 129); // Verde principal AgroData
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('AGRODATA', 14, 26);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte Oficial de Gestión Agropecuaria', pageWidth - 14, 26, { align: 'right' });

  // Información de la empresa
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Reporte', 14, 60);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Organización: ${organizationName}`, 14, 72);
  doc.text(`Tipo de Reporte: ${reportType.toUpperCase()}`, 14, 80);
  doc.text(`Predio / Ubicación: ${fincaLabel}`, 14, 88);
  doc.text(`Período de Análisis: ${periodLabel}`, 14, 96);
  doc.text(`Fecha de Generación: ${fechaGeneracion}`, 14, 104);

  // 2. RESUMEN EJECUTIVO (KPIs)
  if (kpis && kpis.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo', 14, 125);

    let currentX = 14;
    const cardWidth = (pageWidth - 28 - ((kpis.length - 1) * 10)) / kpis.length;

    kpis.forEach((kpi) => {
      // Dibujar caja de KPI
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(currentX, 135, cardWidth, 35, 2, 2, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, currentX + 5, 145);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(String(kpi.val), currentX + 5, 156);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(kpi.note, currentX + 5, 164);

      currentX += cardWidth + 10;
    });
  }

  // Agregar nueva página para la tabla si es necesario
  doc.addPage();
  
  // 3. TABLA DE DATOS
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(`Detalle de ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 20, right: 14, bottom: 20, left: 14 },
    didDrawPage: function (data) {
      // Pie de página
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `AgroData SaaS - Plataforma de Gestión Agropecuaria | Página ${doc.internal.pages.length - 1}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // Guardar archivo
  doc.save(`AgroData_Reporte_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
