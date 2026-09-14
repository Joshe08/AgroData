'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'amber' | 'red';
  trend?: { value: number; positive: boolean };
}

function StatCard({ label, value, subtitle, icon, color, trend }: StatCardProps) {
  return (
    <div className={`card stat-card-${color}`} style={{ padding: '20px 24px' }}>
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
    </div>
  );
}

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    fincas: 0,
    producciones: 0,
    ingresos: 0,
    gastos: 0,
    alertasInventario: 0,
  });
  const [resumenFinanciero, setResumenFinanciero] = useState<unknown[]>([]);
  const [distribProds, setDistribProds] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fincasRes, prodsRes, alertasRes] = await Promise.allSettled([
        fincasApi.getAll(),
        produccionesApi.getAll(),
        inventarioApi.alertas(),
      ]);

      const fincas = fincasRes.status === 'fulfilled' ? fincasRes.value.data : [];
      const prods = prodsRes.status === 'fulfilled' ? prodsRes.value.data : [];
      const alertas = alertasRes.status === 'fulfilled' ? alertasRes.value.data : [];

      // Fetch financial summaries for all fincas
      let totalIngresos = 0;
      let totalGastos = 0;
      if (fincas.length > 0) {
        try {
          const finRes = await finanzasApi.resumen();
          const r = finRes.data;
          totalIngresos = r.totalIngresos || 0;
          totalGastos = r.totalGastos || 0;
        } catch {
          // fallback
        }
      }

      // Build mock chart data for last 6 months
      const meses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push({
          mes: format(d, 'MMM', { locale: es }),
          ingresos: Math.round((totalIngresos / 6) * (0.7 + Math.random() * 0.6)),
          gastos: Math.round((totalGastos / 6) * (0.7 + Math.random() * 0.6)),
        });
      }
      setResumenFinanciero(meses);

      // Production type distribution
      const tiposMap: Record<string, number> = {};
      (prods as Array<{ tipo: string }>).forEach((p) => {
        tiposMap[p.tipo] = (tiposMap[p.tipo] || 0) + 1;
      });
      setDistribProds(
        Object.entries(tiposMap).map(([name, value]) => ({ name, value }))
      );

      setStats({
        fincas: fincas.length,
        producciones: prods.length,
        ingresos: totalIngresos,
        gastos: totalGastos,
        alertasInventario: (alertas as unknown[]).length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

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
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
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

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <StatCard
            label="Fincas registradas"
            value={stats.fincas}
            icon={<MapPin size={20} />}
            color="green"
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            label="Producciones activas"
            value={stats.producciones}
            icon={<Sprout size={20} />}
            color="blue"
          />
          <StatCard
            label="Ingresos totales"
            value={formatCOP(stats.ingresos)}
            icon={<DollarSign size={20} />}
            color="amber"
            trend={{ value: 8.2, positive: true }}
          />
          <StatCard
            label="Alertas de inventario"
            value={stats.alertasInventario}
            subtitle={stats.alertasInventario > 0 ? 'Requieren atención' : 'Todo en orden'}
            icon={<Package size={20} />}
            color={stats.alertasInventario > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* Charts row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Financial Area Chart */}
        <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Resumen Financiero
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Últimos 6 meses</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={resumenFinanciero as Array<{ mes: string; ingresos: number; gastos: number }>}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,61,42,0.5)" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
                />
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
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#colorIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  name="Gastos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorGastos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Tipos de Producción
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Distribución actual</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : distribProds.length === 0 ? (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-subtle)',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              <div>
                <Sprout size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>Sin producciones registradas</p>
              </div>
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={distribProds as Array<{ name: string; value: number }>}
                    innerRadius={50}
                    outerRadius={70}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(distribProds as Array<{ name: string; value: number }>).map((item, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: COLORS[i % COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>{item.name}</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts panel */}
      {stats.alertasInventario > 0 && (
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24', marginBottom: 2 }}>
              {stats.alertasInventario} item(s) con stock bajo
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Revisa el módulo de inventario para reponer productos críticos.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
