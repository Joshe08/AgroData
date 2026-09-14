'use client';

import { useState, useEffect } from 'react';
import { fincasApi, produccionesApi, inventarioApi, finanzasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  FileText,
  Download,
  Filter,
  DollarSign,
  Package,
  Sprout,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function ReportesPage() {
  const [reportType, setReportType] = useState<'finanzas' | 'inventario' | 'producciones' | 'fincas'>('finanzas');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (reportType === 'finanzas') {
        const res = await finanzasApi.getAll();
        setData(res.data || []);
      } else if (reportType === 'inventario') {
        const res = await inventarioApi.getAll();
        setData(res.data || []);
      } else if (reportType === 'producciones') {
        const res = await produccionesApi.getAll();
        setData(res.data || []);
      } else if (reportType === 'fincas') {
        const res = await fincasApi.getAll();
        setData(res.data || []);
      }
    } catch {
      useToastStore.getState().error('Error al cargar datos del reporte.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      useToastStore.getState().warning('No hay datos disponibles para exportar.');
      return;
    }

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (reportType === 'finanzas') {
        headers = ['ID', 'Tipo', 'Categoría', 'Monto', 'Fecha', 'Descripción'];
        rows = data.map((item) => [
          item.id || '',
          item.type || '',
          item.category || '',
          String(item.amount || 0),
          item.date ? new Date(item.date).toLocaleDateString('es-CO') : '',
          "",
        ]);
      } else if (reportType === 'inventario') {
        headers = ['ID', 'Producto', 'Categoría', 'Cantidad', 'Unidad', 'Alerta Mínima', 'Ubicación'];
        rows = data.map((item) => [
          item.id || '',
          "",
          item.category || '',
          String(item.quantity || 0),
          item.unit || '',
          String(item.minAlertQuantity || 0),
          "",
        ]);
      } else if (reportType === 'producciones') {
        headers = ['ID', 'Nombre', 'Tipo', 'Estado', 'Rendimiento Esperado', 'Unidad', 'Fecha Inicio'];
        rows = data.map((item) => [
          item.id || '',
          "",
          item.type || '',
          item.status || '',
          String(item.expectedYield || 0),
          item.unit || '',
          item.startDate ? new Date(item.startDate).toLocaleDateString('es-CO') : '',
        ]);
      } else if (reportType === 'fincas') {
        headers = ['ID', 'Nombre', 'Ubicación', 'Área Total (ha)', 'Lotes'];
        rows = data.map((item) => [
          item.id || '',
          "",
          "",
          String(item.totalArea || 0),
          String(item.lotes?.length || 0),
        ]);
      }

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_' + reportType + '_' + new Date().toISOString().split('T')[0] + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      useToastStore.getState().success('Reporte exportado exitosamente.');
    } catch {
      useToastStore.getState().error('Error al generar la exportación.');
    }
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Centro de Reportes
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Genera, visualiza y exporta informes ejecutivos de las operaciones de tu empresa.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={loading || data.length === 0}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
        >
          <Download size={16} />
          <span>Exportar a Excel (CSV)</span>
        </button>
      </div>

      {/* Selector de tipo de reporte */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { id: 'finanzas', label: 'Finanzas y Caja', desc: 'Ingresos, gastos y balance operativo', icon: <DollarSign size={20} color="#34d399" /> },
          { id: 'inventario', label: 'Inventario de Insumos', desc: 'Existencias, unidades y alertas de stock', icon: <Package size={20} color="#60a5fa" /> },
          { id: 'producciones', label: 'Producciones y Cosechas', desc: 'Lotes, estados y rendimientos esperados', icon: <Sprout size={20} color="#fbbf24" /> },
          { id: 'fincas', label: 'Fincas y Lotes', desc: 'Predios registrados y áreas en hectáreas', icon: <MapPin size={20} color="#a78bfa" /> },
        ].map((tab) => {
          const active = reportType === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className="card"
              style={{
                padding: '18px 20px',
                cursor: 'pointer',
                borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                background: active ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                {tab.icon}
                <span style={{ fontSize: 15, fontWeight: 700, color: active ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  {tab.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                {tab.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Resumen del reporte seleccionado */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
              Detalle de Registros ({data.length})
            </h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Fecha de consulta: {new Date().toLocaleDateString('es-CO')}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Cargando información del reporte...
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No se encontraron registros en este módulo para generar el reporte.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  {reportType === 'finanzas' && (
                    <>
                      <th>Tipo</th>
                      <th>Categoría</th>
                      <th>Monto</th>
                      <th>Fecha</th>
                      <th>Descripción</th>
                    </>
                  )}
                  {reportType === 'inventario' && (
                    <>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Alerta Mínima</th>
                    </>
                  )}
                  {reportType === 'producciones' && (
                    <>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Rendimiento Estimado</th>
                    </>
                  )}
                  {reportType === 'fincas' && (
                    <>
                      <th>Finca</th>
                      <th>Ubicación</th>
                      <th>Área (ha)</th>
                      <th>Lotes</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((row, idx) => (
                  <tr key={row.id || idx}>
                    {reportType === 'finanzas' && (
                      <>
                        <td>
                          <span className={row.type === 'INGRESO' ? 'badge badge-success' : 'badge badge-danger'}>
                            {row.type}
                          </span>
                        </td>
                        <td>{row.category}</td>
                        <td style={{ fontWeight: 600, color: row.type === 'INGRESO' ? '#34d399' : '#f87171' }}>
                          {formatCOP(row.amount || 0)}
                        </td>
                        <td>{row.date ? new Date(row.date).toLocaleDateString('es-CO') : '—'}</td>
                        <td>{row.description || '—'}</td>
                      </>
                    )}
                    {reportType === 'inventario' && (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.category}</td>
                        <td>{row.quantity}</td>
                        <td>{row.unit}</td>
                        <td>{row.minAlertQuantity}</td>
                      </>
                    )}
                    {reportType === 'producciones' && (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.type}</td>
                        <td>
                          <span className="badge badge-primary">{row.status}</span>
                        </td>
                        <td>{row.expectedYield} {row.unit}</td>
                      </>
                    )}
                    {reportType === 'fincas' && (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.location || '—'}</td>
                        <td>{row.totalArea || 0} ha</td>
                        <td>{row.lotes?.length || 0} lote(s)</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

