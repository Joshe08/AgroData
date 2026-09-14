'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { api } from '@/lib/api';
import {
  User,
  Building2,
  Mail,
  Shield,
  Calendar,
  Save,
  Lock,
} from 'lucide-react';

export default function PerfilPage() {
  const { user, setUser } = useAuthStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setProfileData(res.data);
      setName(res.data.name || '');
    } catch {
      if (user) {
        setName(user.nombre || '');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      useToastStore.getState().warning('El nombre completo es requerido.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        useToastStore.getState().warning('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        useToastStore.getState().error('Las contraseñas no coinciden.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = { name: name.trim() };
      if (newPassword) {
        payload.password = newPassword;
      }

      const res = await api.put('/users/me', payload);

      if (user) {
        const updatedUser = {
          ...user,
          nombre: res.data.name || name.trim(),
        };
        setUser(updatedUser);
      }

      useToastStore.getState().success('Perfil actualizado correctamente.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar el perfil.';
      useToastStore.getState().error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
          Mi Perfil
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          Administra la información de tu cuenta, seguridad y visualiza los datos de tu empresa.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), #10b981)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                  {user?.nombre || 'Usuario'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Mail size={13} />
                  <span>{user?.email || 'usuario@agrodata.co'}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} /> Rol en el sistema:
                </span>
                <span className="badge badge-primary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                  {user?.rol || 'COLABORADOR'}
                </span>
              </div>

              {profileData?.organization && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} /> Organización:
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                    {profileData.organization.name}
                  </span>
                </div>
              )}

              {profileData?.createdAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> Miembro desde:
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                    {new Date(profileData.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {profileData?.organization && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Building2 size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                  Detalles de la Empresa
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Razón Social: </span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{profileData.organization.name}</span>
                </div>
                {profileData.organization.nit && (
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>NIT: </span>
                    <span style={{ color: 'var(--color-text)' }}>{profileData.organization.nit}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Plan Actual: </span>
                  <span className="badge badge-success" style={{ marginLeft: 6 }}>
                    {profileData.organization.subscription || 'FREE'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <User size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
              Actualizar Datos de Acceso
            </h3>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                disabled
                className="input-field"
                value={user?.email || ''}
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4, display: 'block' }}>
                El correo está vinculado a tu autenticación y no se puede modificar directamente.
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Lock size={15} color="var(--color-text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                  Cambiar Contraseña (Opcional)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}
              >
                <Save size={16} />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
