'use client';

import { useState, useEffect } from 'react';
import { automationsApi } from '@/lib/api';
import {
  Cpu,
  Play,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  History,
  Info,
  ShieldCheck,
  Zap,
  Package,
  CloudSun,
  DollarSign,
  Sprout,
  Bot,
  X,
  ExternalLink,
} from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  frequency: string;
  cronExpression: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastResult: string | null;
}

interface AutomationLog {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  result: string | null;
  error: string | null;
  triggeredBy: string;
}

export default function AutomatizacionesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const res = await automationsApi.getAll();
      setAutomations(res.data || []);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Error al cargar las automatizaciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      await automationsApi.toggle(id, !currentEnabled);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !currentEnabled } : a))
      );
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'No se pudo cambiar el estado de la automatización', type: 'error' });
    }
  };

  const handleTrigger = async (automation: Automation) => {
    setRunningId(automation.id);
    setFeedbackMsg(null);
    try {
      const res = await automationsApi.trigger(automation.id);
      setFeedbackMsg({
        text: `"${automation.name}" ejecutada con éxito: ${res.data?.result || 'Correcto'}`,
        type: 'success',
      });
      fetchAutomations();
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg({
        text: `Error al ejecutar "${automation.name}": ${err.message}`,
        type: 'error',
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleOpenLogs = async (automation: Automation) => {
    setSelectedAutomation(automation);
    setLogsLoading(true);
    try {
      const res = await automationsApi.getLogs(automation.id);
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INVENTORY_ALERT':
        return <Package size={22} className="text-amber-400" />;
      case 'WEATHER_MONITOR':
        return <CloudSun size={22} className="text-sky-400" />;
      case 'FINANCIAL_SUMMARY':
        return <DollarSign size={22} className="text-violet-400" />;
      case 'PRODUCTION_REMINDER':
        return <Sprout size={22} className="text-emerald-400" />;
      case 'AGROIA':
        return <Bot size={22} className="text-indigo-400" />;
      default:
        return <Zap size={22} className="text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Motor de Automatizaciones</h1>
          </div>
          <p className="text-sm text-slate-400">
            Control central de flujos automáticos potenciados por <span className="text-emerald-400 font-semibold">n8n</span> y NestJS.
          </p>
        </div>

        <button
          onClick={fetchAutomations}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {automations.filter((a) => a.enabled).length} / {automations.length}
            </div>
            <div className="text-xs text-slate-400">Automatizaciones Activas</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">Automático</div>
            <div className="text-xs text-slate-400">Programación Cron Activa</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">HMAC SHA-256</div>
            <div className="text-xs text-slate-400">Seguridad de Webhooks</div>
          </div>
        </div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm">
            Cargando automatizaciones...
          </div>
        ) : automations.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm">
            No hay automatizaciones configuradas.
          </div>
        ) : (
          automations.map((auto) => {
            const isRunning = runningId === auto.id;
            return (
              <div
                key={auto.id}
                className={`p-5 rounded-2xl bg-slate-900/70 border transition-all duration-200 flex flex-col justify-between ${
                  auto.enabled ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-70'
                }`}
              >
                <div>
                  {/* Top Bar with Icon and Toggle */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 flex-shrink-0">
                        {getIcon(auto.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-base leading-snug">{auto.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">{auto.frequency || 'PROGRAMADO'}</span>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={auto.enabled}
                        onChange={() => handleToggle(auto.id, auto.enabled)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{auto.description}</p>

                  {/* Last Run Info */}
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-1.5 mb-4 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Última ejecución:</span>
                      <span className="text-slate-300 font-medium">
                        {auto.lastRunAt
                          ? new Date(auto.lastRunAt).toLocaleString('es-CO', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Nunca'}
                      </span>
                    </div>

                    {auto.lastStatus && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Estado:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            auto.lastStatus === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {auto.lastStatus}
                        </span>
                      </div>
                    )}

                    {auto.lastResult && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/40 truncate" title={auto.lastResult}>
                        {auto.lastResult}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleTrigger(auto)}
                    disabled={isRunning}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-900/30"
                  >
                    {isRunning ? (
                      <>
                        <RotateCw size={14} className="animate-spin" />
                        <span>Ejecutando...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        <span>Ejecutar Ahora</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenLogs(auto)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <History size={14} />
                    <span>Historial</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Integration Info Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
            <Info size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white">Arquitectura Desacoplada con n8n</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              AgroData ejecuta estas automatizaciones directamente en el servidor NestJS y además cuenta con webhooks listos para importar workflows en <strong>n8n</strong> (<code className="text-emerald-400">http://localhost:5678</code>). Todos los webhooks entrantes y salientes están protegidos mediante firmas de seguridad <strong>HMAC SHA-256</strong> con aislamiento estricto por organización.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                Webhook: /webhooks/n8n/notify
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                Resultados: /webhooks/n8n/automation-result
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                Workflows: /n8n/workflows/*.json
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Logs Modal */}
      {selectedAutomation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Historial de Ejecuciones</h3>
                <p className="text-xs text-slate-400">{selectedAutomation.name}</p>
              </div>
              <button
                onClick={() => setSelectedAutomation(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto divide-y divide-slate-800/60 space-y-3">
              {logsLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">Cargando historial de ejecuciones...</div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Aún no hay ejecuciones registradas para esta automatización.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {new Date(log.startedAt).toLocaleString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">{log.triggeredBy}</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                    {log.durationMs !== null && (
                      <div className="text-[11px] text-slate-500">Duración: {log.durationMs} ms</div>
                    )}
                    {log.result && <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800/40 break-words">{log.result}</p>}
                    {log.error && <p className="text-xs text-rose-400 font-mono bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/20 break-words">{log.error}</p>}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAutomation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
