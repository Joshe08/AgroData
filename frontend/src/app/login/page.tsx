'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Eye, EyeOff, Leaf, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const isSubmittingRef = useRef(false);

  // If already logged in on mount, redirect to appropriate dashboard
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

  const executeLogin = async () => {
    if (isSubmittingRef.current || isLoading) return;
    if (!form.email.trim() || !form.password) return;

    isSubmittingRef.current = true;
    clearError();
    setSuccess(false);

    try {
      await login(form.email.trim(), form.password);
      setSuccess(true);
      
      const currentUser = useAuthStore.getState().user;
      const target = currentUser?.rol === 'SUPERADMIN' ? '/dashboard-saas' : '/dashboard';
      router.replace(target);
    } catch {
      isSubmittingRef.current = false;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await executeLogin();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      executeLogin();
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)' }}>
      <section className="hero-panel" style={{ flex: 1, display: 'none', alignItems: 'center', justifyContent: 'center', padding: 48, background: 'linear-gradient(135deg, #0a1a0a 0%, #0f2010 50%, #091520 100%)' }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <Leaf size={64} color="#4ade80" />
          <h1 className="font-display" style={{ fontSize: 40, margin: '24px 0 16px' }}><span className="gradient-text">AgroData</span> Cesar</h1>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>Plataforma inteligente para la gestión y análisis de datos agrícolas en el departamento del Cesar.</p>
        </div>
      </section>

      <section style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 40px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <Leaf size={28} color="#4ade80" />
          <div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}><span className="gradient-text">AgroData</span> Cesar</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Gestión Agrícola Inteligente</div>
          </div>
        </div>

        <h2 className="font-display" style={{ fontSize: 28, marginBottom: 8, color: 'var(--color-text)' }}>Bienvenido de vuelta</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, fontSize: 14 }}>Ingresa tus credenciales para acceder a tu panel</p>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10, marginBottom: 20, color: '#f87171' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        {success && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 10, marginBottom: 20, color: '#4ade80' }}>
            <CheckCircle size={16} />Sesión iniciada correctamente. Ingresando...
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
              Correo electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
              <input
                id="login-email"
                className="input-field"
                style={{ paddingLeft: 38 }}
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                onKeyDown={handleKeyDown}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
              <input
                id="login-password"
                className="input-field"
                style={{ paddingLeft: 38, paddingRight: 42 }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                onKeyDown={handleKeyDown}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword((visible) => !visible)}
                tabIndex={-1}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="submit-btn"
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ marginTop: 8, padding: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isLoading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
      <style>{`@media (min-width: 768px) { .hero-panel { display: flex !important; } }`}</style>
    </main>
  );
}
