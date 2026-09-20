/**
 * AgroData — Generador Profesional de Reportes Excel (multi-hoja)
 * Libreria: xlsx  |  Hojas: RESUMEN + datos por modulo
 * Sin undefined/null en celdas. Columnas auto-ajustadas.
 */

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface KpiItem {
  label: string;
  val: string | number;
  note: string;
}

export interface ModuloData {
  nombre: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ExcelReportOptions {
  organizationName: string;
  periodo: string;
  fincaLabel: string;
  kpis: KpiItem[];
  modulos: ModuloData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clean = (val: string | number | null | undefined): string | number => {
  if (val === null || val === undefined) return '';
  return val;
};

const calcColWidths = (data: (string | number)[][], headers: string[]): { wch: number }[] => {
  const widths = headers.map((h) => Math.max(h.length, 10));
  data.forEach((row) => {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      if (len > (widths[i] || 10)) widths[i] = Math.min(len, 60);
    });
  });
  return widths.map((w) => ({ wch: w + 2 }));
};

const tryDate = (d: string | undefined | null): string => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '-'; }
};

const addDataSheet = (
  wb: XLSX.WorkBook,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
): void => {
  const cleanRows = rows.map((r) => r.map(clean));
  const wsData: (string | number)[][] = [headers, ...cleanRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = calcColWidths(cleanRows, headers);
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
};

// ─── Función Principal ────────────────────────────────────────────────────────

export const generateExcelReport = (options: ExcelReportOptions): void => {
  const { organizationName, periodo, fincaLabel, kpis, modulos } = options;
  const wb = XLSX.utils.book_new();
  const fechaGeneracion = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });

  // Hoja 1: RESUMEN
  const resumenData: (string | number)[][] = [
    ['AGRODATA — REPORTE OFICIAL DE GESTION AGROPECUARIA'],
    [],
    ['Organizacion:', organizationName],
    ['Predio / Finca:', fincaLabel],
    ['Periodo:', periodo],
    ['Fecha de Generacion:', fechaGeneracion],
    [],
    ['INDICADORES CLAVE'],
    ['Indicador', 'Valor', 'Observacion'],
    ...kpis.map((k) => [k.label, String(k.val), k.note]),
    [],
    ['MODULOS INCLUIDOS'],
    ['Modulo', 'Registros'],
    ...modulos.map((m) => [m.nombre, m.rows.length]),
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [{ wch: 36 }, { wch: 28 }, { wch: 40 }];
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN');

  // Hojas de datos
  modulos.forEach((modulo) => {
    if (modulo.rows.length > 0) {
      addDataSheet(wb, modulo.nombre.toUpperCase().substring(0, 31), modulo.headers, modulo.rows);
    }
  });

  const fileName = `AgroData_Reporte_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ─── Constructores de modulos ─────────────────────────────────────────────────

export const buildFincasModulo = (fincas: any[]): ModuloData => ({
  nombre: 'FINCAS',
  headers: ['ID', 'Nombre del Predio', 'Ubicacion', 'Area (ha)', 'Tipo Suelo', 'Parcelas / Lotes'],
  rows: fincas.map((f) => [
    f.id ?? '',
    f.nombre ?? f.name ?? '',
    f.ubicacion ?? f.location ?? '',
    f.hectareas ?? f.area ?? 0,
    f.tipoSuelo ?? 'N/A',
    f.lotes?.length ?? 0,
  ]),
});

export const buildProduccionesModulo = (prods: any[]): ModuloData => ({
  nombre: 'PRODUCCIONES',
  headers: ['ID', 'Produccion / Cultivo', 'Tipo Sector', 'Finca / Predio', 'Parcela / Lote', 'Estado', 'Fecha Inicio', 'Fecha Cosecha', 'Escala / Cantidad', 'Unidad'],
  rows: prods.map((p) => [
    p.id ?? '',
    p.variedad ?? p.name ?? p.tipo ?? '',
    p.tipo ?? '',
    p.finca?.nombre ?? `Finca #${p.fincaId}`,
    p.lote?.nombre ?? 'Lote Principal',
    p.estado ?? p.status ?? '',
    tryDate(p.fechaInicio ?? p.startDate),
    tryDate(p.fechaEstimadaCosecha ?? p.endDate),
    p.cantidadSembrada ?? p.expectedYield ?? 0,
    p.unidadMedida ?? p.unit ?? 'unid',
  ]),
});

export const buildInventarioModulo = (items: any[]): ModuloData => ({
  nombre: 'INVENTARIO',
  headers: ['ID', 'Insumo / Producto', 'Categoria', 'Finca / Bodega', 'Cantidad', 'Unidad', 'Stock Minimo', 'Costo Unitario (COP)', 'Proveedor'],
  rows: items.map((i) => [
    i.id ?? '',
    i.nombre ?? i.name ?? '',
    i.categoria ?? i.category ?? '',
    i.finca?.nombre ?? `Finca #${i.fincaId}`,
    i.cantidad ?? i.quantity ?? 0,
    i.unidad ?? i.unit ?? 'unidades',
    i.stockMinimo ?? i.minAlertQuantity ?? 0,
    i.costo ?? 0,
    i.proveedor ?? 'N/A',
  ]),
});

export const buildFinanzasModulo = (transacciones: any[]): ModuloData => ({
  nombre: 'FINANZAS',
  headers: ['ID', 'Tipo', 'Categoria', 'Monto (COP)', 'Finca', 'Fecha', 'Descripcion'],
  rows: transacciones.map((t) => [
    t.id ?? '',
    t.tipo ?? t.type ?? '',
    t.categoria ?? t.category ?? '',
    t.monto ?? t.amount ?? 0,
    t.finca?.nombre ?? `Finca #${t.fincaId}`,
    tryDate(t.fecha ?? t.date),
    t.descripcion ?? t.description ?? 'Sin descripcion',
  ]),
});

export const buildPersonalModulo = (personal: any[], includeSalary = true): ModuloData => ({
  nombre: 'PERSONAL',
  headers: includeSalary
    ? ['ID', 'Nombre Colaborador', 'Cargo / Funcion', 'Finca Asignada', 'Salario Mensual (COP)', 'Modalidad Contrato', 'Fecha Ingreso', 'Telefono']
    : ['ID', 'Nombre Colaborador', 'Cargo / Funcion', 'Finca Asignada', 'Modalidad Contrato', 'Fecha Ingreso', 'Telefono'],
  rows: personal.map((p) => {
    const base: (string | number)[] = [
      p.id ?? '',
      p.nombre ?? p.name ?? '',
      p.cargo ?? p.role ?? '',
      p.finca?.nombre ?? `Finca #${p.fincaId}`,
    ];
    if (includeSalary) base.push(p.salario ?? 0);
    base.push(
      (p.tipoContrato ?? p.status ?? 'TERMINO_FIJO').replace(/_/g, ' '),
      tryDate(p.fechaIngreso),
      p.telefono ?? p.phone ?? 'N/A',
    );
    return base;
  }),
});
