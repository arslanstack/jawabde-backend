import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption { value: string; label: string; }

interface Props {
    options: SelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    creatable?: boolean;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Select…', creatable = false, className, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = options.find(o => o.value === value);
    const filtered = query
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    const creatableRow = creatable && query.trim() && !filtered.find(o => o.label.toLowerCase() === query.trim().toLowerCase());

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false); setQuery('');
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function pick(val: string) { onChange(val); setOpen(false); setQuery(''); }

    function handleKeyDown(e: React.KeyboardEvent) {
        const total = filtered.length + (creatableRow ? 1 : 0);
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, total - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlight < filtered.length && filtered[highlight]) pick(filtered[highlight].value);
            else if (creatableRow && query.trim()) pick(query.trim());
        }
        else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    }

    function openDrop() {
        if (disabled) return;
        setOpen(true); setHighlight(0); setQuery('');
        setTimeout(() => inputRef.current?.focus(), 10);
    }

    const displayLabel = selected?.label ?? (creatable && value ? value : '');

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {!open ? (
                <button type="button" onClick={openDrop} disabled={disabled}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <span className={cn('truncate', !displayLabel && 'text-muted-foreground')}>{displayLabel || placeholder}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        {value && <span onClick={e => { e.stopPropagation(); onChange(''); }} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-3 w-3" /></span>}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                </button>
            ) : (
                <div className="flex h-9 items-center rounded-md border border-ring bg-background px-3 ring-2 ring-ring">
                    <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setHighlight(0); }}
                        onKeyDown={handleKeyDown} className="flex-1 bg-transparent text-sm outline-none min-w-0" placeholder="Type to search…" />
                    {(value) && <button type="button" onClick={() => { onChange(''); setQuery(''); }}><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>}
                </div>
            )}
            {open && (
                <div className="absolute z-[100] mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {filtered.length === 0 && !creatableRow && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No results found.</div>
                    )}
                    {filtered.map((opt, i) => (
                        <div key={opt.value} onMouseDown={() => pick(opt.value)}
                            onMouseEnter={() => setHighlight(i)}
                            className={cn('flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm', i === highlight && 'bg-accent text-accent-foreground')}>
                            <Check className={cn('h-4 w-4 shrink-0', opt.value === value ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{opt.label}</span>
                        </div>
                    ))}
                    {creatableRow && (
                        <div onMouseDown={() => pick(query.trim())} onMouseEnter={() => setHighlight(filtered.length)}
                            className={cn('flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm text-muted-foreground border-t', filtered.length === highlight && 'bg-accent text-accent-foreground')}>
                            <span>+ Add "{query.trim()}"</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
