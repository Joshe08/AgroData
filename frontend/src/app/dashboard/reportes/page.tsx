'use client';

import { useState, useEffect, useMemo } from 'react';
import { fincasApi, produccionesApi, inventarioApi, finanzasApi, personalApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import {
  FileText,
  Download,
  Printer,
  DollarSign,
  Package,
  Sprout,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ReportCategory = 'produccion' | 'finanzas' | 'inventario' | 'fincas' | 'personal';
type PeriodOption = 'TODO' | 'MES_ACTUAL' | 'ULTIMOS_30_DIAS' | 'ANIO_ACTUAL';

interface Finca {
  id: string | number;
  nombre: string;
}

export default function ReportesPage() {
  const { user } = useAuthStore();
  const [reportType, setReportType] = useState<ReportCategory>('produccion');
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<string>('ALL');
  const [period, setPeriod] = useState<PeriodOption>('TODO');
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);

  // Load fincas for the filter
  useEffect(() => {
    fincasApi.getAll().then((res) => {
      setFincas(res.data || []);
    }).catch(() => {});
  }, []);

  // Fetch data based on active reportType
  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (reportType === 'produccion') {
        const res = await produccionesApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'finanzas') {
        const res = await finanzasApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'inventario') {
        const res = await inventarioApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'fincas') {
        const res = await fincasApi.getAll();
        setRawData(res.data || []);
      } else if (reportType === 'personal') {
        const res = await personalApi.getAll();
        setRawData(res.data || []);
      }
    } catch {
      useToastStore.getState().error('Error al cargar datos para el reporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  // Format currency in COP
  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  // Filter rawData according to selected Finca and Period
  const filteredData = useMemo(() => {
    let result = [...rawData];

    // Filter by finca
    if (selectedFinca !== 'ALL') {
      result = result.filter((item) => {
        const itemFincaId = String(item.fincaId || item.finca?.id || item.id);
        return itemFincaId === selectedFinca;
      });
    }

    // Filter by date/period
    if (period !== 'TODO') {
      const now = new Date();
      result = result.filter((item) => {
        const dateStr = item.date || item.fecha || item.startDate || item.fechaInicio || item.createdAt;
        if (!dateStr) return true;
        const itemDate = new Date(dateStr);

        if (period === 'ULTIMOS_30_DIAS') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return itemDate >= thirtyDaysAgo;
        }
        if (period === 'MES_ACTUAL') {
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        }
        if (period === 'ANIO_ACTUAL') {
          return itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    return result;
  }, [rawData, selectedFinca, period]);

interface KpiItem {
  label: string;
  val: string | number;
  note: string;
  color?: string;
}

  // Compute domain-specific KPIs
  const kpis: KpiItem[] = useMemo(() => {
    if (reportType === 'produccion') {
      const total = filteredData.length;
      const activas = filteredData.filter((p) => p.status === 'ACTIVE' || p.estado === 'ACTIVE' || p.estado === 'SIEMBRA' || p.estado === 'CRECIMIENTO').length;
      const totalArea = filteredData.reduce((acc, p) => acc + (parseFloat(p.expectedYield || p.cantidadSembrada || 0) || 0), 0);
      return [
        { label: 'Ciclos Productivos', val: total, note: 'Registrados en el período' },
        { label: 'Producciones Activas', val: activas, note: 'En campo o levante' },
        { label: 'Área / Escala Total', val: `${totalArea.toLocaleString('es-CO')} ha/unid`, note: 'Superficie comprometida' },
      ];
    }
    if (reportType === 'finanzas') {
      const ingresos = filteredData.filter((t) => t.type === 'INGRESO' || t.tipo === 'INGRESO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const gastos = filteredData.filter((t) => t.type === 'GASTO' || t.tipo === 'GASTO').reduce((sum, t) => sum + (t.amount || t.monto || 0), 0);
      const balance = ingresos - gastos;
      return [
        { label: 'Ingresos Totales', val: formatCOP(ingresos), note: 'Ventas y entradas operativas', color: '#34d399' },
        { label: 'Gastos Totales', val: formatCOP(gastos), note: 'Costos e insumos', color: '#f87171' },
        { label: 'Margen Operativo Neto', val: formatCOP(balance), note: balance >= 0 ? 'Superávit en período' : 'Déficit en período', color: balance >= 0 ? '#34d399' : '#f87171' },
      ];
    }
    if (reportType === 'inventario') {
      const totalItems = filteredData.length;
      const bajoStock = filteredData.filter((i) => (i.stockMinimo || i.minAlertQuantity) && (i.quantity || i.cantidad || 0) <= (i.stockMinimo || i.minAlertQuantity)).length;
      const valorAproximado = filteredData.reduce((acc, i) => acc + ((i.quantity || i.cantidad || 0) * (i.costo || 0)), 0);
      return [
        { label: 'Total Insumos', val: totalItems, note: 'Referencias en inventario' },
        { label: 'Alertas de Stock', val: bajoStock, note: 'Requieren compra urgente', color: bajoStock > 0 ? '#f87171' : undefined },
        { label: 'Valoración en Bodega', val: formatCOP(valorAproximado), note: 'Inversión en almacén' },
      ];
    }
    if (reportType === 'fincas') {
      const totalFincas = filteredData.length;
      const totalHas = filteredData.reduce((acc, f) => acc + (f.hectareas || f.area || 0), 0);
      const totalLotes = filteredData.reduce((acc, f) => acc + (f.lotes?.length || 0), 0);
      return [
        { label: 'Predios Registrados', val: totalFincas, note: 'Fincas en organización' },
        { label: 'Área Total de Predios', val: `${totalHas.toLocaleString('es-CO')} ha`, note: 'Superficie catastral' },
        { label: 'Parcelas / Potreros', val: totalLotes, note: 'Lotes delimitados' },
      ];
    }
    if (reportType === 'personal') {
      const totalPersonal = filteredData.length;
      const totalNomina = filteredData.reduce((acc, p) => acc + (p.salario || p.dailyRate || 0), 0);
      const promedio = totalPersonal > 0 ? totalNomina / totalPersonal : 0;
      return [
        { label: 'Total Colaboradores', val: totalPersonal, note: 'Personal activo' },
        { label: 'Nómina Mensual', val: formatCOP(totalNomina), note: 'Presupuesto mano de obra' },
        { label: 'Salario Promedio', val: formatCOP(promedio), note: 'Por trabajador/mes' },
      ];
    }
    return [];
  }, [reportType, filteredData]);

  // Build common headers and rows for both CSV and PDF
  const getTableData = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'produccion') {
      headers = ['ID', 'Producción / Cultivo', 'Tipo Sector', 'Finca / Predio', 'Parcela / Lote', 'Estado', 'Fecha Inicio', 'Fecha Cosecha', 'Escala / Cantidad'];
      rows = filteredData.map((p) => [
        p.id,
        p.name || p.variedad || p.tipo,
        p.tipo,
        p.finca?.nombre || `Finca #${p.fincaId}`,
        p.lote?.nombre || 'Lote Principal',
        p.estado || p.status,
        p.startDate || p.fechaInicio ? format(new Date(p.startDate || p.fechaInicio), 'dd/MM/yyyy') : '-',
        p.endDate || p.fechaEstimadaCosecha ? format(new Date(p.endDate || p.fechaEstimadaCosecha), 'dd/MM/yyyy') : '-',
        `${p.expectedYield || p.cantidadSembrada || 0} ${p.unit || p.unidadMedida || ''}`.trim(),
      ]);
    } else if (reportType === 'finanzas') {
      headers = ['ID', 'Tipo', 'Categoría', 'Monto (COP)', 'Finca', 'Fecha', 'Descripción'];
      rows = filteredData.map((t) => [
        t.id,
        t.tipo || t.type,
        t.categoria || t.category,
        t.monto || t.amount || 0,
        t.finca?.nombre || `Finca #${t.fincaId}`,
        t.fecha || t.date ? format(new Date(t.fecha || t.date), 'dd/MM/yyyy') : '-',
        t.descripcion || t.description || 'Sin descripción',
      ]);
    } else if (reportType === 'inventario') {
      headers = ['ID', 'Producto / Insumo', 'Categoría', 'Finca / Bodega', 'Cantidad', 'Unidad', 'Stock Mínimo', 'Costo Unitario (COP)', 'Proveedor'];
      rows = filteredData.map((i) => [
        i.id,
        i.nombre || i.name,
        i.categoria || i.category,
        i.finca?.nombre || `Finca #${i.fincaId}`,
        i.cantidad || i.quantity || 0,
        i.unidad || i.unit || 'unidades',
        i.stockMinimo || i.minAlertQuantity || 0,
        i.costo || 0,
        i.proveedor || 'N/A',
      ]);
    } else if (reportType === 'fincas') {
      headers = ['ID', 'Nombre del Predio', 'Ubicación Geográfica', 'Área Total (ha)', 'Tipo Suelo', 'Parcelas / Lotes'];
      rows = filteredData.map((f) => [
        f.id,
        f.nombre || f.name,
        f.ubicacion || f.location,
        f.hectareas || f.area || 0,
        f.tipoSuelo || 'Franco',
        f.lotes?.length || 0,
      ]);
    } else if (reportType === 'personal') {
      headers = ['ID', 'Nombre Colaborador', 'Cargo / Función', 'Finca Asignada', 'Salario Mensual (COP)', 'Modalidad Contrato', 'Teléfono'];
      rows = filteredData.map((p) => [
        p.id,
        p.nombre || p.name,
        p.cargo || p.role,
        p.finca?.nombre || `Finca #${p.fincaId}`,
        p.salario || p.dailyRate || 0,
        p.tipoContrato || p.status || 'TERMINO_FIJO',
        p.telefono || p.phone || 'N/A',
      ]);
    }

    return { headers, rows };
  };

  // Export to professional multi-sheet Excel (.xlsx)
  const exportToExcel = async () => {
    if (filteredData.length === 0) {
      useToastStore.getState().warning('No hay datos disponibles para exportar con los filtros seleccionados.');
      return;
    }

    try {
      const {
        generateExcelReport,
        buildFincasModulo,
        buildProduccionesModulo,
        buildInventarioModulo,
        buildFinanzasModulo,
        buildPersonalModulo,
      } = await import('@/lib/excelGenerator');

      const orgName = user?.organizationName || 'AgroData';
      const fincaLabel = selectedFinca === 'ALL'
        ? 'Todas las fincas'
        : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca;
      const periodoLabel = period.replace(/_/g, ' ');

      // Construir el módulo correcto según el tipo de reporte activo
      let modulo;
      if (reportType === 'fincas') modulo = buildFincasModulo(filteredData);
      else if (reportType === 'produccion') modulo = buildProduccionesModulo(filteredData);
      else if (reportType === 'inventario') modulo = buildInventarioModulo(filteredData);
      else if (reportType === 'finanzas') modulo = buildFinanzasModulo(filteredData);
      else modulo = buildPersonalModulo(filteredData);

      generateExcelReport({
        organizationName: orgName,
        periodo: periodoLabel,
        fincaLabel,
        kpis,
        modulos: [modulo],
      });

      useToastStore.getState().success('Reporte Excel generado exitosamente.');
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Error al generar el archivo Excel.');
    }
  };

  // Professional Printable / PDF trigger
  const handlePrint = async () => {
    if (filteredData.length === 0) {
      useToastStore.getState().warning('No hay datos disponibles para exportar.');
      return;
    }
    
    try {
      const { generatePDFReport } = await import('@/lib/pdfGenerator');
      const orgName = user?.organizationName || 'AgroData';
      const fincaLabel = selectedFinca === 'ALL' ? 'Todas las fincas' : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca;
      const periodoLabel = period.replace('_', ' ');
      const { headers, rows } = getTableData();
      
      generatePDFReport({
        organizationName: orgName,
        reportType,
        fincaLabel,
        periodLabel: periodoLabel,
        kpis,
        headers,
        rows: rows.map(r => r.map(c => String(c)))
      });
      useToastStore.getState().success('Reporte PDF generado exitosamente.');
    } catch (e) {
      console.error(e);
      useToastStore.getState().error('Error al generar el PDF.');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }} className="report-container">
      {/* Top Header - Hidden on print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Centro de Reportes y Análisis Operativo
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Consolida indicadores clave, audita predios y exporta reportes ejecutivos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            disabled={loading || filteredData.length === 0}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
          >
            <Printer size={16} />
            <span>Imprimir / PDF</span>
          </button>
          <button
            onClick={exportToExcel}
            disabled={loading || filteredData.length === 0}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
          >
            <Download size={16} />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Category Tabs - Hidden on print */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { id: 'produccion', label: 'Producción', desc: 'Cultivos, ganado y cosechas', icon: <Sprout size={18} color="#fbbf24" /> },
          { id: 'finanzas', label: 'Finanzas', desc: 'Ingresos, costos y balances', icon: <DollarSign size={18} color="#34d399" /> },
          { id: 'inventario', label: 'Inventario', desc: 'Insumos y alertas de stock', icon: <Package size={18} color="#60a5fa" /> },
          { id: 'fincas', label: 'Fincas y Predios', desc: 'Hectáreas y parcelas', icon: <MapPin size={18} color="#a78bfa" /> },
          { id: 'personal', label: 'Personal', desc: 'Mano de obra y nómina', icon: <Users size={18} color="#f472b6" /> },
        ].map((tab) => {
          const active = reportType === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setReportType(tab.id as ReportCategory)}
              className="card"
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                borderRadius: 12,
                border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: active ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tab.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Control Bar - Hidden on print */}
      <div
        className="no-print card"
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600 }}>
          <Filter size={15} />
          <span>Filtros de análisis:</span>
        </div>

        {/* Finca filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Predio:</span>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 170, padding: '7px 12px', fontSize: 13 }}
            value={selectedFinca}
            onChange={(e) => setSelectedFinca(e.target.value)}
          >
            <option value="ALL">Todos los predios</option>
            {fincas.map((f) => (
              <option key={f.id} value={String(f.id)}>{f.nombre}</option>
            ))}
          </select>
        </div>

        {/* Period filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Período:</span>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 160, padding: '7px 12px', fontSize: 13 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
          >
            <option value="TODO">Histórico completo</option>
            <option value="MES_ACTUAL">Mes en curso</option>
            <option value="ULTIMOS_30_DIAS">Últimos 30 días</option>
            <option value="ANIO_ACTUAL">Año en curso</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-subtle)' }}>
          {filteredData.length} registros filtrados
        </div>
      </div>

      {/* PRINT-ONLY HEADER (VISIBLE ONLY WHEN PRINTING TO PDF / PAPER) */}
      <div className="print-only" style={{ display: 'none', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: '#111' }}>
              AGRODATA · REPORTE OPERATIVO
            </h1>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
              Organización: {user?.organizationName || 'AgroData'}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#555' }}>
            <div>Fecha de Emisión: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
            <div>Tipo: {reportType.toUpperCase()}</div>
            <div>Predio: {selectedFinca === 'ALL' ? 'Todos los predios' : fincas.find((f) => String(f.id) === selectedFinca)?.nombre || selectedFinca}</div>
            <div>Período: {period.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
        className="kpi-grid"
      >
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: '18px 20px',
              borderLeft: '4px solid var(--color-primary)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color || 'var(--color-text)', marginBottom: 4 }}>
              {kpi.val}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
              {kpi.note}
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Content */}
      <div className="card report-table-card" style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
            <FileText size={44} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
              No se encontraron registros con los filtros aplicados
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Intenta seleccionar otro predio o cambiar el rango de fecha.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* PRODUCCIÓN TABLE */}
              {reportType === 'produccion' && (
                <>
                  <thead>
                    <tr>
                      <th>Producción / Cultivo</th>
                      <th>Sector</th>
                      <th>Predio</th>
                      <th>Parcela</th>
                      <th>Estado</th>
                      <th>Fecha Siembra</th>
                      <th>Fecha Cosecha</th>
                      <th style={{ textAlign: 'right' }}>Área / Escala</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {p.name || p.variedad || p.tipo}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.tipo}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.finca?.nombre || `Finca #${p.fincaId}`}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.lote?.nombre || 'Lote Principal'}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: 11 }}>
                            {p.estado || p.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          {p.startDate || p.fechaInicio ? format(new Date(p.startDate || p.fechaInicio), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          {p.endDate || p.fechaEstimadaCosecha ? format(new Date(p.endDate || p.fechaEstimadaCosecha), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {p.expectedYield || p.cantidadSembrada || 0} {p.unit || p.unidadMedida || 'ha'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* FINANZAS TABLE */}
              {reportType === 'finanzas' && (
                <>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Categoría</th>
                      <th>Predio</th>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'right' }}>Monto (COP)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((t) => {
                      const isIngreso = t.tipo === 'INGRESO' || t.type === 'INGRESO';
                      return (
                        <tr key={t.id}>
                          <td>
                            <span className={`badge ${isIngreso ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                              {isIngreso ? 'Ingreso' : 'Gasto'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t.categoria || t.category}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.finca?.nombre || `Finca #${t.fincaId}`}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                            {t.fecha || t.date ? format(new Date(t.fecha || t.date), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.descripcion || t.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: isIngreso ? '#34d399' : '#f87171' }}>
                            {formatCOP(t.monto || t.amount || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}

              {/* INVENTARIO TABLE */}
              {reportType === 'inventario' && (
                <>
                  <thead>
                    <tr>
                      <th>Insumo / Producto</th>
                      <th>Categoría</th>
                      <th>Ubicación / Predio</th>
                      <th>Existencia</th>
                      <th>Stock Mín.</th>
                      <th>Costo Unitario</th>
                      <th>Proveedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((i) => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{i.nombre || i.name}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.categoria || i.category}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.finca?.nombre || `Finca #${i.fincaId}`}</td>
                        <td style={{ fontWeight: 600 }}>
                          {i.cantidad || i.quantity || 0} <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>{i.unidad || i.unit}</span>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.stockMinimo || i.minAlertQuantity || '-'}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.costo ? formatCOP(i.costo) : '-'}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{i.proveedor || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* FINCAS TABLE */}
              {reportType === 'fincas' && (
                <>
                  <thead>
                    <tr>
                      <th>Nombre del Predio</th>
                      <th>Ubicación Geográfica</th>
                      <th>Área Total</th>
                      <th>Tipo Suelo</th>
                      <th style={{ textAlign: 'right' }}>Parcelas / Lotes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((f) => (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{f.nombre || f.name}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{f.ubicacion || f.location}</td>
                        <td style={{ fontWeight: 600 }}>{f.hectareas || f.area || 0} ha</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{f.tipoSuelo || 'Franco'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{f.lotes?.length || 0} parcelas</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* PERSONAL TABLE */}
              {reportType === 'personal' && (
                <>
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Cargo / Función</th>
                      <th>Predio Asignado</th>
                      <th>Contrato</th>
                      <th>Teléfono</th>
                      <th style={{ textAlign: 'right' }}>Salario Mensual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{p.nombre || p.name}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.cargo || p.role}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.finca?.nombre || `Finca #${p.fincaId}`}</td>
                        <td style={{ fontSize: 12 }}>{p.tipoContrato || p.status || 'TERMINO_FIJO'}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{p.telefono || p.phone || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                          {p.salario || p.dailyRate ? formatCOP(p.salario || p.dailyRate) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>

      {/* PRINT-ONLY FOOTER */}
      <div className="print-only" style={{ display: 'none', marginTop: 30, textAlign: 'center', fontSize: 10, color: '#777', borderTop: '1px solid #ccc', paddingTop: 8 }}>
        AgroData SaaS · Plataforma de Gestión Agropecuaria Integral · Documento generado automáticamente
      </div>

      {/* CSS Rules for Professional Printing */}
      <style>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .no-print, header, aside, .desktop-sidebar, button, nav {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .report-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .card {
            background: #fff !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            color: #000 !important;
          }
          .data-table th {
            background: #f1f5f9 !important;
            color: #111 !important;
            border-bottom: 2px solid #ccc !important;
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
          .data-table td {
            color: #222 !important;
            border-bottom: 1px solid #eee !important;
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
          }
          .kpi-grid .card {
            padding: 10px 14px !important;
            border: 1px solid #ccc !important;
          }
          @page {
            size: landscape;
            margin: 1.2cm;
          }
        }
      `}</style>
    </div>
  );
}
