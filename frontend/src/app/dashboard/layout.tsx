'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';
import {
  LayoutDashboard,
  MapPin,
  Sprout,
  Package,
  DollarSign,
  Users,
  Wrench,
  CloudSun,
  Bot,
  LogOut,
  Menu,
  Leaf,
  ChevronRight,
  Shield,
  FileBarChart,
  UserCircle,
  X,
} from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';

const baseNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/fincas', label: 'Mis Fincas', icon: MapPin },
  { href: '/dashboard/producciones', label: 'Producciones', icon: Sprout },
  { href: '/dashboard/inventario', label: 'Inventario', icon: Package },
  { href: '/dashboard/finanzas', label: 'Finanzas', icon: DollarSign },
  { href: '/dashboard/personal', label: 'Personal', icon: Users },
  { href: '/dashboard/maquinaria', label: 'Maquinaria', icon: Wrench },
  { href: '/dashboard/clima', label: 'Clima', icon: CloudSun },
  { href: '/dashboard/ai', label: 'AgroIA', icon: Bot },
  { href: '/dashboard/reportes', label: 'Reportes', icon: FileBarChart },
  { href: '/dashboard/colaboradores', label: 'Organización', icon: Shield },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('agrodata_token') : null;

    if (!user && !token) {
      router.replace('/login');
      return;
    }

    if (user?.rol === 'SUPERADMIN') {
      router.replace('/dashboard-saas');
      return;
    }
  }, [user, router, hasHydrated]);

  if (!hasHydrated || !user || user.rol === 'SUPERADMIN') {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center',
        justifyContent: 'center', background: 'var(--color-bg)',
        color: 'var(--color-text-muted)', fontSize: 14, gap: 12,
      }}>
        <Leaf size={20} color="var(--color-primary)" />
        Cargando AgroData...
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const userRole = user.rol || 'TRABAJADOR';
  const filteredNavItems = baseNavItems.filter((item) => {
    if (userRole === 'PROPIETARIO' || userRole === 'ADMIN') {
      return true;
    }
    if (userRole === 'AGRONOMO') {
      return ['/dashboard', '/dashboard/fincas', '/dashboard/producciones', '/dashboard/inventario', '/dashboard/clima', '/dashboard/ai', '/dashboard/reportes'].includes(item.href);
    }
    if (userRole === 'TRABAJADOR') {
      return ['/dashboard', '/dashboard/producciones', '/dashboard/inventario', '/dashboard/maquinaria', '/dashboard/clima'].includes(item.href);
    }
    if (userRole === 'CONTADOR') {
      return ['/dashboard', '/dashboard/finanzas', '/dashboard/reportes'].includes(item.href);
    }
    if (userRole === 'ADMIN_PRODUCCION') {
      return ['/dashboard', '/dashboard/fincas', '/dashboard/producciones', '/dashboard/inventario', '/dashboard/personal', '/dashboard/maquinaria', '/dashboard/clima', '/dashboard/ai', '/dashboard/reportes'].includes(item.href);
    }
    return ['/dashboard', '/dashboard/clima'].includes(item.href);
  });

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 16px' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 4 }}>
        <div style={{
          width: 40, height: 40,
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Leaf size={20} color="var(--color-primary)" />
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>
            <span className="gradient-text">AgroData</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
            {user.organizationName || 'Plataforma Agropecuaria'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 8 }}>
        <Link
          href="/dashboard/perfil"
          onClick={() => setSidebarOpen(false)}
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', marginBottom: 4,
            borderRadius: 12, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
            className="nav-item"
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0,
            }}>
              {user.nombre?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.nombre}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--color-text-subtle)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user.rol}
              </div>
            </div>
            <UserCircle size={14} style={{ flexShrink: 0, color: 'var(--color-text-subtle)' }} />
          </div>
        </Link>
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Modo Visual</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg)' }}>
      {/* Desktop Sidebar */}
      <aside
        style={{
          width: 240, flexShrink: 0,
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'none', overflow: 'hidden',
        }}
        className="desktop-sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{
            width: 260,
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            position: 'relative', zIndex: 1,
            overflowY: 'auto',
          }}>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--color-text-muted)',
                padding: 4, zIndex: 10,
              }}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 60,
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex', padding: 8,
              borderRadius: 8,
              minWidth: 44, minHeight: 44,
              alignItems: 'center', justifyContent: 'center',
            }}
            className="mobile-menu-btn"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="mobile-logo font-display" style={{ fontSize: 16, fontWeight: 700 }}>
            <span className="gradient-text">AgroData</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }} className="desktop-header-org">
              {user.organizationName || 'AgroData'}
            </span>
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>

      {/* Global toast notifications */}
      <ToastContainer />

      <style>{`
        .desktop-header-org { display: none; }
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-logo { display: none !important; }
          .desktop-header-org { display: inline !important; }
        }
      `}</style>
    </div>
  );
}
