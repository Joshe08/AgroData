'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Sprout,
  Lock,
  Mail,
  Loader2,
  CloudSun,
  MapPin,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [localLoading, setLocalLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Redirigir automáticamente si ya existe una sesión válida
  useEffect(() => {
    if (typeof window !== 'undefined' && !isSubmittingRef.current) {
      const token = localStorage.getItem('agrodata_token');
      if (user && token) {
        if (user.rol === 'SUPERADMIN') {
          router.replace('/dashboard-saas');
        } else {
          router.replace('/dashboard');
        }
      }
    }
  }, [router, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current || localLoading || isLoading) return;

    const emailTrimmed = form.email.trim();
    if (!emailTrimmed || !form.password) return;

    isSubmittingRef.current = true;
    setLocalLoading(true);
    clearError();
    setSuccess(false);

    try {
      await login(emailTrimmed, form.password);
      setSuccess(true);

      const currentUser = useAuthStore.getState().user;
      const target = currentUser?.rol === 'SUPERADMIN' ? '/dashboard-saas' : '/dashboard';
      router.replace(target);
    } catch {
      isSubmittingRef.current = false;
      setLocalLoading(false);
    }
  };

  const busy = localLoading || isLoading;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'radial-gradient(ellipse at 20% 50%, #06170d 0%, #030a06 60%, #020503 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ambient gradients */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* LEFT PANEL: HERO / BRANDING (Visible on tablets and desktops >= 1024px) */}
      <section
        className="login-hero-panel"
        style={{
          flex: 1.1,
          display: 'none',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 56px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Sprout size={24} color="#ffffff" />
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
              AgroData <span style={{ color: '#4ade80' }}>SaaS</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
              Inteligencia y Gestión Agropecuaria
            </div>
          </div>
        </div>

        {/* Center Hero Message */}
        <div style={{ maxWidth: 520, margin: '48px 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#4ade80',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <ShieldCheck size={14} />
            Plataforma Multitenant Empresarial
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: 42,
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: '-0.03em',
            }}
          >
            Toma de decisiones{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #4ade80 0%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              basada en datos reales
            </span>{' '}
            para el campo.
          </h1>

          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 16, lineHeight: 1.6, marginBottom: 36 }}>
            Monitorea predios por satélite, controla ciclos de cultivo y ganadería, administra inventarios en bodega, analiza finanzas y recibe alertas agronómicas en tiempo real.
          </p>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <MapPin size={20} style={{ color: '#4ade80', marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>Mapeo Satelital</div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>Predios georreferenciados y parcelas</div>
            </div>

            <div
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <CloudSun size={20} style={{ color: '#38bdf8', marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>Clima Agrícola Real</div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>Alertas de lluvia, radiación UV y viento</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
          © {new Date().getFullYear()} AgroData. Todos los derechos reservados.
        </div>
      </section>

      {/* RIGHT PANEL: LOGIN FORM (Full width on mobile, 480px on desktop) */}
      <section
        style={{
          flex: 0.9,
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: 'rgba(15, 23, 18, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: '36px 32px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Mobile Brand Header */}
          <div className="mobile-brand-header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sprout size={20} color="#ffffff" />
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>AgroData</div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Gestión Agrícola Inteligente</div>
            </div>
          </div>

          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: '#ffffff' }}>
            Iniciar sesión
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, marginBottom: 28 }}>
            Ingresa tus credenciales para acceder a tu plataforma
          </p>

          {/* Feedback Messages */}
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 12,
                marginBottom: 20,
                color: '#fca5a5',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: 12,
                marginBottom: 20,
                color: '#86efac',
                fontSize: 13,
              }}
            >
              <CheckCircle size={17} style={{ flexShrink: 0 }} />
              <span>Credenciales correctas. Ingresando al panel...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                htmlFor="login-email"
                style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 8 }}
              >
                Correo electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={busy}
                  placeholder="nombre@empresa.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    color: '#ffffff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label
                  htmlFor="login-password"
                  style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  Contraseña
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  disabled={busy}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 42px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    color: '#ffffff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={busy}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.5)',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                background: busy
                  ? 'rgba(16, 185, 129, 0.6)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: busy ? 'none' : '0 6px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>
          </form>
        </div>
      </section>

      <style>{`
        @media (min-width: 1024px) {
          .login-hero-panel {
            display: flex !important;
          }
          .mobile-brand-header {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
