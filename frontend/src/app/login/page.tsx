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
  Sun,
  Moon,
  ArrowRight,
  Layers,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [localLoading, setLocalLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const isSubmittingRef = useRef(false);

  // Inicializar y sincronizar tema con localStorage y documentElement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('agrodata_theme') as 'light' | 'dark' | null;
      const initial = savedTheme || 'light';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrodata_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  };

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

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    setTimeout(() => {
      useToastStore.getState().info('Si el correo está registrado, recibirás un enlace de restablecimiento.');
    }, 400);
  };

  const busy = localLoading || isLoading;
  const isDark = theme === 'dark';

  return (
    <main
      className="login-container-root"
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundImage: `url('/images/login-bg-hq.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 35%',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: isDark ? '#f1f5f9' : '#0f172a',
        overflowX: 'hidden',
      }}
    >
      {/* Overlay sutil: En modo oscuro solo un velo tenue (35%) para que la foto NUNCA se pierda */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(10, 15, 29, 0.45) 100%)'
            : 'radial-gradient(ellipse at 85% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ========================================================= */}
      {/* TOP HEADER: BRAND + THEME TOGGLE (ÚNICO BOTÓN DE TEMA)    */}
      {/* ========================================================= */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          width: '100%',
          maxWidth: 1680,
          margin: '0 auto',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0d9488 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px -3px rgba(13, 148, 136, 0.45)',
              flexShrink: 0,
            }}
          >
            <Sprout size={24} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div
              className="font-display"
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: isDark ? '#ffffff' : '#0f172a',
                textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.8)',
              }}
            >
              AgroData <span style={{ color: '#059669' }}>Cesar</span>
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: isDark ? '#cbd5e1' : '#334155',
                letterSpacing: '-0.01em',
                textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(255,255,255,0.7)',
              }}
            >
              Inteligencia y Gestión Agropecuaria
            </div>
          </div>
        </div>

        {/* Único botón de cambio de tema: Header superior derecho */}
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 6px',
            borderRadius: 9999,
            background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label="Alternar tema de la aplicación"
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: !isDark ? '#ffffff' : 'transparent',
              color: !isDark ? '#d97706' : '#94a3b8',
              boxShadow: !isDark ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Sun size={15} />
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDark ? '#1e293b' : 'transparent',
              color: isDark ? '#38bdf8' : '#94a3b8',
              boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Moon size={14} />
          </div>
        </button>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTENT BODY: MÁS AMPLIO HACIA LOS LADOS             */}
      {/* ========================================================= */}
      <div
        className="login-main-body"
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 56px 36px',
          maxWidth: 1680,
          width: '100%',
          margin: '0 auto',
          gap: 60,
        }}
      >
        {/* ===================================================== */}
        {/* LEFT COLUMN: HERO CON MÁXIMA NITIDEZ Y LEGIBILIDAD     */}
        {/* ===================================================== */}
        <section
          className="login-hero-column"
          style={{
            flex: '1 1 580px',
            maxWidth: 620,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Eyebrow / Overline Tag */}
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#0d9488',
              marginBottom: 12,
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            EL CAMPO EN TUS DATOS
          </div>

          {/* Main H1 Title */}
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(32px, 3.8vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.14,
              letterSpacing: '-0.025em',
              color: isDark ? '#ffffff' : '#0f172a',
              marginBottom: 16,
              textShadow: isDark
                ? '0 2px 10px rgba(0,0,0,0.7)'
                : '0 2px 4px rgba(255,255,255,0.9)',
            }}
          >
            Toma de decisiones <br />
            basada en{' '}
            <span
              style={{
                color: '#00897b',
                fontWeight: 850,
                textShadow: isDark ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              datos reales
            </span>{' '}
            <br />
            para el campo.
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: isDark ? '#f1f5f9' : '#1e293b',
              maxWidth: 520,
              marginBottom: 30,
              fontWeight: 500,
              textShadow: isDark
                ? '0 1px 4px rgba(0,0,0,0.6)'
                : '0 1px 3px rgba(255,255,255,0.85)',
            }}
          >
            Monitorea predios, controla ciclos de cultivo y ganadería, administra inventarios en bodega, analiza finanzas y recibe alertas agronómicas en tiempo real.
          </p>

          {/* 4 Feature Cards con fondo sólido legible (no transparente) */}
          <div
            className="login-feature-pills-row"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              maxWidth: 520,
            }}
          >
            {/* Feature 1: Mapeo Satelital */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(203, 213, 225, 0.8)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(13, 148, 136, 0.15)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <MapPin size={16} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isDark ? '#ffffff' : '#0f172a',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}
                >
                  Mapeo Satelital
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: isDark ? '#94a3b8' : '#475569',
                    lineHeight: 1.35,
                  }}
                >
                  Predios georreferenciados y parcelas
                </div>
              </div>
            </div>

            {/* Feature 2: Clima Agrícola Real */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(203, 213, 225, 0.8)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(13, 148, 136, 0.15)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <CloudSun size={16} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isDark ? '#ffffff' : '#0f172a',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}
                >
                  Clima Agrícola Real
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: isDark ? '#94a3b8' : '#475569',
                    lineHeight: 1.35,
                  }}
                >
                  Alertas de lluvia, UV y viento
                </div>
              </div>
            </div>

            {/* Feature 3: Gestión Ganadera */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(203, 213, 225, 0.8)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(13, 148, 136, 0.15)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Layers size={16} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isDark ? '#ffffff' : '#0f172a',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}
                >
                  Gestión Ganadera
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: isDark ? '#94a3b8' : '#475569',
                    lineHeight: 1.35,
                  }}
                >
                  Inventarios y ciclos de cultivo
                </div>
              </div>
            </div>

            {/* Feature 4: Informes y Analítica */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(203, 213, 225, 0.8)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(13, 148, 136, 0.15)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <TrendingUp size={16} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isDark ? '#ffffff' : '#0f172a',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}
                >
                  Informes y Analítica
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: isDark ? '#94a3b8' : '#475569',
                    lineHeight: 1.35,
                  }}
                >
                  Toma de decisiones inteligentes
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* RIGHT COLUMN: CARD DE LOGIN (SÓLIDA, SIN TRANSPARENCIA) */}
        {/* ===================================================== */}
        <section
          className="login-card-column"
          style={{
            flex: '0 0 auto',
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              background: isDark ? '#0f172a' : '#ffffff',
              borderRadius: 26,
              padding: '36px 34px 26px 34px',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                : '0 25px 60px -15px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(226, 232, 240, 0.9)',
              transition: 'background 0.25s ease, box-shadow 0.25s ease',
            }}
          >
            {/* Top Card Icon: 2 Leaves (Green + Blue) */}
            <div style={{ marginBottom: 14 }}>
              <svg width="44" height="40" viewBox="0 0 44 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Left Leaf (Emerald Green) */}
                <path
                  d="M10 32C10 32 8 20 20 12C20 12 21 24 10 32Z"
                  fill="#059669"
                />
                {/* Right Leaf (Indigo/Cobalt Blue) */}
                <path
                  d="M34 32C34 32 36 20 24 12C24 12 23 24 34 32Z"
                  fill="#2563eb"
                />
                {/* Central connecting stem highlight */}
                <path
                  d="M22 36V28"
                  stroke={isDark ? '#38bdf8' : '#0d9488'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Title & Subtitle */}
            <h2
              className="font-display"
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: isDark ? '#ffffff' : '#0f172a',
                marginBottom: 6,
                letterSpacing: '-0.02em',
              }}
            >
              Iniciar sesión
            </h2>
            <p
              style={{
                fontSize: 12.5,
                color: isDark ? '#94a3b8' : '#475569',
                marginBottom: 24,
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              Ingresa tus credenciales para acceder a tu plataforma
            </p>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid #fca5a5',
                  borderRadius: 12,
                  marginBottom: 18,
                  color: isDark ? '#fca5a5' : '#991b1b',
                  fontSize: 12.5,
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#ef4444' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: isDark ? 'rgba(34, 197, 94, 0.2)' : '#ecfdf5',
                  border: isDark ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid #6ee7b7',
                  borderRadius: 12,
                  marginBottom: 18,
                  color: isDark ? '#86efac' : '#065f46',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={16} style={{ flexShrink: 0, color: '#10b981' }} />
                <span>Credenciales válidas. Ingresando...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Field: Correo electrónico */}
              <div>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    marginBottom: 7,
                  }}
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
                      color: isDark ? '#94a3b8' : '#64748b',
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
                      padding: '11px 14px 11px 40px',
                      background: isDark ? '#1e293b' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      borderRadius: 12,
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: 13.5,
                      fontWeight: 500,
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0d9488';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDark ? '#334155' : '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Field: Contraseña */}
              <div>
                <label
                  htmlFor="login-password"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    marginBottom: 7,
                  }}
                >
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#94a3b8' : '#64748b',
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
                      padding: '11px 42px 11px 40px',
                      background: isDark ? '#1e293b' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      borderRadius: 12,
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: 13.5,
                      fontWeight: 500,
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0d9488';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDark ? '#334155' : '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
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
                      color: isDark ? '#94a3b8' : '#64748b',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: 6,
                  width: '100%',
                  height: 46,
                  borderRadius: 12,
                  border: 'none',
                  background: busy
                    ? '#059669'
                    : 'linear-gradient(90deg, #0d9488 0%, #059669 35%, #2563eb 100%)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: busy ? 'none' : '0 8px 22px -4px rgba(37, 99, 235, 0.45)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!busy) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  if (!busy) e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0d9488',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Horizontal Divider */}
              <div
                style={{
                  height: 1,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  margin: '12px 0 4px',
                }}
              />

              {/* Card Bottom Footer: Único Distintivo de Seguridad Limpio (Sin duplicar modo oscuro) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  paddingTop: 4,
                }}
              >
                <ShieldCheck size={16} color="#059669" />
                <span
                  style={{
                    fontSize: 11.5,
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontWeight: 600,
                  }}
                >
                  Tu información está segura y protegida
                </span>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM FOOTER INFO                                        */}
      {/* ========================================================= */}
      <footer
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11.5,
          color: isDark ? '#cbd5e1' : '#334155',
          maxWidth: 1680,
          width: '100%',
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: 12,
          textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.7)',
        }}
      >
        <div style={{ fontWeight: 600 }}>© {new Date().getFullYear()} AgroData Cesar. Plataforma Integral Agropecuaria.</div>
        <div style={{ display: 'flex', gap: 16, fontWeight: 500 }}>
          <span>Seguridad SSL</span>
          <span>•</span>
          <span>Analítica Predictiva</span>
          <span>•</span>
          <span>Departamento del Cesar</span>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL: RECUPERAR CONTRASEÑA                              */}
      {/* ========================================================= */}
      {forgotModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setForgotModalOpen(false);
            setForgotSent(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #cbd5e1',
              borderRadius: 20,
              padding: 28,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => {
                setForgotModalOpen(false);
                setForgotSent(false);
              }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#94a3b8' : '#64748b',
              }}
            >
              <X size={18} />
            </button>

            <h3
              className="font-display"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isDark ? '#ffffff' : '#0f172a',
                marginBottom: 8,
              }}
            >
              Recuperar contraseña
            </h3>
            <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', marginBottom: 20, lineHeight: 1.5 }}>
              Ingresa el correo electrónico asociado a tu cuenta para enviarte instrucciones de restablecimiento.
            </p>

            {forgotSent ? (
              <div
                style={{
                  padding: '14px 16px',
                  background: isDark ? 'rgba(34, 197, 94, 0.2)' : '#ecfdf5',
                  border: isDark ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid #a7f3d0',
                  borderRadius: 12,
                  color: isDark ? '#86efac' : '#047857',
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 16,
                  fontWeight: 500,
                }}
              >
                ✓ Si el correo coincide con una cuenta activa, te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b', display: 'block', marginBottom: 6 }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tucorreo@empresa.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: isDark ? '#1e293b' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: 13.5,
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '11px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13.5,
                    marginTop: 6,
                  }}
                >
                  Enviar enlace de recuperación
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESPONSIVE CSS INLINE TWEAKS                             */}
      {/* ========================================================= */}
      <style>{`
        @media (max-width: 1024px) {
          .login-main-body {
            flex-direction: column !important;
            align-items: center !important;
            padding: 16px 24px 32px !important;
            gap: 28px !important;
          }
          .login-hero-column {
            max-width: 100% !important;
            text-align: center !important;
            align-items: center !important;
          }
          .login-hero-column p {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .login-feature-pills-row {
            justify-content: center !important;
            text-align: center !important;
            grid-template-columns: 1fr !important;
          }
          .login-card-column {
            justify-content: center !important;
            max-width: 440px !important;
          }
        }

        @media (max-width: 640px) {
          .login-container-root {
            background-attachment: scroll !important;
          }
          .login-main-body {
            padding: 10px 16px 24px !important;
          }
          .login-card-column {
            max-width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}
