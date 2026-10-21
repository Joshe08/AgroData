'use client';

import { Bot, ExternalLink, Sprout, Package, DollarSign, Wrench, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AgroIAWidgetProps {
  alertasInventario: number;
  producciones: number;
  fincas: number;
  balance: number;
}

export default function AgroIAWidget({ alertasInventario, producciones, fincas, balance }: AgroIAWidgetProps) {
  const router = useRouter();

  // Generar sugerencia contextual basada en datos reales del sistema
  const getSugerencia = (): {
    texto: string;
    icono: React.ReactNode;
    color: string;
    href: string;
    query?: string;
  } => {
    if (alertasInventario > 0) {
      return {
        texto: `${alertasInventario} insumo(s) con stock bajo en bodega. Revisa qué comprar primero para no detener las labores de campo.`,
        icono: <Package size={16} />,
        color: '#f59e0b',
        href: '/dashboard/inventario',
      };
    }
    if (producciones === 0) {
      return {
        texto: 'No hay producciones activas. Planifica el próximo ciclo productivo según la época del año y las condiciones de tus fincas.',
        icono: <Sprout size={16} />,
        color: '#10b981',
        href: '/dashboard/producciones',
      };
    }
    if (balance < 0) {
      return {
        texto: 'El balance financiero es negativo. Consulta el detalle de gastos e ingresos por categoría.',
        icono: <DollarSign size={16} />,
        color: '#ef4444',
        href: '/dashboard/finanzas',
      };
    }
    if (fincas === 0) {
      return {
        texto: 'Registra tu primera finca para obtener recomendaciones personalizadas sobre manejo agropecuario y clima.',
        icono: <Sprout size={16} />,
        color: '#10b981',
        href: '/dashboard/fincas',
      };
    }
    return {
      texto: `Con ${fincas} finca(s) y ${producciones} producción(es) activa(s), identifica oportunidades de mejora en rendimiento y costos.`,
      icono: <Wrench size={16} />,
      color: '#8b5cf6',
      href: '/dashboard/ai',
      query: '¿Cuál es el diagnóstico integral de la organización y dónde hay oportunidades de mejora?',
    };
  };

  const sugerencia = getSugerencia();

  const handleSugerenciaClick = () => {
    if (sugerencia.query) {
      router.push(`/dashboard/ai?q=${encodeURIComponent(sugerencia.query)}`);
    } else {
      router.push(sugerencia.href);
    }
  };

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

      {/* Sugerencia contextual — clic lleva al módulo correspondiente */}
      <div
        onClick={handleSugerenciaClick}
        style={{
          padding: '12px 14px',
          background: 'rgba(139,92,246,0.06)',
          borderRadius: 10,
          marginBottom: 14,
          cursor: 'pointer',
          transition: 'background 0.15s',
          border: '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(139,92,246,0.12)';
          e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(139,92,246,0.06)';
          e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: sugerencia.color, flexShrink: 0, marginTop: 1 }}>{sugerencia.icono}</span>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5, flex: 1 }}>
            {sugerencia.texto}
          </p>
          <ArrowRight size={14} style={{ color: sugerencia.color, flexShrink: 0, marginTop: 2 }} />
        </div>
      </div>

      {/* Botón consultar AgroIA */}
      <button
        onClick={() => router.push('/dashboard/ai')}
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
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
      >
        <Bot size={14} />
        Consultar AgroIA
        <ExternalLink size={11} />
      </button>
    </div>
  );
}
