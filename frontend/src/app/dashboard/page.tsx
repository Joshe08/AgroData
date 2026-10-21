'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { fincasApi, finanzasApi, produccionesApi, inventarioApi } from '@/lib/api';
import {
  MapPin, Sprout, DollarSign, Package, TrendingUp, TrendingDown,
  AlertTriangle, RefreshCw, Tractor, Users, CloudSun, Wrench,
  BarChart3, Coins, ArrowUpCircle, ArrowDownCircle, Scale, CalendarDays,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClimaWidget from '@/components/dashboard/ClimaWidget';
import AgroIAWidget from '@/components/dashboard/AgroIAWidget';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'cyan';
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}

interface MovimientoReciente {
  id: string | number;
  tipo: 'INGRESO' | 'GASTO';
  titulo: string;
  detalle: string;
  monto: number;
  fecha: string;
}

interface FincaData {
  id: string;
  nombre: string;
  lat?: number;
  lon?: number;
}

interface DashboardData {
  fincas: number;
  fincasData?: FincaData[];
  producciones: number;
  ingresos: number;
  gastos: number;
  alertasInventario: number;
  richAlerts?: any[];
  empleados: number;
  resumenFinanciero: unknown[];
  distribProds: unknown[];
  movimientosRecientes: MovimientoReciente[];
  loading: boolean;
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444'];

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, subtitle, icon, color, trend, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card stat-card-${color}`}
      style={{ padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease' }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; } }}
      onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className={`stat-icon-${color}`} style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: trend.positive ? '#4ade80' : '#f87171' }}>
            {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="font-display" style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, wordBreak: 'break-word', lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>{subtitle}</div>}
      {onClick && <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>Ver detalle &rarr;</div>}
    </div>
  );
}


// ─── Actividad Productiva Widget (Limpio, Responsivo, Sin Emojis) ─────────────

const CROP_TYPE_META: Record<string, { label: string; categoria: string; color: string }> = {
  AGRICOLA_ARROZ: { label: 'Arroz', categoria: 'Agrícola', color: '#10b981' },
  AGRICOLA_MAIZ: { label: 'Maíz Tecnificado', categoria: 'Agrícola', color: '#f59e0b' },
  AGRICOLA_SORGO: { label: 'Sorgo', categoria: 'Agrícola', color: '#84cc16' },
  AGRICOLA_PALMA: { label: 'Palma de Aceite', categoria: 'Agrícola', color: '#06b6d4' },
  PECUARIA_GANADO: { label: 'Ganadería Bovina', categoria: 'Pecuaria', color: '#38bdf8' },
  AGRICOLA_CAFE: { label: 'Café Especial', categoria: 'Agrícola', color: '#ec4899' },
  AGRICOLA_YUCA: { label: 'Yuca Industrial', categoria: 'Agrícola', color: '#a855f7' },
  PECUARIA_PORCINO: { label: 'Porcicultura', categoria: 'Pecuaria', color: '#f43f5e' },
  PECUARIA_AVICOLA: { label: 'Avicultura', categoria: 'Pecuaria', color: '#eab308' },
};

function getCropMeta(rawName: string, index: number) {
  if (CROP_TYPE_META[rawName]) return CROP_TYPE_META[rawName];
  const fallbackColors = ['#10b981', '#38bdf8', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const color = fallbackColors[index % fallbackColors.length];
  const cleanLabel = (rawName || 'Otro')
    .replace(/^AGRICOLA_/, '')
    .replace(/^PECUARIA_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const categoria = (rawName || '').startsWith('PECUARIA') ? 'Pecuaria' : 'Agrícola';
  return { label: cleanLabel, categoria, color };
}

function ActividadProductivaWidget({
  distribProds,
  loading,
  title = 'Actividad Productiva',
  subtitle = 'Distribución por tipo de producción',
}: {
  distribProds: Array<{ name: string; value: number }>;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const total = distribProds.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{title}</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{subtitle}</p>
        </div>
        {total > 0 && (
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 9999, background: 'rgba(16,185,129,0.12)', color: '#34d399', fontWeight: 600, border: '1px solid rgba(16,185,129,0.2)' }}>
            {total} {total === 1 ? 'ciclo activo' : 'ciclos activos'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      ) : distribProds.length === 0 ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: 13, textAlign: 'center' }}>
          <div><Sprout size={32} style={{ margin: '0 auto 8px', opacity: 0.25 }} /><p>Sin ciclos productivos activos</p></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Barra de distribución porcentual proporcional */}
          <div style={{ display: 'flex', width: '100%', height: 8, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', gap: 2 }}>
            {distribProds.map((item, i) => {
              const meta = getCropMeta(item.name, i);
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div
                  key={i}
                  style={{
                    width: `${pct}%`,
                    background: meta.color,
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                  title={`${meta.label}: ${item.value} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Desglose responsivo de rubros productivos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            {distribProds.map((item, i) => {
              const meta = getCropMeta(item.name, i);
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
                        {meta.categoria}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {item.value} {item.value === 1 ? 'lote' : 'lotes'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, minWidth: 32, textAlign: 'right' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: meta.color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard AGRONOMO ───────────────────────────────────────────────────────

function AgronomoDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, fincas, producciones, alertasInventario, distribProds } = data;
  const primeraFinca = data.fincasData?.find(f => f.lat && f.lon) || data.fincasData?.[0];

  return (
    <>
      {loading ? (
        <div className="dashboard-kpi-grid">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div className="dashboard-kpi-grid">
          <StatCard label="Fincas a cargo" value={fincas} icon={<MapPin size={20} />} color="green" onClick={() => router.push('/dashboard/fincas')} />
          <StatCard label="Cultivos activos" value={producciones} icon={<Sprout size={20} />} color="blue" onClick={() => router.push('/dashboard/producciones')} />
          <StatCard label="Alertas de insumos" value={alertasInventario} subtitle={alertasInventario > 0 ? 'Requieren atención' : 'Stock en orden'} icon={<Package size={20} />} color={alertasInventario > 0 ? 'red' : 'green'} onClick={() => router.push('/dashboard/inventario')} />
        </div>
      )}

      {/* Fila: actividad productiva + accesos y clima/AgroIA */}
      <div className="dashboard-charts-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ActividadProductivaWidget
            distribProds={distribProds as Array<{ name: string; value: number }>}
            loading={loading}
            title="Tipos de Cultivo"
            subtitle="Distribución por especie y explotación"
          />

          {/* Accesos rápidos */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-muted)' }}>Módulos de Campo</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {[
                { label: 'Ver Fincas y Parcelas', href: '/dashboard/fincas', icon: <MapPin size={14} /> },
                { label: 'Gestionar Producciones', href: '/dashboard/producciones', icon: <Sprout size={14} /> },
                { label: 'Revisar Inventario', href: '/dashboard/inventario', icon: <Package size={14} /> },
              ].map((item) => (
                <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, color: 'var(--color-text)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                  <span style={{ color: 'var(--color-primary)' }}>{item.icon}</span>{item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ClimaWidget fincaNombre={primeraFinca?.nombre} lat={primeraFinca?.lat} lon={primeraFinca?.lon} />
          <AgroIAWidget alertasInventario={alertasInventario} producciones={producciones} fincas={fincas} balance={0} />
        </div>
      </div>
    </>
  );
}

// ─── Dashboard TRABAJADOR ─────────────────────────────────────────────────────

function TrabajadorDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, fincas, producciones, alertasInventario } = data;

  return (
    <>
      {loading ? (
        <div className="dashboard-kpi-grid">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div className="dashboard-kpi-grid">
          <StatCard label="Predios asignados" value={fincas} icon={<MapPin size={20} />} color="green" onClick={() => router.push('/dashboard/fincas')} />
          <StatCard label="Cultivos en marcha" value={producciones} icon={<Sprout size={20} />} color="blue" onClick={() => router.push('/dashboard/producciones')} />
          <StatCard label="Alertas de stock" value={alertasInventario} subtitle={alertasInventario > 0 ? 'Informar al responsable' : 'Sin alertas'} icon={<Package size={20} />} color={alertasInventario > 0 ? 'red' : 'green'} onClick={() => router.push('/dashboard/inventario')} />
        </div>
      )}

      <div className="card" style={{ padding: '24px', marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Módulos operacionales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { label: 'Fincas', href: '/dashboard/fincas', icon: <MapPin size={16} />, desc: 'Ver predios y parcelas', color: '#10b981' },
            { label: 'Producciones', href: '/dashboard/producciones', icon: <Sprout size={16} />, desc: 'Seguimiento de cultivos', color: '#0ea5e9' },
            { label: 'Clima', href: '/dashboard/clima', icon: <CloudSun size={16} />, desc: 'Condiciones del día', color: '#0ea5e9' },
            { label: 'Maquinaria', href: '/dashboard/maquinaria', icon: <Tractor size={16} />, desc: 'Estado del equipo', color: '#f59e0b' },
            { label: 'Inventario', href: '/dashboard/inventario', icon: <Package size={16} />, desc: 'Insumos disponibles', color: '#f59e0b' },
          ].map((item) => (
            <a key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', textDecoration: 'none', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <span style={{ fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.desc}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Dashboard CONTADOR ───────────────────────────────────────────────────────

function ContadorDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, ingresos, gastos, resumenFinanciero } = data;
  const balance = ingresos - gastos;

  return (
    <>
      {loading ? (
        <div className="dashboard-kpi-grid">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div className="dashboard-kpi-grid">
          <StatCard label="Ingresos totales" value={formatCOP(ingresos)} icon={<ArrowUpCircle size={20} />} color="green" onClick={() => router.push('/dashboard/finanzas')} />
          <StatCard label="Gastos totales" value={formatCOP(gastos)} icon={<ArrowDownCircle size={20} />} color="red" onClick={() => router.push('/dashboard/finanzas')} />
          <StatCard label="Balance neto" value={formatCOP(balance)} subtitle={balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'} icon={<Scale size={20} />} color={balance >= 0 ? 'blue' : 'red'} onClick={() => router.push('/dashboard/finanzas')} />
          <StatCard label="Módulo financiero" value="Ver" subtitle="Ir al detalle completo" icon={<Coins size={20} />} color="amber" onClick={() => router.push('/dashboard/finanzas')} />
        </div>
      )}

      <div className="dashboard-charts-grid">
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Flujo de Caja</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Últimos 6 meses — Ingresos vs Gastos</p>
          {loading ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resumenFinanciero as Array<{ mes: string; ingresos: number; gastos: number }>}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,61,42,0.5)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', fontSize: 13 }} formatter={(value) => [formatCOP(Number(value || 0))]} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Accesos financieros</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Módulos del área contable</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Finanzas', href: '/dashboard/finanzas', icon: <DollarSign size={16} /> },
              { label: 'Personal y Nómina', href: '/dashboard/personal', icon: <Users size={16} /> },
              { label: 'Inventario', href: '/dashboard/inventario', icon: <Package size={16} /> },
              { label: 'Reportes / AgroIA', href: '/dashboard/ai', icon: <BarChart3 size={16} /> },
            ].map((item) => (
              <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, color: 'var(--color-text)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                <span style={{ color: '#f59e0b' }}>{item.icon}</span>{item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Dashboard EJECUTIVO (PROPIETARIO / ADMIN / SUPERADMIN) ───────────────────

function EjecutivoDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, fincas, producciones, ingresos, gastos, alertasInventario, resumenFinanciero, distribProds, movimientosRecientes } = data;
  const balance = ingresos - gastos;
  const primeraFinca = data.fincasData?.find(f => f.lat && f.lon) || data.fincasData?.[0];

  return (
    <>
      {/* ── 1. KPI CARDS ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="dashboard-kpi-grid">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div className="dashboard-kpi-grid">
          <StatCard label="Fincas Registradas" value={fincas} icon={<MapPin size={20} />} color="green" onClick={() => router.push('/dashboard/fincas')} />
          <StatCard label="Producciones Activas" value={producciones} icon={<Sprout size={20} />} color="blue" onClick={() => router.push('/dashboard/producciones')} />
          <StatCard label="Ingresos Totales" value={formatCOP(ingresos)} icon={<TrendingUp size={20} />} color="green" onClick={() => router.push('/dashboard/finanzas')} />
          <StatCard label="Gastos Totales" value={formatCOP(gastos)} icon={<TrendingDown size={20} />} color="red" onClick={() => router.push('/dashboard/finanzas')} />
        </div>
      )}

      {/* ── 2. ALERTA DE STOCK ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {alertasInventario > 0 ? (
          <div style={{ padding: '13px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color="#fbbf24" />
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                <strong style={{ color: '#fbbf24' }}>Atención:</strong> {alertasInventario} insumo(s) con stock mínimo crítico.
              </span>
            </div>
            <a href="/dashboard/inventario" style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', textDecoration: 'underline' }}>Ver insumos →</a>
          </div>
        ) : (
          <div style={{ padding: '12px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Operaciones al día · Insumos y predios en condiciones normales.</span>
          </div>
        )}
      </div>

      {/* ── 3. FILA PRINCIPAL: GRÁFICA FINANCIERA + CLIMA & AGROIA ─────────
              La gráfica ocupa el espacio principal; clima y AgroIA van en
              una columna derecha apilada, con colapso responsivo en móvil.    */}
      <div className="dashboard-charts-grid">

        {/* Gráfica ingresos vs gastos */}
        <div className="card" style={{ padding: '22px 24px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Ingresos vs Gastos</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Histórico financiero — últimos 6 meses</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Ingresos
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Gastos
              </span>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 210, borderRadius: 10 }} />
          ) : !resumenFinanciero || (resumenFinanciero as any[]).length === 0 || (resumenFinanciero as any[]).every((m: any) => (m.ingresos || 0) === 0 && (m.gastos || 0) === 0) ? (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: 13, textAlign: 'center' }}>
              <div><BarChart3 size={32} style={{ margin: '0 auto 8px', opacity: 0.25 }} /><p>Sin datos financieros registrados</p></div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 210, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resumenFinanciero as Array<{ mes: string; ingresos: number; gastos: number }>} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gi2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f8fafc', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    formatter={(v: any) => [formatCOP(Number(v || 0))]}
                  />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2.5} fill="url(#gi2)" dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2.5} fill="url(#gg2)" dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Resumen de balance debajo de la gráfica */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 2 }}>Balance neto</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: balance >= 0 ? '#4ade80' : '#f87171' }}>{formatCOP(balance)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 2 }}>Total ingresos</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4ade80' }}>{formatCOP(ingresos)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 2 }}>Total gastos</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f87171' }}>{formatCOP(gastos)}</div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Clima + AgroIA apilados, sin huecos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ClimaWidget fincaNombre={primeraFinca?.nombre} lat={primeraFinca?.lat} lon={primeraFinca?.lon} />
          <AgroIAWidget alertasInventario={alertasInventario} producciones={producciones} fincas={fincas} balance={balance} />
        </div>
      </div>

      {/* ── 4. FILA: DISTRIBUCIÓN PRODUCTIVA + ACTIVIDAD RECIENTE ──────────
              Dos tarjetas iguales lado a lado, responsivas en móvil.        */}
      <div className="dashboard-two-col-grid">

        {/* Distribución de producciones modernizada */}
        <ActividadProductivaWidget
          distribProds={distribProds as Array<{ name: string; value: number }>}
          loading={loading}
          title="Actividad Productiva"
          subtitle="Distribución por tipo de producción"
        />

        {/* Actividad financiera reciente */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Actividad Reciente</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Últimos movimientos financieros</p>
            </div>
            <a href="/dashboard/finanzas" style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 8 }} />)}
            </div>
          ) : !movimientosRecientes || movimientosRecientes.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
              Sin movimientos contables recientes
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {movimientosRecientes.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.tipo === 'INGRESO' ? '#4ade80' : '#f87171', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titulo}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{m.fecha?.split('T')[0]}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.tipo === 'INGRESO' ? '#4ade80' : '#f87171', flexShrink: 0, marginLeft: 8 }}>
                    {m.tipo === 'INGRESO' ? '+' : '-'}{formatCOP(m.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. ACCESOS RÁPIDOS ────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Accesos rápidos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { label: 'Fincas', href: '/dashboard/fincas', icon: <MapPin size={16} />, color: '#10b981' },
            { label: 'Producciones', href: '/dashboard/producciones', icon: <Sprout size={16} />, color: '#0ea5e9' },
            { label: 'Inventario', href: '/dashboard/inventario', icon: <Package size={16} />, color: '#f59e0b' },
            { label: 'Finanzas', href: '/dashboard/finanzas', icon: <DollarSign size={16} />, color: '#16a34a' },
            { label: 'Maquinaria', href: '/dashboard/maquinaria', icon: <Wrench size={16} />, color: '#f59e0b' },
            { label: 'Personal', href: '/dashboard/personal', icon: <Users size={16} />, color: '#8b5cf6' },
            { label: 'Clima', href: '/dashboard/clima', icon: <CloudSun size={16} />, color: '#0ea5e9' },
            { label: 'AgroIA', href: '/dashboard/ai', icon: <BarChart3 size={16} />, color: '#8b5cf6' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text)', textDecoration: 'none', fontSize: 12, fontWeight: 600, textAlign: 'center', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <span style={{ color: item.color }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    fincas: 0,
    fincasData: [],
    producciones: 0,
    ingresos: 0,
    gastos: 0,
    alertasInventario: 0,
    empleados: 0,
    resumenFinanciero: [],
    distribProds: [],
    movimientosRecientes: [],
    loading: true,
  });

  const loadData = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    try {
      const [fincasRes, prodsRes, alertasRes, finanzasRes, resumenRes] = await Promise.allSettled([
        fincasApi.getAll(),
        produccionesApi.getAll(),
        inventarioApi.alertas(),
        finanzasApi.getAll(),
        finanzasApi.resumen(),
      ]);

      const fincas = fincasRes.status === 'fulfilled' ? fincasRes.value.data : [];
      const prods = prodsRes.status === 'fulfilled' ? prodsRes.value.data : [];
      const alertas = alertasRes.status === 'fulfilled' ? alertasRes.value.data : [];
      const transacciones = finanzasRes.status === 'fulfilled' ? (finanzasRes.value.data || []) : [];
      const resumen = resumenRes.status === 'fulfilled' ? resumenRes.value.data : null;

      let totalIngresos = Number(resumen?.totalIngresos ?? resumen?.totalIncome ?? 0);
      let totalGastos = Number(resumen?.totalGastos ?? resumen?.totalExpenses ?? 0);
      let meses: any[] = Array.isArray(resumen?.resumenMensual) ? resumen.resumenMensual : [];

      // Si meses está vacío o todos los meses son 0, pero existen transacciones en finanzasApi.getAll(),
      // realizamos agregación mensual inteligente del lado del cliente
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const allZeros = meses.length === 0 || meses.every((m: any) => (m.ingresos || 0) === 0 && (m.gastos || 0) === 0);

      if (allZeros && transacciones.length > 0) {
        const monthlyBuckets: Record<string, { mes: string; sortKey: string; ingresos: number; gastos: number }> = {};
        for (const t of transacciones) {
          const rawDate = t.fecha || t.date;
          const d = rawDate ? new Date(rawDate) : null;
          if (d && !isNaN(d.getTime())) {
            const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = monthNames[d.getMonth()];
            if (!monthlyBuckets[sortKey]) {
              monthlyBuckets[sortKey] = { mes: label, sortKey, ingresos: 0, gastos: 0 };
            }
            const monto = Number(t.monto ?? t.amount ?? 0);
            const tipo = String(t.tipo || t.type || '').toUpperCase();
            if (tipo === 'INGRESO') {
              monthlyBuckets[sortKey].ingresos += monto;
            } else if (tipo === 'GASTO') {
              monthlyBuckets[sortKey].gastos += monto;
            }
          }
        }
        const sorted = Object.values(monthlyBuckets).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        if (sorted.length > 0) {
          meses = sorted.slice(-6);
        }
      }

      if (totalIngresos === 0 && totalGastos === 0 && transacciones.length > 0) {
        totalIngresos = transacciones
          .filter((t: any) => String(t.tipo || t.type || '').toUpperCase() === 'INGRESO')
          .reduce((s: number, t: any) => s + Number(t.monto ?? t.amount ?? 0), 0);
        totalGastos = transacciones
          .filter((t: any) => String(t.tipo || t.type || '').toUpperCase() === 'GASTO')
          .reduce((s: number, t: any) => s + Number(t.monto ?? t.amount ?? 0), 0);
      }

      const recientes: MovimientoReciente[] = transacciones
        .slice()
        .sort((a: any, b: any) => new Date(b.fecha || b.date).getTime() - new Date(a.fecha || a.date).getTime())
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          tipo: (t.tipo || t.type || 'INGRESO') as 'INGRESO' | 'GASTO',
          titulo: t.concepto || t.description || t.descripcion || t.categoria || t.category || 'Movimiento',
          detalle: t.finca?.nombre || t.finca?.name || t.categoria || t.category || '',
          monto: Number(t.monto ?? t.amount ?? 0),
          fecha: t.fecha || t.date,
        }));

      const tiposMap: Record<string, number> = {};
      (prods as Array<{ tipo?: string; type?: string }>).forEach((p) => {
        const tKey = p.tipo || p.type || 'OTRO';
        tiposMap[tKey] = (tiposMap[tKey] || 0) + 1;
      });

      setData({
        fincas: fincas.length,
        fincasData: fincas.map((f: any) => ({ id: f.id, nombre: f.nombre, lat: f.lat ?? f.latitude, lon: f.lon ?? f.longitude })),
        producciones: prods.length,
        ingresos: totalIngresos,
        gastos: totalGastos,
        alertasInventario: (alertas as unknown[]).length,
        empleados: 0,
        resumenFinanciero: meses,
        distribProds: Object.entries(tiposMap).map(([name, value]) => ({ name, value })),
        movimientosRecientes: recientes,
        loading: false,
      });
    } catch (err) {
      console.error(err);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const rol = user?.rol ?? '';

  const rolLabel: Record<string, string> = {
    SUPERADMIN: 'Super Administrador',
    PROPIETARIO: 'Propietario',
    ADMIN: 'Administrador',
    AGRONOMO: 'Agrónomo',
    TRABAJADOR: 'Trabajador de Campo',
    CONTADOR: 'Contador',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
            Bienvenido, {user?.nombre?.split(' ')[0]}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
            {rolLabel[rol] && (
              <>
                <span style={{ color: 'var(--color-border)' }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {rolLabel[rol]}
                </span>
              </>
            )}
          </div>
        </div>
        <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* Alertas globales (richAlerts) */}
      {data.richAlerts && data.richAlerts.length > 0 && (
        <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.richAlerts.map((alerta) => {
            const isCritical = alerta.type === 'CRITICAL';
            const isWarning = alerta.type === 'WARNING';
            const bg = isCritical ? 'rgba(239,68,68,0.1)' : isWarning ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.08)';
            const border = isCritical ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.25)';
            const textColor = isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#38bdf8';
            return (
              <div key={alerta.id} style={{ padding: '16px 20px', background: bg, border: `1px solid ${border}`, borderRadius: 14, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <AlertTriangle size={20} color={textColor} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{alerta.title}</div>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, color: textColor }}>{alerta.source}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{alerta.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contenido por rol */}
      {rol === 'AGRONOMO' && <AgronomoDashboard data={data} />}
      {rol === 'TRABAJADOR' && <TrabajadorDashboard data={data} />}
      {rol === 'CONTADOR' && <ContadorDashboard data={data} />}
      {(rol === 'PROPIETARIO' || rol === 'ADMIN' || rol === 'SUPERADMIN' || rol === '') && (
        <EjecutivoDashboard data={data} />
      )}
    </div>
  );
}
