'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { fincasApi, finanzasApi, produccionesApi, inventarioApi } from '@/lib/api';
import {
  MapPin,
  Sprout,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Tractor,
  Users,
  CloudSun,
  Wrench,
  BarChart3,
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  Scale,
  CalendarDays,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'cyan';
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}

function StatCard({ label, value, subtitle, icon, color, trend, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card stat-card-${color}`}
      style={{
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div
          className={`stat-icon-${color}`}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: trend.positive ? '#4ade80' : '#f87171',
            }}
          >
            {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>{subtitle}</div>
      )}
      {onClick && (
        <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          Ver detalle &rarr;
        </div>
      )}
    </div>
  );
}

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444'];

// ─── Role-Based Dashboard Views ──────────────────────────────────────────────

interface MovimientoReciente {
  id: string | number;
  tipo: 'INGRESO' | 'GASTO';
  titulo: string;
  detalle: string;
  monto: number;
  fecha: string;
}

interface DashboardData {
  fincas: number;
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

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

/** Dashboard para AGRONOMO: enfocado en producción y campo */
function AgronomoDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, fincas, producciones, alertasInventario, distribProds } = data;

  return (
    <>
      {/* KPI Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard
            label="Fincas a cargo"
            value={fincas}
            icon={<MapPin size={20} />}
            color="green"
            onClick={() => router.push('/dashboard/fincas')}
          />
          <StatCard
            label="Cultivos activos"
            value={producciones}
            icon={<Sprout size={20} />}
            color="blue"
            onClick={() => router.push('/dashboard/producciones')}
          />
          <StatCard
            label="Alertas de insumos"
            value={alertasInventario}
            subtitle={alertasInventario > 0 ? 'Requieren atención' : 'Stock en orden'}
            icon={<Package size={20} />}
            color={alertasInventario > 0 ? 'red' : 'green'}
            onClick={() => router.push('/dashboard/inventario')}
          />
        </div>
      )}

      {/* Distribución de cultivos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Tipos de Cultivo</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Distribución por especie</p>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : (distribProds as Array<{ name: string; value: number }>).length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
              <div style={{ textAlign: 'center' }}>
                <Sprout size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>Sin producciones registradas</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distribProds as Array<{ name: string; value: number }>}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(distribProds as Array<{ name: string; value: number }>).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: 'var(--color-text)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Panel Agronomo</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Accesos rapidos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Ver Fincas y Parcelas', href: '/dashboard/fincas', icon: <MapPin size={16} /> },
              { label: 'Gestionar Producciones', href: '/dashboard/producciones', icon: <Sprout size={16} /> },
              { label: 'Consultar Clima Agricola', href: '/dashboard/clima', icon: <CloudSun size={16} /> },
              { label: 'Revisar Inventario de Insumos', href: '/dashboard/inventario', icon: <Package size={16} /> },
              { label: 'Consultar AgroIA', href: '/dashboard/ai', icon: <BarChart3 size={16} /> },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: 10,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background 0.2s',
                }}
              >
                <span style={{ color: 'var(--color-primary)' }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Dashboard para TRABAJADOR: operacional */
function TrabajadorDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, fincas, producciones, alertasInventario } = data;

  return (
    <>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard
            label="Predios asignados"
            value={fincas}
            icon={<MapPin size={20} />}
            color="green"
            onClick={() => router.push('/dashboard/fincas')}
          />
          <StatCard
            label="Cultivos en marcha"
            value={producciones}
            icon={<Sprout size={20} />}
            color="blue"
            onClick={() => router.push('/dashboard/producciones')}
          />
          <StatCard
            label="Alertas de stock"
            value={alertasInventario}
            subtitle={alertasInventario > 0 ? 'Informar al responsable' : 'Sin alertas'}
            icon={<Package size={20} />}
            color={alertasInventario > 0 ? 'red' : 'green'}
            onClick={() => router.push('/dashboard/inventario')}
          />
        </div>
      )}

      <div className="card" style={{ padding: '24px', marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Modulos operacionales</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Accesos rapidos para tareas de campo</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Fincas', href: '/dashboard/fincas', icon: <MapPin size={18} />, desc: 'Ver predios y parcelas' },
            { label: 'Producciones', href: '/dashboard/producciones', icon: <Sprout size={18} />, desc: 'Seguimiento de cultivos' },
            { label: 'Clima', href: '/dashboard/clima', icon: <CloudSun size={18} />, desc: 'Condiciones del dia' },
            { label: 'Maquinaria', href: '/dashboard/maquinaria', icon: <Tractor size={18} />, desc: 'Estado del equipo' },
            { label: 'Inventario', href: '/dashboard/inventario', icon: <Package size={18} />, desc: 'Insumos disponibles' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '14px 16px',
                background: 'rgba(14, 165, 233, 0.06)',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                borderRadius: 12,
                color: 'var(--color-text)',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              <span style={{ color: '#0ea5e9' }}>{item.icon}</span>
              <span style={{ fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

/** Dashboard para CONTADOR: financiero */
function ContadorDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, ingresos, gastos, resumenFinanciero } = data;
  const balance = ingresos - gastos;

  return (
    <>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard
            label="Ingresos totales"
            value={formatCOP(ingresos)}
            icon={<ArrowUpCircle size={20} />}
            color="green"
            trend={{ value: 8.2, positive: true }}
            onClick={() => router.push('/dashboard/finanzas')}
          />
          <StatCard
            label="Gastos totales"
            value={formatCOP(gastos)}
            icon={<ArrowDownCircle size={20} />}
            color="red"
            onClick={() => router.push('/dashboard/finanzas')}
          />
          <StatCard
            label="Balance neto"
            value={formatCOP(balance)}
            subtitle={balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
            icon={<Scale size={20} />}
            color={balance >= 0 ? 'blue' : 'red'}
            onClick={() => router.push('/dashboard/finanzas')}
          />
          <StatCard
            label="Modulo financiero"
            value="Ver"
            subtitle="Ir al detalle completo"
            icon={<Coins size={20} />}
            color="amber"
            onClick={() => router.push('/dashboard/finanzas')}
          />
        </div>
      )}

      {/* Financial Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Flujo de Caja</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Ultimos 6 meses — Ingresos vs Gastos</p>
          {loading ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resumenFinanciero as Array<{ mes: string; ingresos: number; gastos: number }>}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,61,42,0.5)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: 'var(--color-text)',
                    fontSize: 13,
                  }}
                  formatter={(value) => [formatCOP(Number(value || 0))]}
                />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Accesos Financieros</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Modulos del area contable</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Finanzas', href: '/dashboard/finanzas', icon: <DollarSign size={16} /> },
              { label: 'Personal y Nomina', href: '/dashboard/personal', icon: <Users size={16} /> },
              { label: 'Inventario', href: '/dashboard/inventario', icon: <Package size={16} /> },
              { label: 'Reportes', href: '/dashboard/ai', icon: <BarChart3 size={16} /> },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  borderRadius: 10,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <span style={{ color: '#f59e0b' }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Dashboard ejecutivo para PROPIETARIO / ADMIN / SUPERADMIN */
function EjecutivoDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { loading, fincas, producciones, ingresos, gastos, alertasInventario, resumenFinanciero, distribProds, movimientosRecientes } = data;

  return (
    <>
      {/* 1. RESUMEN: 4 INDICADORES ESENCIALES */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard
            label="Fincas Registradas"
            value={fincas}
            icon={<MapPin size={20} />}
            color="green"
            onClick={() => router.push('/dashboard/fincas')}
          />
          <StatCard
            label="Producciones Activas"
            value={producciones}
            icon={<Sprout size={20} />}
            color="blue"
            onClick={() => router.push('/dashboard/producciones')}
          />
          <StatCard
            label="Ingresos Totales"
            value={formatCOP(ingresos)}
            icon={<TrendingUp size={20} />}
            color="green"
            onClick={() => router.push('/dashboard/finanzas')}
          />
          <StatCard
            label="Gastos Totales"
            value={formatCOP(gastos)}
            icon={<TrendingDown size={20} />}
            color="red"
            onClick={() => router.push('/dashboard/finanzas')}
          />
        </div>
      )}

      {/* 2. GRÁFICAS: INGRESOS VS GASTOS & ACTIVIDAD PRODUCTIVA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
        
        {/* Ingresos vs Gastos (Gráfica Principal Comparativa) */}
        <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Ingresos vs Gastos</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Histórico financiero de los últimos 6 meses</p>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>Ingresos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>Gastos</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ) : !resumenFinanciero || (resumenFinanciero as any[]).every(m => m.ingresos === 0 && m.gastos === 0) ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: 13, textAlign: 'center' }}>
              <div>
                <BarChart3 size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>Sin datos financieros registrados</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={resumenFinanciero as Array<{ mes: string; ingresos: number; gastos: number }>}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,61,42,0.4)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: 'var(--color-text)',
                    fontSize: 13,
                  }}
                  formatter={(value) => [formatCOP(Number(value || 0))]}
                />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" strokeWidth={2.5} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={2.5} fill="url(#colorGastos)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Actividad Productiva (Distribución de Cultivos y Rubros) */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Actividad Productiva</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Distribución por tipo de actividad</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ) : (distribProds as Array<{ name: string; value: number }>).length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-subtle)', fontSize: 13, textAlign: 'center' }}>
              <div>
                <Sprout size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>Sin ciclos productivos activos</p>
              </div>
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={distribProds as Array<{ name: string; value: number }>}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(distribProds as Array<{ name: string; value: number }>).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      color: 'var(--color-text)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {(distribProds as Array<{ name: string; value: number }>).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>{item.name}</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. ALERTAS Y ANÁLISIS OPERATIVO (Compacto) */}
      <div style={{ marginBottom: 28 }}>
        {alertasInventario > 0 ? (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginRight: 8 }}>
                  Atención Operativa:
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {alertasInventario} insumo(s) alcanzaron stock mínimo crítico.
                </span>
              </div>
            </div>
            <a
              href="/dashboard/inventario"
              style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', textDecoration: 'underline' }}
            >
              Ver insumos &rarr;
            </a>
          </div>
        ) : (
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Operaciones al día · Insumos y predios en condiciones normales.
            </span>
          </div>
        )}
      </div>

      {/* 4. ACTIVIDAD RECIENTE */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Actividad Reciente</h3>
          <a href="/dashboard/finanzas" style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Ver todos los movimientos &rarr;
          </a>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
          </div>
        ) : !movimientosRecientes || movimientosRecientes.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
            Sin movimientos contables recientes registrados
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {movimientosRecientes.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`badge ${m.tipo === 'INGRESO' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                    {m.tipo === 'INGRESO' ? '↑ Ingreso' : '↓ Gasto'}
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{m.titulo}</span>
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: 8, fontSize: 12 }}>{m.detalle}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                    {m.fecha?.split('T')[0]}
                  </span>
                  <span style={{ fontWeight: 700, color: m.tipo === 'INGRESO' ? '#4ade80' : '#f87171' }}>
                    {formatCOP(m.monto)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    fincas: 0,
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

      let totalIngresos = resumen?.totalIngresos || 0;
      let totalGastos = resumen?.totalGastos || 0;
      let meses: any[] = resumen?.resumenMensual || [];

      // Si resumenMensual no vino de la API, calcular de transacciones
      if (meses.length === 0 && transacciones.length > 0) {
        totalIngresos = transacciones.filter((t: any) => t.tipo === 'INGRESO').reduce((s: number, t: any) => s + (t.monto || 0), 0);
        totalGastos = transacciones.filter((t: any) => t.tipo === 'GASTO').reduce((s: number, t: any) => s + (t.monto || 0), 0);
      }

      // 5 transacciones más recientes
      const recientes: MovimientoReciente[] = transacciones
        .slice()
        .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          tipo: t.tipo,
          titulo: t.concepto || t.categoria || 'Movimiento',
          detalle: t.finca?.nombre || t.categoria || '',
          monto: t.monto || 0,
          fecha: t.fecha,
        }));

      // Production type distribution
      const tiposMap: Record<string, number> = {};
      (prods as Array<{ tipo: string }>).forEach((p) => {
        tiposMap[p.tipo] = (tiposMap[p.tipo] || 0) + 1;
      });

      setData({
        fincas: fincas.length,
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rol = user?.rol ?? '';

  // Role label for display
  const rolLabel: Record<string, string> = {
    SUPERADMIN: 'Super Administrador',
    PROPIETARIO: 'Propietario',
    ADMIN: 'Administrador',
    AGRONOMO: 'Agronomo',
    TRABAJADOR: 'Trabajador de Campo',
    CONTADOR: 'Contador',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}
          >
            Bienvenido, {user?.nombre?.split(' ')[0]}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
            {rolLabel[rol] && (
              <>
                <span style={{ color: 'var(--color-border)' }}>·</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  {rolLabel[rol]}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      {/* Global Alerts panel for real-data notifications */}
      {data.richAlerts && data.richAlerts.length > 0 && (
        <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.richAlerts.map((alerta) => {
            const isCritical = alerta.type === 'CRITICAL';
            const isWarning = alerta.type === 'WARNING';
            const bg = isCritical ? 'rgba(239,68,68,0.1)' : isWarning ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.08)';
            const border = isCritical ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.25)';
            const textColor = isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#38bdf8';
            
            return (
              <div
                key={alerta.id}
                style={{
                  padding: '16px 20px',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <AlertTriangle size={20} color={textColor} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>
                      {alerta.title}
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, color: textColor }}>
                      {alerta.source}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {alerta.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role-specific content */}
      {(rol === 'AGRONOMO') && <AgronomoDashboard data={data} />}
      {(rol === 'TRABAJADOR') && <TrabajadorDashboard data={data} />}
      {(rol === 'CONTADOR') && <ContadorDashboard data={data} />}
      {(rol === 'PROPIETARIO' || rol === 'ADMIN' || rol === 'SUPERADMIN' || rol === '') && (
        <EjecutivoDashboard data={data} />
      )}
    </div>
  );
}
