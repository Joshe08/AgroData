'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: (string | SearchableOption)[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar en la lista...',
  disabled = false,
  allowCustom = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalizar opciones
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }, [options]);

  // Filtrar según término de búsqueda
  const filtered = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(q);

      const matchSub = opt.subtitle
        ? opt.subtitle
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(q)
        : false;

      return matchLabel || matchSub;
    });
  }, [normalizedOptions, search]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus en el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedOption = normalizedOptions.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      onChange(search.trim());
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Botón trigger principal */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="input-field"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          background: 'var(--color-surface)',
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
          boxShadow: isOpen ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none',
          padding: '9px 12px',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: value ? 'var(--color-text)' : 'var(--color-text-subtle)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: value ? 500 : 400,
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={15}
          color="var(--color-text-muted)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
            marginLeft: 8,
          }}
        />
      </button>

      {/* Dropdown flotante con buscador */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.35)',
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Input de búsqueda interno */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-surface-2)',
            }}
          >
            <Search size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
                if (e.key === 'Enter') handleCustomSubmit(e);
              }}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 12.5,
                color: 'var(--color-text)',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  padding: 2,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Lista de resultados filtrables */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: 220,
              padding: '4px',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {allowCustom ? (
                  <div>
                    <p style={{ marginBottom: 6 }}>No coincide con la lista.</p>
                    <button
                      type="button"
                      onClick={() => handleSelect(search.trim())}
                      className="btn-secondary"
                      style={{ fontSize: 11, padding: '4px 8px', color: 'var(--color-primary)' }}
                    >
                      Usar &quot;{search.trim()}&quot;
                    </button>
                  </div>
                ) : (
                  <span>No se encontraron resultados</span>
                )}
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = item.value === value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSelect(item.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'background 0.12s ease',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                        }}
                      >
                        {item.label}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
