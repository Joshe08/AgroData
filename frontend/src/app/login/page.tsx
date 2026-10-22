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
  Sparkles,
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
        backgroundImage: `url('/images/login-hero-bg.jpg'), url('/images/login-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        color: isDark ? '#f1f5f9' : '#0f172a',
        overflowX: 'hidden',
      }}
    >
      {/* Overlay sutil para garantizar legibilidad perfecta del texto y armonía en dark mode */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(135deg, rgba(10, 15, 29, 0.88) 0%, rgba(15, 23, 42, 0.82) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(240, 249, 245, 0.25) 100%)',
          backdropFilter: isDark ? 'blur(2px)' : 'none',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ========================================================= */}
      {/* TOP HEADER: BRAND + THEME TOGGLE                          */}
      {/* ========================================================= */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 36px',
          width: '100%',
          maxWidth: 1440,
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
              boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.4)',
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
              }}
            >
              AgroData <span style={{ color: '#059669' }}>Cesar</span>
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: isDark ? '#94a3b8' : '#475569',
                letterSpacing: '-0.01em',
              }}
            >
              Inteligencia y Gestión Agropecuaria
            </div>
          </div>
        </div>

        {/* Top-Right Theme Toggle Pill */}
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 6px',
            borderRadius: 9999,
            background: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
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
              color: !isDark ? '#f59e0b' : '#94a3b8',
              boxShadow: !isDark ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
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
              background: isDark ? '#0f172a' : 'transparent',
              color: isDark ? '#38bdf8' : '#94a3b8',
              boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Moon size={14} />
          </div>
        </button>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTENT BODY: LEFT HERO + RIGHT LOGIN CARD           */}
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
          padding: '20px 48px 40px',
          maxWidth: 1440,
          width: '100%',
          margin: '0 auto',
          gap: 40,
        }}
      >
        {/* ===================================================== */}
        {/* LEFT COLUMN: HERO VALUE PROPOSITION                   */}
        {/* ===================================================== */}
        <section
          className="login-hero-column"
          style={{
            flex: 1,
            maxWidth: 640,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Eyebrow / Overline Tag */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#0d9488',
              marginBottom: 14,
            }}
          >
            EL CAMPO EN TUS DATOS
          </div>

          {/* Main H1 Title */}
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(32px, 4.2vw, 50px)',
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              color: isDark ? '#f8fafc' : '#0f172a',
              marginBottom: 18,
            }}
          >
            Toma de decisiones <br />
            basada en{' '}
            <span
              style={{
                color: '#00897b',
                fontWeight: 800,
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
              color: isDark ? '#cbd5e1' : '#334155',
              maxWidth: 540,
              marginBottom: 36,
              fontWeight: 450,
            }}
          >
            Monitorea predios, controla ciclos de cultivo y ganadería, administra inventarios en bodega, analiza finanzas y recibe alertas agronómicas en tiempo real.
          </p>

          {/* 4 Feature Badges (Horizontal Flow) */}
          <div
            className="login-feature-pills-row"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 16,
              maxWidth: 600,
            }}
          >
            {/* Feature 1: Mapeo Satelital */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(20, 184, 166, 0.20)',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                }}
              >
                <MapPin size={16} />
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  lineHeight: 1.25,
                }}
              >
                Mapeo Satelital
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: 1.35,
                }}
              >
                Predios georreferenciados y parcelas
              </div>
            </div>

            {/* Feature 2: Clima Agrícola Real */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(20, 184, 166, 0.20)',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                }}
              >
                <CloudSun size={16} />
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  lineHeight: 1.25,
                }}
              >
                Clima Agrícola Real
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: 1.35,
                }}
              >
                Alertas de lluvia, radiación UV y viento
              </div>
            </div>

            {/* Feature 3: Gestión Ganadera */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(20, 184, 166, 0.20)',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                }}
              >
                <Layers size={16} />
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  lineHeight: 1.25,
                }}
              >
                Gestión Ganadera
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: 1.35,
                }}
              >
                Inventario, ciclos de cultivo y ganadería
              </div>
            </div>

            {/* Feature 4: Informes y Analítica */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(20, 184, 166, 0.20)',
                  border: '1px solid rgba(13, 148, 136, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                }}
              >
                <TrendingUp size={16} />
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  lineHeight: 1.25,
                }}
              >
                Informes y Analítica
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: 1.35,
                }}
              >
                Toma de decisiones inteligentes
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* RIGHT COLUMN: FLOATING CLEAN LOGIN CARD               */}
        {/* ===================================================== */}
        <section
          className="login-card-column"
          style={{
            flex: '0 0 auto',
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              background: isDark ? 'rgba(15, 23, 42, 0.94)' : '#ffffff',
              borderRadius: 28,
              padding: '36px 34px 24px 34px',
              boxShadow: isDark
                ? '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
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
                color: isDark ? '#94a3b8' : '#64748b',
                marginBottom: 24,
                lineHeight: 1.45,
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
                  padding: '11px 14px',
                  background: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fef2f2',
                  border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fecaca',
                  borderRadius: 12,
                  marginBottom: 18,
                  color: isDark ? '#fca5a5' : '#b91c1c',
                  fontSize: 12.5,
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
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
                  padding: '11px 14px',
                  background: isDark ? 'rgba(34, 197, 94, 0.16)' : '#ecfdf5',
                  border: isDark ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid #a7f3d0',
                  borderRadius: 12,
                  marginBottom: 18,
                  color: isDark ? '#86efac' : '#047857',
                  fontSize: 12.5,
                }}
              >
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
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
                    fontWeight: 600,
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
                      color: isDark ? '#64748b' : '#94a3b8',
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
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: 12,
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: 13.5,
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0d9488';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDark ? '#334155' : '#e2e8f0';
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
                    fontWeight: 600,
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
                      color: isDark ? '#64748b' : '#94a3b8',
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
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: 12,
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: 13.5,
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0d9488';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDark ? '#334155' : '#e2e8f0';
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
                      color: isDark ? '#64748b' : '#94a3b8',
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
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: busy ? 'none' : '0 8px 22px -4px rgba(37, 99, 235, 0.4)',
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
                    fontWeight: 600,
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
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                  margin: '12px 0 4px',
                }}
              />

              {/* Card Bottom Footer: Security Badge + Dark Mode Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 2,
                }}
              >
                {/* Left: Security Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span
                    style={{
                      fontSize: 11,
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    Tu información está segura
                  </span>
                </div>

                {/* Vertical Divider */}
                <div
                  style={{
                    width: 1,
                    height: 16,
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                  }}
                />

                {/* Right: Dark Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Moon size={13} color={isDark ? '#38bdf8' : '#64748b'} />
                  <span
                    style={{
                      fontSize: 11,
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    Modo oscuro
                  </span>
                  {/* Slider Toggle */}
                  <div
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={isDark}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleTheme();
                      }
                    }}
                    style={{
                      width: 38,
                      height: 20,
                      borderRadius: 10,
                      background: isDark ? '#059669' : '#cbd5e1',
                      padding: 2,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transform: isDark ? 'translateX(18px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </div>
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
          padding: '16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11.5,
          color: isDark ? '#94a3b8' : '#475569',
          maxWidth: 1440,
          width: '100%',
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>© {new Date().getFullYear()} AgroData Cesar. Plataforma Integral Agropecuaria.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>Seguridad SSL</span>
          <span>•</span>
          <span>Analítica Predictiva</span>
          <span>•</span>
          <span>Soporte Cesar</span>
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
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
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
            <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              Ingresa el correo electrónico asociado a tu cuenta para enviarte instrucciones de restablecimiento.
            </p>

            {forgotSent ? (
              <div
                style={{
                  padding: '14px 16px',
                  background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5',
                  border: isDark ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #a7f3d0',
                  borderRadius: 12,
                  color: isDark ? '#86efac' : '#047857',
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                ✓ Si el correo coincide con una cuenta activa, te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b', display: 'block', marginBottom: 6 }}>
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
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: 13.5,
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
                    fontWeight: 600,
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
          }
          .login-feature-pills-row > div {
            align-items: center !important;
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
