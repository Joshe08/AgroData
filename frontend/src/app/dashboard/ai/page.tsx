'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { aiApi, fincasApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { useAiChatStore, AiMessage } from '@/store/aiChatStore';
import {
  Bot,
  Send,
  Loader2,
  RefreshCw,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Database,
  ArrowRight,
  ClipboardList,
  Scan,
  Zap,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface Finca {
  id: number | string;
  nombre: string;
  ubicacion: string;
  hectareas: number;
}

const PROMPT_SUGERIDOS = [
  {
    label: 'Diagnóstico global',
    prompt:
      'Realiza un diagnóstico y análisis integral de toda la organización: predios, cultivos activos, finanzas, inventario en bodega, maquinaria y clima.',
  },
  {
    label: 'Balance financiero',
    prompt:
      '¿Cuál es el balance financiero neto entre ingresos y gastos, y qué predio o cultivo genera mayor costo?',
  },
  {
    label: 'Alertas de inventario',
    prompt:
      '¿Qué insumos y fertilizantes están en stock crítico o agotados en bodega y requieren compra urgente?',
  },
  {
    label: 'Estado de maquinaria',
    prompt:
      '¿Cuál es el estado operativo de la maquinaria y tractores, y qué equipos tienen horas acumuladas para mantenimiento?',
  },
  {
    label: 'Riego y clima en Cesar',
    prompt:
      'Considerando las temperaturas actuales y probabilidad de lluvia en el Cesar, ¿cuál es la recomendación de turnos de riego y labores?',
  },
  {
    label: 'Manejo fitosanitario',
    prompt:
      '¿Qué plagas y enfermedades deben monitorearse prioritariamente en el Cesar en esta temporada y qué insumos en bodega son compatibles?',
  },
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'buenos días';
  } else if (hour >= 12 && hour < 19) {
    return 'buenas tardes';
  } else {
    return 'buenas noches';
  }
}

function buildWelcomeMessage(name?: string): string {
  const timeGreeting = getTimeGreeting();
  const cleanName = name ? name.trim() : '';
  if (cleanName) {
    return `Hola, ${timeGreeting}, ${cleanName}. ¿Qué quieres hacer hoy?`;
  }
  return `Hola, ${timeGreeting}. ¿Qué quieres hacer hoy?`;
}

function AIPageInner() {
  const user = useAuthStore((state) => state.user);
  const userName = user?.nombre || (user as any)?.name;
  const searchParams = useSearchParams();

  // Persistencia de mensajes y finca seleccionada via Zustand store
  const messages = useAiChatStore((s) => s.messages);
  const selectedFinca = useAiChatStore((s) => s.selectedFinca);
  const storeAddMessage = useAiChatStore((s) => s.addMessage);
  const storeSetMessages = useAiChatStore((s) => s.setMessages);
  const storeUpdateMessage = useAiChatStore((s) => s.updateMessage);
  const storeSetFinca = useAiChatStore((s) => s.setSelectedFinca);
  const storeClearChat = useAiChatStore((s) => s.clearChat);

  const [fincas, setFincas] = useState<Finca[]>([]);
  const [consulta, setConsulta] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Grabación de voz (Speech-to-Text)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Imagen adjunta (Visión Fitosanitaria)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoSentRef = useRef(false);
  const [hasImagePending, setHasImagePending] = useState(false);

  // Si llega ?q= desde el dashboard, pre-rellenar y enviar automáticamente
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      setConsulta(q);
      setTimeout(() => handleSendMessage(q), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Cargar fincas para el selector
  const loadFincas = useCallback(async () => {
    try {
      const res = await fincasApi.getAll();
      setFincas(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadFincas();
  }, [loadFincas]);

  // Configurar reconocimiento de voz (Speech-to-Text)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'es-CO';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setConsulta(transcript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      useToastStore
        .getState()
        .warning('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        useToastStore.getState().info('Micrófono activado. Habla con claridad.');
      } catch {
        setIsRecording(false);
      }
    }
  };

  // Manejo de imagen para análisis fitosanitario con compresión ligera
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      useToastStore.getState().warning('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImage(compressed);
          useToastStore.getState().info('Fotografía adjunta para análisis fitosanitario.');
        } else {
          setSelectedImage(event.target?.result as string);
        }
      };
      img.onerror = () => {
        setSelectedImage(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Enviar mensaje a AgroIA
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || consulta;
    if (!promptToSend.trim() && !selectedImage) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const currentImage = selectedImage;
    setSelectedImage(null);
    setConsulta('');
    setHasImagePending(!!currentImage);

    const userMsgId = 'user-' + Date.now();
    const newUserMessage: AiMessage = {
      id: userMsgId,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: currentImage || undefined,
    };

    storeAddMessage(newUserMessage);
    setLoading(true);

    try {
      const currentMessages = useAiChatStore.getState().messages;
      const historyPayload = currentMessages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await aiApi.chat({
        messages: historyPayload,
        fincaId: selectedFinca || undefined,
        imageBase64: currentImage || undefined,
      });

      const assistantMsg: AiMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: res.data.text || 'Consulta procesada con éxito.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.data.sources || ['Base de Datos AgroData'],
        actionSuggestion: res.data.actionSuggestion || null,
        kpis: res.data.kpis,
      };

      storeAddMessage(assistantMsg);
    } catch {
      useToastStore.getState().error('Error al comunicarse con AgroIA. Intenta nuevamente.');
      storeAddMessage({
        id: 'error-' + Date.now(),
        role: 'assistant',
        content:
          'Hubo un inconveniente al procesar la solicitud con el servidor. Por favor verifica la conexión o intenta reformular la pregunta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setLoading(false);
      setHasImagePending(false);
    }
  };

  // Ejecutar acción sugerida por AgroIA en la base de datos
  const handleExecuteAction = async (msgId: string, action: any) => {
    setExecutingActionId(msgId);
    try {
      const res = await aiApi.executeAction(action);
      useToastStore.getState().success(res.data.message || 'Acción ejecutada en la base de datos.');

      storeUpdateMessage(msgId, { actionExecuted: true });

      storeAddMessage({
        id: 'action-confirm-' + Date.now(),
        role: 'assistant',
        content: `Confirmación de registro: ${res.data.message || 'El registro ha sido asentado exitosamente en la base de datos.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (e: any) {
      useToastStore.getState().error(e.response?.data?.message || 'Error al ejecutar la acción.');
    } finally {
      setExecutingActionId(null);
    }
  };

  // Limpiar chat — borra el store también
  const handleClearChat = () => {
    autoSentRef.current = false;
    storeClearChat();
  };

  // Renderizado limpio de Markdown
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4
            key={idx}
            style={{ fontSize: 14, fontWeight: 700, margin: '12px 0 6px', color: '#10b981' }}
          >
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3
            key={idx}
            style={{ fontSize: 15, fontWeight: 700, margin: '14px 0 6px', color: 'var(--color-text)' }}
          >
            {line.replace('## ', '')}
          </h3>
        );
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        const itemContent = line.trim().replace(/^[-•]\s*/, '');
        return (
          <li key={idx} style={{ marginLeft: 16, marginBottom: 4, lineHeight: 1.6 }}>
            {parseBold(itemContent)}
          </li>
        );
      }

      return (
        <p key={idx} style={{ margin: '4px 0', lineHeight: 1.65 }}>
          {parseBold(line)}
        </p>
      );
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} style={{ color: 'var(--color-text)', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 110px)',
        minHeight: 0,
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <h1
                className="font-display"
                style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}
              >
                AgroIA
              </h1>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: 'rgba(16,185,129,0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                Analista Agronómico
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 11, margin: 0 }}>
                Consulta sobre cultivos, finanzas, inventario y clima en el Cesar
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[
                  { label: 'Finanzas' },
                  { label: 'Plagas / Fotografias' },
                  { label: 'Clima Cesar' },
                  { label: 'Alertas de Inventario' },
                ].map((cap) => (
                  <span
                    key={cap.label}
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 8,
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}
                  >
                    {cap.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controles: Selector de finca y reinicio */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 140, maxWidth: 200, padding: '5px 10px', fontSize: 12 }}
            value={selectedFinca}
            onChange={(e) => storeSetFinca(e.target.value)}
          >
            <option value="">Todas las fincas</option>
            {fincas.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.nombre}
              </option>
            ))}
          </select>

          <button
            onClick={handleClearChat}
            className="btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Reiniciar conversación"
          >
            <RefreshCw size={12} />
            <span>Nueva consulta</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div
        className="card ai-chat-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 8,
          borderRadius: 12,
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto 0', textAlign: 'center', padding: '24px 16px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
              }}
            >
              <Bot size={22} color="#10b981" />
            </div>

            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
              {buildWelcomeMessage(userName)}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Copiloto agronómico con acceso vivo a tus predios, finanzas, bodega y clima del Cesar.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, textAlign: 'left', maxWidth: 620, margin: '0 auto' }}>
              {PROMPT_SUGERIDOS.slice(0, 4).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.prompt)}
                  className="glass-hover"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)' }}>{p.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: 8,
                flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: isUser ? '#3b82f6' : 'rgba(16,185,129,0.15)',
                  border: isUser ? 'none' : '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isUser ? '#fff' : '#10b981',
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {isUser ? 'Tú' : <Bot size={14} />}
              </div>

              {/* Message Bubble */}
              <div
                className={isUser ? 'ai-bubble-user' : 'ai-bubble-assistant'}
                style={{
                  maxWidth: '78%',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                {msg.imageUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <img
                      src={msg.imageUrl}
                      alt="Fotografía de muestra"
                      style={{
                        maxWidth: 240,
                        maxHeight: 180,
                        borderRadius: 6,
                        objectFit: 'cover',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    />
                    <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 3 }}>
                      Fotografía adjunta para análisis técnico
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
                  {renderMarkdown(msg.content)}
                </div>

                {/* Tarjeta de Acción Sugerida */}
                {msg.actionSuggestion && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px dashed rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <ClipboardList size={14} color="#10b981" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                        Registro sugerido para la base de datos
                      </span>
                    </div>

                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
                      Acción: <strong>{msg.actionSuggestion.type.replace(/_/g, ' ')}</strong> ·{' '}
                      {JSON.stringify(msg.actionSuggestion.data)}
                    </p>

                    <button
                      onClick={() => handleExecuteAction(msg.id, msg.actionSuggestion)}
                      disabled={executingActionId === msg.id || msg.actionExecuted}
                      className="btn-primary"
                      style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: msg.actionExecuted ? '#334155' : '#10b981',
                        cursor: msg.actionExecuted ? 'default' : 'pointer',
                      }}
                    >
                      {executingActionId === msg.id ? (
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : msg.actionExecuted ? (
                        <CheckCircle2 size={12} color="#4ade80" />
                      ) : (
                        <ArrowRight size={12} />
                      )}
                      <span>
                        {msg.actionExecuted
                          ? 'Registro asentado'
                          : 'Confirmar y guardar en base de datos'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Footer con fuentes y hora */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 4,
                    borderTop: '1px solid var(--color-border-subtle)',
                    fontSize: 10,
                    color: 'var(--color-text-subtle)',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <span>{msg.timestamp}</span>
                  {msg.sources && msg.sources.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Database size={10} color="#10b981" />
                      Fuentes: {msg.sources.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: hasImagePending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16,185,129,0.15)',
                border: hasImagePending ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {hasImagePending ? <Scan size={16} color="#f59e0b" /> : <Bot size={16} color="#10b981" />}
            </div>
            <div className="ai-bubble-assistant" style={{ borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: hasImagePending ? '#f59e0b' : '#10b981' }} />
              <span>{hasImagePending ? 'Analizando fotografía con motor fitosanitario...' : 'Consultando y procesando datos de la organización...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugerencias en la parte inferior */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 6,
          marginBottom: 6,
          scrollbarWidth: 'none',
        }}
      >
        {PROMPT_SUGERIDOS.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p.prompt)}
            disabled={loading}
            className="ai-chip-btn"
            style={{
              padding: '5px 11px',
              borderRadius: 16,
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.color = '';
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Vista previa de imagen seleccionada */}
      {selectedImage && (
        <div
          style={{
            marginBottom: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(245, 158, 11, 0.08)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(245, 158, 11, 0.4)',
            maxWidth: 'fit-content',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={selectedImage}
              alt="Muestra adjunta"
              style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 6,
                background: 'rgba(245,158,11,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scan size={14} color="#f59e0b" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
              Fotografia para analisis fitosanitario
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
              Adjunte una consulta o envie directamente
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Box with Voice & Image */}
      <div
        className="card"
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          style={{
            background: 'transparent',
            border: 'none',
            color: selectedImage ? '#10b981' : 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Adjuntar fotografía para diagnóstico de plagas, hojas o suelo"
        >
          <ImageIcon size={18} />
        </button>

        <button
          type="button"
          onClick={toggleRecording}
          disabled={loading}
          style={{
            background: isRecording ? 'rgba(239,68,68,0.2)' : 'transparent',
            border: isRecording ? '1px solid #ef4444' : 'none',
            color: isRecording ? '#ef4444' : 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isRecording ? 'Detener dictado' : 'Dictar por voz'}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <textarea
          className="input-field"
          style={{
            flex: 1,
            resize: 'none',
            minHeight: 38,
            maxHeight: 100,
            lineHeight: 1.4,
            border: 'none',
            background: 'transparent',
            padding: '8px 4px',
            fontSize: 13,
            outline: 'none',
          }}
          placeholder={
            isRecording
              ? 'Escuchando tu voz...'
              : 'Escribe tu consulta sobre cultivos, finanzas, bodega, maquinaria o clima...'
          }
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          rows={1}
        />

        <button
          onClick={() => handleSendMessage()}
          className="btn-primary"
          disabled={loading || (!consulta.trim() && !selectedImage)}
          style={{
            height: 38,
            width: 38,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: 8,
          }}
        >
          {loading ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 4px 0',
          fontSize: 10,
          color: 'var(--color-text-subtle)',
        }}
      >
        <span>Enter para enviar. Puedes hablar por micrófono o adjuntar imágenes.</span>
        <span>AgroData Cesar</span>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando AgroIA...</div>}>
      <AIPageInner />
    </Suspense>
  );
}
