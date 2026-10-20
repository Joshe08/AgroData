'use client';

import { Bot, ExternalLink, Sprout, Package, DollarSign, Wrench } from 'lucide-react';
import Link from 'next/link';

interface AgroIAWidgetProps {
  alertasInventario: number;
  producciones: number;
  fincas: number;
  balance: number;
}

export default function AgroIAWidget({ alertasInventario, producciones, fincas, balance }: AgroIAWidgetProps) {
  // Generar sugerencia contextual basada en datos reales del sistema
  const getSugerencia = (): { texto: string; icono: React.ReactNode; color: string } => {
    if (alertasInventario > 0) {
      return {
        texto: `Tienes ${alertasInventario} insumo(s) con stock bajo. Consulta a AgroIA sobre qué comprar primero y cómo optimizar el inventario crítico.`,
        icono: <Package size={16} />,
        color: '#f59e0b',
      };
    }
    if (producciones === 0) {
      return {
        texto: 'No hay producciones activas. AgroIA puede ayudarte a planificar el próximo ciclo productivo según la época del año y las condiciones de tus fincas.',
        icono: <Sprout size={16} />,
        color: '#10b981',
      };
    }
    if (balance < 0) {
      return {
        texto: 'El balance financiero es negativo. AgroIA puede analizar los gastos actuales y sugerir estrategias de reducción de costos para tu operación.',
        icono: <DollarSign size={16} />,
        color: '#ef4444',
      };
    }
    if (fincas === 0) {
      return {
        texto: 'Registra tu primera finca para que AgroIA pueda darte recomendaciones personalizadas sobre manejo agropecuario y clima.',
        icono: <Sprout size={16} />,
        color: '#10b981',
      };
    }
    return {
      texto: `Con ${fincas} finca(s) y ${producciones} producción(es) activa(s), AgroIA puede ayudarte a identificar oportunidades de mejora en rendimiento y costos.`,
      icono: <Wrench size={16} />,
      color: '#8b5cf6',
    };
  };

  const sugerencia = getSugerencia();

  return (
    <div
      className="card"
      style={{
        padding: '20px 22px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(16,185,129,0.04) 100%)',
        border: '1px solid rgba(139,92,246,0.18)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={16} color="#8b5cf6" />
        </div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>AgroIA</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginLeft: 6 }}>Asistente inteligente</span>
        </div>
      </div>

      {/* Sugerencia contextual */}
      <div style={{ padding: '12px 14px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: sugerencia.color, flexShrink: 0, marginTop: 1 }}>{sugerencia.icono}</span>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            {sugerencia.texto}
          </p>
        </div>
      </div>

      {/* Nota de transparencia */}
      <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 12, lineHeight: 1.4 }}>
        Esta sugerencia se genera a partir de los datos reales del sistema. Para un análisis completo, consulta AgroIA directamente.
      </p>

      <Link
        href="/dashboard/ai"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: '#8b5cf6',
          textDecoration: 'none',
          padding: '8px 14px',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 8,
          transition: 'background 0.15s',
        }}
      >
        <Bot size={14} />
        Consultar AgroIA
        <ExternalLink size={11} />
      </Link>
    </div>
  );
}
