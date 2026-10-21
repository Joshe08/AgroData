import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface PDFReportOptions {
  organizationName: string;
  reportType: string;
  fincaLabel: string;
  periodLabel: string;
  kpis: { label: string; val: string | number; note: string }[];
  headers: string[];
  rows: string[][];
}

export interface PDFSection {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ConsolidatedPDFOptions {
  organizationName: string;
  fincaLabel: string;
  periodLabel: string;
  kpis: { label: string; val: string | number; note: string }[];
  sections: PDFSection[];
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
    didDrawPage: function () {
      // Pie de página
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `AgroData Cesar - Plataforma de Gestión Agropecuaria | Página ${doc.internal.pages.length - 1}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // Guardar archivo
  doc.save(`AgroData_Reporte_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateConsolidatedPDFReport = (options: ConsolidatedPDFOptions) => {
  const { organizationName, fincaLabel, periodLabel, kpis, sections } = options;

  const doc = new jsPDF({ orientation: 'l', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const fechaGeneracion = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

  // 1. PORTADA CONSOLIDADA
  doc.setFillColor(16, 185, 129); // Verde AgroData
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('AGRODATA CESAR', 14, 24);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('INFORME MAESTRO CONSOLIDADO INTEGRAL', pageWidth - 14, 24, { align: 'right' });
  doc.setFontSize(10);
  doc.text('Auditoría General de Predios, Cultivos, Inventario, Finanzas, Personal y Maquinaria', pageWidth - 14, 34, { align: 'right' });

  // Metadatos
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ficha de Identificación del Informe', 14, 56);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Organización: ${organizationName}`, 14, 66);
  doc.text(`Filtro Predial: ${fincaLabel}`, 14, 73);
  doc.text(`Rango Temporal: ${periodLabel}`, 14, 80);
  doc.text(`Fecha y Hora de Emisión: ${fechaGeneracion}`, 14, 87);
  doc.text(`Módulos Auditados: ${sections.map((s) => s.title).join(' · ')}`, 14, 94);

  // KPIs Resumen Ejecutivo
  if (kpis && kpis.length > 0) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Consolidados de Rendimiento (KPIs Globales)', 14, 110);

    const cols = Math.min(kpis.length, 4);
    const cardWidth = (pageWidth - 28 - (cols - 1) * 8) / cols;
    const cardHeight = 32;

    kpis.forEach((kpi, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const currentX = 14 + colIdx * (cardWidth + 8);
      const currentY = 118 + rowIdx * (cardHeight + 8);

      if (currentY + cardHeight < pageHeight - 15) {
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, currentX + 6, currentY + 9);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(kpi.val), currentX + 6, currentY + 19);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.note, currentX + 6, currentY + 27);
      }
    });
  }

  // 2. SECCIONES DE DATOS POR CADA MÓDULO
  sections.forEach((sec) => {
    if (sec.rows.length === 0) return;

    doc.addPage();

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Módulo: ${sec.title} (${sec.rows.length} registros)`, 14, 18);

    autoTable(doc, {
      startY: 24,
      head: [sec.headers],
      body: sec.rows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: 40,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 16, right: 14, bottom: 18, left: 14 },
      didDrawPage: function () {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `AgroData Cesar · Informe Consolidado Integral | Página ${doc.internal.pages.length - 1}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      },
    });
  });

  doc.save(`AgroData_Reporte_CONSOLIDADO_TOTAL_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
