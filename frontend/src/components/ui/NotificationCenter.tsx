'use client';

import { useState, useEffect, useRef } from 'react';
import { notificationsApi } from '@/lib/api';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Package,
  CloudSun,
  Sprout,
  DollarSign,
  Bot,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  read: boolean;
  createdAt: string;
  source: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data?.count || 0);
    } catch {
      // Ignore if offline
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll(false);
      setNotifications(res.data || []);
      const count = (res.data || []).filter((n: NotificationItem) => !n.read).length;
      setUnreadCount(count);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAll();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INVENTORY':
        return <Package size={16} className="text-amber-500" />;
      case 'WEATHER':
        return <CloudSun size={16} className="text-sky-500" />;
      case 'PRODUCTION':
        return <Sprout size={16} className="text-emerald-500" />;
      case 'FINANCE':
        return <DollarSign size={16} className="text-violet-500" />;
      case 'AI':
        return <Bot size={16} className="text-indigo-500" />;
      case 'SUBSCRIPTION':
        return <ShieldAlert size={16} className="text-rose-500" />;
      default:
        return <Info size={16} className="text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">CRÍTICA</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">ALTA</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">Centro de Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 font-medium rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  title="Marcar todas como leídas"
                  className="p-1.5 text-xs text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck size={15} />
                  <span className="hidden sm:inline">Leer todas</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Cargando notificaciones...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-500">
                <Bell size={28} className="opacity-40" />
                <p className="text-xs">No tienes notificaciones pendientes</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 transition-colors flex items-start gap-3 hover:bg-slate-800/50 ${
                    !item.read ? 'bg-emerald-950/20 border-l-2 border-emerald-500' : 'opacity-80'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 flex-shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-slate-200 truncate">{item.title}</span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed break-words">{item.message}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/30">
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {!item.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(item.id, e)}
                            title="Marcar como leída"
                            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          title="Eliminar"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
