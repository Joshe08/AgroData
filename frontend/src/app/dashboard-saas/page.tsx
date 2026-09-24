'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { saasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import ToastContainer from '@/components/ui/ToastContainer';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Crown,
  CheckCircle,
  Clock,
  Zap,
  Plus,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  History,
  Check,
  Search,
  LogOut,
  Phone,
  MapPin,
} from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';

interface PlatformStats {
  totalOrganizaciones: number;
  totalUsuarios: number;
  suscripciones: { plan: string; cantidad: number }[];
  organizacionesPorEstado?: { status: string; cantidad: number }[];
  organizaciones: {
    id: string;
    nombre: string;
    nit: string | null;
    orgType?: string | null;
    plan: string;
    status: string;
    suspendedAt?: string | null;
    suspendedReason?: string | null;
    reactivatedAt?: string | null;
    phone?: string | null;
    address?: string | null;
    usuarios: number;
    fincas: number;
    fechaRegistro: string;
  }[];
}

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organization?: { id: string; name: string; subscription: string; status?: string };
  createdAt: string;
}

interface SuspensionRecord {
  id: string;
  action: 'SUSPENSION' | 'REACTIVACION';
  reason?: string;
  createdBy?: string;
  createdAt: string;
}

const planColors: Record<string, string> = {
  PREMIUM: '#10b981',
  ENTERPRISE: '#6366f1',
  FREE: '#6b7280',
};

const planIcon: Record<string, React.ReactNode> = {
  PREMIUM: <Zap size={13} />,
  ENTERPRISE: <Crown size={13} />,
  FREE: <CheckCircle size={13} />,
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: 'ACTIVA' },
  SUSPENDED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', label: 'SUSPENDIDA' },
  PENDING: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: 'PENDIENTE' },
  CANCELLED: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', label: 'CANCELADA' },
};

const roleBadgeColors: Record<string, { bg: string; text: string }> = {
  SUPERADMIN: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' },
  PROPIETARIO: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
  ADMIN: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
  AGRONOMO: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
  TRABAJADOR: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' },
  CONTADOR: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
};

export default function SaasAdminPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'resumen' | 'empresas' | 'usuarios' | 'seguridad'>('resumen');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [usersList, setUsersList] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<SuspensionRecord[]>([]);
  const [selectedOrgName, setSelectedOrgName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'org' | 'user';
    id: string | null;
    name: string;
    loading: boolean;
  }>({
    isOpen: false,
    type: 'org',
    id: null,
    name: '',
    loading: false,
  });

  // Create Org Form
  const [orgForm, setOrgForm] = useState({
    name: '',
    orgType: 'EMPRESA',
    nit: '',
    subscription: 'FREE',
    phone: '',
    address: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: '',
  });

  // Edit Org Form
  const [editOrgForm, setEditOrgForm] = useState({
    id: '',
    name: '',
    orgType: 'EMPRESA',
    nit: '',
    subscription: 'FREE',
    status: 'ACTIVE',
    phone: '',
    address: '',
  });

  // Suspend Form
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string; reason: string }>({
    id: '',
    name: '',
    reason: '',
  });

  // User Form
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PROPIETARIO',
    organizationId: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        saasApi.getStats(),
        saasApi.getUsers(),
      ]);
      setStats(statsRes.data);
      setUsersList(usersRes.data || []);
    } catch {
      setError('No se pudo conectar con el servicio SaaS. Verifica que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.rol !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }
    loadData();
  }, [user, router, loadData]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Create Org
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orgForm.orgType !== 'PERSONA_NATURAL' && !orgForm.nit.trim()) {
      useToastStore.getState().error('El NIT es obligatorio para Empresas y Cooperativas.');
      return;
    }
    try {
      await saasApi.createOrganization(orgForm);
      useToastStore.getState().success(`Organización "${orgForm.name}" creada exitosamente.`);
      setShowOrgModal(false);
      setOrgForm({
        name: '',
        orgType: 'EMPRESA',
        nit: '',
        subscription: 'FREE',
        phone: '',
        address: '',
        ownerEmail: '',
        ownerName: '',
        ownerPassword: '',
      });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al crear la empresa.';
      useToastStore.getState().error(msg);
      setError(msg);
    }
  };

  // Open Edit Org Modal
  const openEditOrgModal = (org: PlatformStats['organizaciones'][0]) => {
    setEditOrgForm({
      id: org.id,
      name: org.nombre,
      orgType: org.orgType || 'EMPRESA',
      nit: org.nit || '',
      subscription: org.plan,
      status: org.status || 'ACTIVE',
      phone: org.phone || '',
      address: org.address || '',
    });
    setShowEditOrgModal(true);
  };

  // Save Edit Org
  const handleSaveEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editOrgForm.orgType !== 'PERSONA_NATURAL' && !editOrgForm.nit.trim()) {
      useToastStore.getState().error('El NIT es obligatorio para Empresas y Cooperativas.');
      return;
    }
    try {
      await saasApi.updateOrganization(editOrgForm.id, {
        name: editOrgForm.name,
        orgType: editOrgForm.orgType,
        nit: editOrgForm.nit || null,
        subscription: editOrgForm.subscription,
        status: editOrgForm.status,
        phone: editOrgForm.phone || null,
        address: editOrgForm.address || null,
      });
      useToastStore.getState().success(`Organización "${editOrgForm.name}" actualizada con éxito.`);
      setShowEditOrgModal(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar la organización.';
      useToastStore.getState().error(msg);
      setError(msg);
    }
  };

  // Suspend Org
  const handleSuspendOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTarget.reason.trim()) {
      useToastStore.getState().error('Debes indicar un motivo de suspensión.');
      return;
    }
    try {
      await saasApi.suspendOrganization(suspendTarget.id, suspendTarget.reason);
      useToastStore.getState().success(`Organización "${suspendTarget.name}" suspendida.`);
      setShowSuspendModal(false);
      setSuspendTarget({ id: '', name: '', reason: '' });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al suspender la empresa.';
      useToastStore.getState().error(msg);
      setError(msg);
    }
  };

  // Reactivate Org
  const handleReactivateOrg = async (orgId: string, orgName: string) => {
    try {
      await saasApi.reactivateOrganization(orgId);
      useToastStore.getState().success(`Organización "${orgName}" reactivada con éxito.`);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al reactivar la organización.';
      useToastStore.getState().error(msg);
      setError(msg);
    }
  };

  // View Suspension History
  const handleViewHistory = async (orgId: string, orgName: string) => {
    setSelectedOrgName(orgName);
    setHistoryRecords([]);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await saasApi.getSuspensionHistory(orgId);
      setHistoryRecords(res.data || []);
    } catch (err: any) {
      useToastStore.getState().error('Error al cargar historial de suspensiones.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Update Org Plan directly
  const handleUpdateOrgPlan = async (id: string, newPlan: string) => {
    try {
      await saasApi.updateOrganization(id, { subscription: newPlan });
      useToastStore.getState().success(`Plan de la empresa actualizado a ${newPlan}.`);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar el plan.';
      useToastStore.getState().error(msg);
      setError(msg);
    }
  };

  const confirmDeleteSaasAction = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      if (deleteModal.type === 'org') {
        await saasApi.deleteOrganization(deleteModal.id);
        useToastStore.getState().success(`Organización "${deleteModal.name}" eliminada.`);
      } else {
        await saasApi.deleteUser(deleteModal.id);
        useToastStore.getState().success(`Usuario "${deleteModal.name}" eliminado.`);
      }
      loadData();
      setDeleteModal({ isOpen: false, type: 'org', id: null, name: '', loading: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar la eliminación.';
      useToastStore.getState().error(msg);
      setError(msg);
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteOrg = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'org',
      id,
      name,
      loading: false,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.createUser(userForm);
      useToastStore.getState().success(`Usuario "${userForm.name}" creado con rol ${userForm.role}.`);
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'PROPIETARIO', organizationId: '' });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al crear el usuario.';
      useToastStore.getState().error(msg);
      setError(msg);
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'user',
      id,
      name,
      loading: false,
    });
  };

  if (!user || user.rol !== 'SUPERADMIN') return null;

  const filteredOrgs = stats?.organizaciones.filter((o) =>
    o.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.nit && o.nit.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const filteredUsers = usersList.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.organization?.name && u.organization.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex' }}>
      <ToastContainer />
      {/* SuperAdmin Dedicated Sidebar */}
      <aside
        style={{
          width: 250,
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div
            style={{
              width: 42,
              height: 42,
              background: 'rgba(99,102,241,0.18)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crown size={22} color="#818cf8" />
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: '#818cf8' }}>Agro</span>
              <span style={{ color: 'var(--color-text)' }}>Data</span>
            </div>
            <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 700, letterSpacing: '0.08em' }}>
              PANEL SUPERADMIN
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`nav-item ${activeTab === 'resumen' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LayoutDashboard size={18} />
            <span style={{ flex: 1 }}>Resumen SaaS</span>
          </button>

          <button
            onClick={() => setActiveTab('empresas')}
            className={`nav-item ${activeTab === 'empresas' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Building2 size={18} />
            <span style={{ flex: 1 }}>Empresas / Clientes</span>
            {stats && (
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: 10 }}>
                {stats.totalOrganizaciones}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Users size={18} />
            <span style={{ flex: 1 }}>Usuarios del Sistema</span>
            {usersList.length > 0 && (
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: 10 }}>
                {usersList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('seguridad')}
            className={`nav-item ${activeTab === 'seguridad' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Shield size={18} />
            <span style={{ flex: 1 }}>Política de Seguridad</span>
          </button>
        </nav>

        {/* User Card & Logout */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {user.nombre?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.nombre}
              </div>
              <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 700 }}>
                ADMINISTRADOR GLOBAL
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}
          >
            <LogOut size={17} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1250, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Crown size={22} color="#818cf8" />
                <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
                  {activeTab === 'resumen' && 'Panel de Administración SaaS'}
                  {activeTab === 'empresas' && 'Empresas y Organizaciones Registradas'}
                  {activeTab === 'usuarios' && 'Gestión de Usuarios de la Plataforma'}
                  {activeTab === 'seguridad' && 'Políticas de Seguridad y Control de Acceso'}
                </h1>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                {activeTab === 'resumen' && 'Visión global del negocio: Organizaciones, estados de servicio, suscripciones y actividad.'}
                {activeTab === 'empresas' && 'Control total de empresas: asignación de planes, suspensión de servicio y trazabilidad.'}
                {activeTab === 'usuarios' && 'Asigna credenciales y roles para cada empresa registrada.'}
                {activeTab === 'seguridad' && 'Estructura jerárquica de permisos basada en roles (RBAC).'}
              </p>
            </div>

            {/* Header Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              {activeTab === 'empresas' && (
                <button
                  onClick={() => setShowOrgModal(true)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#6366f1' }}
                >
                  <Plus size={16} />
                  <span>Registrar Empresa</span>
                </button>
              )}
              {activeTab === 'usuarios' && (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#6366f1' }}
                >
                  <Plus size={16} />
                  <span>Nuevo Usuario</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, marginBottom: 24, color: '#f87171', fontSize: 14 }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
              Cargando información del sistema...
            </div>
          )}

          {/* TAB 1: RESUMEN SAAS */}
          {!loading && activeTab === 'resumen' && stats && (
            <div>
              {/* Interactive KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                  {
                    label: 'Empresas Registradas',
                    value: stats.totalOrganizaciones,
                    icon: <Building2 size={22} />,
                    color: '#6366f1',
                    targetTab: 'empresas' as const,
                    subtext: 'Ver listado completo →',
                  },
                  {
                    label: 'Usuarios Activos',
                    value: stats.totalUsuarios,
                    icon: <Users size={22} />,
                    color: '#10b981',
                    targetTab: 'usuarios' as const,
                    subtext: 'Ver cuentas y accesos →',
                  },
                  {
                    label: 'Suscripciones Premium',
                    value: stats.suscripciones.find((s) => s.plan === 'PREMIUM')?.cantidad ?? 0,
                    icon: <Zap size={22} />,
                    color: '#f59e0b',
                    targetTab: 'empresas' as const,
                    subtext: 'Filtrar empresas →',
                  },
                  {
                    label: 'Fincas Totales',
                    value: stats.organizaciones.reduce((acc, o) => acc + o.fincas, 0),
                    icon: <Check size={22} />,
                    color: '#3b82f6',
                    targetTab: 'empresas' as const,
                    subtext: 'Ver predios registrados →',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    onClick={() => setActiveTab(card.targetTab)}
                    className="card hover-scale"
                    style={{
                      padding: '22px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = card.color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: `${card.color}15`,
                          border: `1px solid ${card.color}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: card.color,
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)' }}>{card.value}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{card.label}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: card.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {card.subtext}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status & Subscriptions breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
                {/* Subscriptions breakdown */}
                <div className="card" style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--color-text)' }}>
                    Planes de Suscripción
                  </h2>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {stats.suscripciones.map((s) => (
                      <div
                        key={s.plan}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          background: `${planColors[s.plan] || '#6b7280'}12`,
                          border: `1px solid ${planColors[s.plan] || '#6b7280'}30`,
                          borderRadius: 10,
                          color: planColors[s.plan] || '#6b7280',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {planIcon[s.plan]}
                        <span>Plan {s.plan}:</span>
                        <strong style={{ fontSize: 15, marginLeft: 4 }}>{s.cantidad}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="card" style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--color-text)' }}>
                    Estado del Servicio de Empresas
                  </h2>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {(stats.organizacionesPorEstado || [
                      { status: 'ACTIVE', cantidad: stats.organizaciones.filter((o) => o.status === 'ACTIVE').length },
                      { status: 'SUSPENDED', cantidad: stats.organizaciones.filter((o) => o.status === 'SUSPENDED').length },
                    ]).map((item) => {
                      const cfg = statusColors[item.status] || { bg: 'rgba(255,255,255,0.08)', text: '#fff', label: item.status };
                      return (
                        <div
                          key={item.status}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 14px',
                            background: cfg.bg,
                            border: `1px solid ${cfg.text}30`,
                            borderRadius: 10,
                            color: cfg.text,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          <span>{cfg.label}:</span>
                          <strong style={{ fontSize: 15, marginLeft: 4 }}>{item.cantidad}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Table */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                    Empresas Recientes
                  </h2>
                  <button
                    onClick={() => setActiveTab('empresas')}
                    style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    Ver todas ({stats.totalOrganizaciones}) →
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {['Organización', 'NIT', 'Plan', 'Estado', 'Usuarios', 'Fincas', 'Registro'].map((col) => (
                          <th key={col} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--color-text-subtle)', fontWeight: 600, fontSize: 11 }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.organizaciones.slice(0, 5).map((org) => {
                        const st = statusColors[org.status] || statusColors.ACTIVE;
                        return (
                          <tr key={org.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '12px', color: 'var(--color-text)', fontWeight: 600 }}>{org.nombre}</td>
                            <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{org.nit || '—'}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: `${planColors[org.plan] || '#6b7280'}15`, borderRadius: 6, color: planColors[org.plan], fontSize: 11, fontWeight: 700 }}>
                                {planIcon[org.plan]} {org.plan}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ display: 'inline-block', padding: '3px 8px', background: st.bg, color: st.text, borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{org.usuarios}</td>
                            <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{org.fincas}</td>
                            <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>
                              {new Date(org.fechaRegistro).toLocaleDateString('es-CO')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTIÓN DE EMPRESAS */}
          {!loading && activeTab === 'empresas' && (
            <div>
              {/* Search bar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="Buscar empresa por nombre o NIT..."
                    className="input-field"
                    style={{ paddingLeft: 42 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {['Empresa / Organización', 'NIT / Tipo', 'Plan Actual', 'Estado', 'Usuarios / Fincas', 'Servicio', 'Acciones'].map((col) => (
                          <th key={col} style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--color-text-subtle)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrgs.map((org) => {
                        const st = statusColors[org.status] || statusColors.ACTIVE;
                        const isSuspended = org.status === 'SUSPENDED';

                        return (
                          <tr key={org.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: isSuspended ? 0.85 : 1 }}>
                            <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Building2 size={16} color="#818cf8" />
                                <div>
                                  <div>{org.nombre}</div>
                                  {org.phone && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>{org.phone}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                              <div>{org.nit || '—'}</div>
                              <div style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>{org.orgType || 'EMPRESA'}</div>
                            </td>
                            <td style={{ padding: '14px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: `${planColors[org.plan] || '#6b7280'}15`, border: `1px solid ${planColors[org.plan] || '#6b7280'}30`, borderRadius: 6, color: planColors[org.plan], fontSize: 11, fontWeight: 700 }}>
                                {planIcon[org.plan]} {org.plan}
                              </span>
                            </td>
                            <td style={{ padding: '14px' }}>
                              <span style={{ display: 'inline-block', padding: '4px 9px', background: st.bg, color: st.text, border: `1px solid ${st.text}30`, borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                {st.label}
                              </span>
                              {isSuspended && org.suspendedReason && (
                                <div style={{ fontSize: 10, color: '#f87171', marginTop: 3, maxWidth: 160 }} title={org.suspendedReason}>
                                  Motivo: {org.suspendedReason.length > 25 ? org.suspendedReason.slice(0, 25) + '...' : org.suspendedReason}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                              <div>{org.usuarios} usuarios</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{org.fincas} fincas</div>
                            </td>
                            <td style={{ padding: '14px' }}>
                              {isSuspended ? (
                                <button
                                  onClick={() => handleReactivateOrg(org.id, org.nombre)}
                                  className="btn-secondary"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, color: '#34d399', borderColor: 'rgba(16,185,129,0.4)' }}
                                  title="Reactivar acceso a la empresa"
                                >
                                  <PlayCircle size={14} />
                                  <span>Reactivar</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSuspendTarget({ id: org.id, name: org.nombre, reason: '' });
                                    setShowSuspendModal(true);
                                  }}
                                  className="btn-secondary"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                                  title="Suspender acceso de esta organización"
                                >
                                  <AlertTriangle size={14} />
                                  <span>Suspender</span>
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  onClick={() => handleViewHistory(org.id, org.nombre)}
                                  style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                                  title="Ver historial de suspensiones"
                                >
                                  <History size={16} />
                                </button>
                                <button
                                  onClick={() => openEditOrgModal(org)}
                                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                                  title="Editar Empresa"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrg(org.id, org.nombre)}
                                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                                  title="Eliminar Empresa"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GESTIÓN DE USUARIOS */}
          {!loading && activeTab === 'usuarios' && (
            <div>
              {/* Search bar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="Buscar usuario por nombre, correo, rol o empresa..."
                    className="input-field"
                    style={{ paddingLeft: 42 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {['Usuario', 'Correo', 'Rol en el Sistema', 'Empresa / Organización', 'Fecha Alta', 'Acciones'].map((col) => (
                          <th key={col} style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--color-text-subtle)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: roleBadgeColors[u.role]?.bg || 'rgba(255,255,255,0.1)',
                                  color: roleBadgeColors[u.role]?.text || '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              {u.name}
                            </div>
                          </td>
                          <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                background: roleBadgeColors[u.role]?.bg || 'rgba(255,255,255,0.1)',
                                color: roleBadgeColors[u.role]?.text || '#fff',
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '14px', color: 'var(--color-text)' }}>
                            {u.organization?.name || '—'}
                          </td>
                          <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                            {new Date(u.createdAt).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {u.role !== 'SUPERADMIN' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 6 }}
                                title="Eliminar Usuario"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POLÍTICA DE SEGURIDAD */}
          {activeTab === 'seguridad' && (
            <div>
              <div className="card" style={{ padding: '32px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Shield size={24} color="#818cf8" />
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                    Arquitectura de Seguridad y Roles (RBAC)
                  </h2>
                </div>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: 14, marginBottom: 28 }}>
                  AgroData implementa una separación estricta de responsabilidades y aislamiento multitenant. El <strong>SuperAdmin</strong> gobierna la infraestructura, supervisa el estado de servicio y asigna planes sin interactuar con las labores agronómicas de los clientes. El <strong>Propietario</strong> posee el control de su organización y administración de fincas.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {[
                    {
                      role: 'SUPERADMIN',
                      title: 'Administrador SaaS Global',
                      desc: 'Gestión de la plataforma: creación de empresas, asignación de planes, suspensión inmediata de servicio e historial de auditoría.',
                      modules: ['Panel SaaS', 'Gestión de Empresas', 'Gestión de Usuarios', 'Suspensiones / Auditoría'],
                      badge: roleBadgeColors.SUPERADMIN,
                    },
                    {
                      role: 'PROPIETARIO',
                      title: 'Titular de la Organización',
                      desc: 'Acceso total a todos los módulos operativos, predios, finanzas y administración de colaboradores de su empresa.',
                      modules: ['Dashboard', 'Fincas y Lotes', 'Producciones', 'Inventario', 'Finanzas', 'Personal', 'Maquinaria', 'Clima', 'AgroIA', 'Colaboradores'],
                      badge: roleBadgeColors.PROPIETARIO,
                    },
                    {
                      role: 'ADMIN',
                      title: 'Administrador Delegado',
                      desc: 'Gestión operativa y administrativa de las fincas y recursos de la organización con permisos delegados.',
                      modules: ['Dashboard', 'Fincas', 'Producciones', 'Inventario', 'Personal', 'Maquinaria', 'Clima'],
                      badge: roleBadgeColors.ADMIN,
                    },
                    {
                      role: 'AGRONOMO',
                      title: 'Ingeniero Agrónomo',
                      desc: 'Supervisión técnica de cultivos, diagnósticos agronómicos con AgroIA y seguimiento de producciones.',
                      modules: ['Dashboard', 'Mis Fincas', 'Producciones', 'Inventario Insumos', 'Clima', 'AgroIA'],
                      badge: roleBadgeColors.AGRONOMO,
                    },
                    {
                      role: 'TRABAJADOR',
                      title: 'Operario de Campo',
                      desc: 'Registro de labores diarias en campo, consulta de maquinaria asignada y verificación climática.',
                      modules: ['Dashboard', 'Producciones', 'Inventario', 'Maquinaria', 'Clima'],
                      badge: roleBadgeColors.TRABAJADOR,
                    },
                  ].map((p) => (
                    <div
                      key={p.role}
                      style={{
                        padding: '20px 22px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: p.badge.bg, color: p.badge.text }}>
                          {p.role}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                        {p.title}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
                        {p.desc}
                      </p>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-subtle)', marginBottom: 6 }}>
                        MÓDULOS HABILITADOS:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {p.modules.map((m) => (
                          <span
                            key={m}
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: 4,
                              color: 'var(--color-text)',
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: REGISTRAR NUEVA EMPRESA */}
      {showOrgModal && (
        <div className="modal-overlay" onClick={() => setShowOrgModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={20} color="#818cf8" />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Registrar Nueva Empresa / Organización</h2>
              </div>
              <button onClick={() => setShowOrgModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tipo de Organización *</label>
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={orgForm.orgType}
                  onChange={(e) => setOrgForm({ ...orgForm, orgType: e.target.value })}
                >
                  <option value="EMPRESA">Empresa / Sociedad Comercial (Requiere NIT)</option>
                  <option value="PERSONA_NATURAL">Persona Natural / Productor Individual (Sin NIT obligatorio)</option>
                  <option value="COOPERATIVA">Cooperativa / Asociación Agropecuaria (Requiere NIT)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nombre de la Empresa u Organización *</label>
                <input
                  type="text"
                  required
                  placeholder={orgForm.orgType === 'PERSONA_NATURAL' ? 'Ej: Finca El Paraíso - Carlos Mendoza' : 'Ej: Hacienda Los Mangos S.A.S'}
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {orgForm.orgType === 'PERSONA_NATURAL' ? 'Cédula / Documento (Opcional)' : 'NIT *'}
                  </label>
                  <input
                    type="text"
                    required={orgForm.orgType !== 'PERSONA_NATURAL'}
                    placeholder={orgForm.orgType === 'PERSONA_NATURAL' ? 'Ej: 1098765432' : '900.123.456-7'}
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={orgForm.nit}
                    onChange={(e) => setOrgForm({ ...orgForm, nit: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Plan de Suscripción</label>
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={orgForm.subscription}
                    onChange={(e) => setOrgForm({ ...orgForm, subscription: e.target.value })}
                  >
                    <option value="FREE">Plan FREE (1 Finca, 2 Colaboradores)</option>
                    <option value="PREMIUM">Plan PREMIUM (5 Fincas, 10 Colaboradores)</option>
                    <option value="ENTERPRISE">Plan ENTERPRISE (Ilimitado)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Teléfono de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej: +57 310 123 4567"
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Dirección / Municipio</label>
                  <input
                    type="text"
                    placeholder="Ej: Valledupar, Cesar"
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                  Cuenta del Propietario Inicial (Opcional)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nombre del Propietario</label>
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      className="input-field"
                      style={{ marginTop: 6 }}
                      value={orgForm.ownerName}
                      onChange={(e) => setOrgForm({ ...orgForm, ownerName: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="juan@empresa.com"
                        className="input-field"
                        style={{ marginTop: 6 }}
                        value={orgForm.ownerEmail}
                        onChange={(e) => setOrgForm({ ...orgForm, ownerEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Contraseña Inicial</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="input-field"
                        style={{ marginTop: 6 }}
                        value={orgForm.ownerPassword}
                        onChange={(e) => setOrgForm({ ...orgForm, ownerPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#6366f1' }}>
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EMPRESA */}
      {showEditOrgModal && (
        <div className="modal-overlay" onClick={() => setShowEditOrgModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit3 size={20} color="#818cf8" />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Editar Organización</h2>
              </div>
              <button onClick={() => setShowEditOrgModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tipo de Organización *</label>
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={editOrgForm.orgType}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, orgType: e.target.value })}
                >
                  <option value="EMPRESA">Empresa / Sociedad Comercial (Requiere NIT)</option>
                  <option value="PERSONA_NATURAL">Persona Natural / Productor Individual</option>
                  <option value="COOPERATIVA">Cooperativa / Asociación Agropecuaria (Requiere NIT)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nombre de la Organización *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={editOrgForm.name}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {editOrgForm.orgType === 'PERSONA_NATURAL' ? 'Cédula / Documento (Opcional)' : 'NIT *'}
                  </label>
                  <input
                    type="text"
                    required={editOrgForm.orgType !== 'PERSONA_NATURAL'}
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={editOrgForm.nit}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, nit: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Plan de Suscripción</label>
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={editOrgForm.subscription}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, subscription: e.target.value })}
                  >
                    <option value="FREE">Plan FREE</option>
                    <option value="PREMIUM">Plan PREMIUM</option>
                    <option value="ENTERPRISE">Plan ENTERPRISE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Estado del Servicio</label>
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={editOrgForm.status}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVA</option>
                    <option value="SUSPENDED">SUSPENDIDA</option>
                    <option value="PENDING">PENDIENTE</option>
                    <option value="CANCELLED">CANCELADA</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Teléfono</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={editOrgForm.phone}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Dirección</label>
                <input
                  type="text"
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={editOrgForm.address}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowEditOrgModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#6366f1' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUSPENDER SERVICIO */}
      {showSuspendModal && (
        <div className="modal-overlay" onClick={() => setShowSuspendModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f87171' }}>
                <AlertTriangle size={22} />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  Suspender Organización
                </h2>
              </div>
              <button onClick={() => setShowSuspendModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              Estás a punto de suspender el acceso a la empresa <strong>{suspendTarget.name}</strong>. Todos sus usuarios quedarán bloqueados inmediatamente tanto en el inicio de sesión como en cualquier petición en curso.
            </p>

            <form onSubmit={handleSuspendOrg} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Motivo de la Suspensión *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej: Mora en el pago de suscripción mensual / Incumplimiento de términos..."
                  className="input-field"
                  style={{ marginTop: 6, width: '100%', resize: 'vertical' }}
                  value={suspendTarget.reason}
                  onChange={(e) => setSuspendTarget({ ...suspendTarget, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowSuspendModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>
                  Confirmar Suspensión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE SUSPENSIONES */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={20} color="#818cf8" />
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                  Historial de Auditoría: {selectedOrgName}
                </h2>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Cargando historial...
              </div>
            ) : historyRecords.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                No hay registros de suspensión o reactivación para esta empresa.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
                {historyRecords.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: rec.action === 'SUSPENSION' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: rec.action === 'SUSPENSION' ? '#f87171' : '#34d399',
                        }}
                      >
                        {rec.action}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                        {new Date(rec.createdAt).toLocaleString('es-CO')}
                      </span>
                    </div>
                    {rec.reason && (
                      <div style={{ fontSize: 13, color: 'var(--color-text)', marginTop: 4 }}>
                        <strong>Motivo:</strong> {rec.reason}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Registrado por: {rec.createdBy || 'SuperAdmin'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" onClick={() => setShowHistoryModal(false)} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVO USUARIO */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={20} color="#818cf8" />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Crear Usuario de la Plataforma</h2>
              </div>
              <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Empresa / Organización *</label>
                <select
                  required
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={userForm.organizationId}
                  onChange={(e) => setUserForm({ ...userForm, organizationId: e.target.value })}
                >
                  <option value="">Selecciona una empresa...</option>
                  {stats?.organizaciones.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre} ({o.plan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Gómez"
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="carlos@ejemplo.com"
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Contraseña *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Rol Asignado *</label>
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="PROPIETARIO">PROPIETARIO</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="AGRONOMO">AGRONOMO</option>
                    <option value="TRABAJADOR">TRABAJADOR</option>
                    <option value="CONTADOR">CONTADOR</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#6366f1' }}>
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'org' ? '¿Eliminar Organización / Empresa?' : '¿Eliminar Usuario de la Plataforma?'}
        itemName={deleteModal.name}
        description={
          deleteModal.type === 'org'
            ? 'Esta acción eliminará la organización completa, sus usuarios vinculados, predios, finanzas y registros en cascada. Esta acción es irreversible.'
            : 'Esta acción revocará el acceso y eliminará permanentemente la cuenta de este usuario.'
        }
        loading={deleteModal.loading}
        onConfirm={confirmDeleteSaasAction}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'org', id: null, name: '', loading: false })}
      />
    </div>
  );
}
