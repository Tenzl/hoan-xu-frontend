"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type SearchSelectionOption = { value: string; label: string; keywords?: string[] };
export type SearchSelectionProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: (node: HTMLInputElement | null) => void;
  options?: readonly SearchSelectionOption[];
  onSearch?: (query: string, signal: AbortSignal) => Promise<readonly SearchSelectionOption[]>;
  debounceMs?: number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  messages?: { loading: string; empty: string; error: string };
};
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, "").trim();
const emptyOptions: readonly SearchSelectionOption[] = [];
export function SearchSelection({ id, value, onChange, onBlur, inputRef, options = emptyOptions, onSearch, debounceMs = 500, placeholder, disabled, invalid, describedBy, messages = { loading: "Searching…", empty: "No results found.", error: "Search failed. Please try again." } }: SearchSelectionProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-list`;
  const selectedLabel = options.find(option => option.value === value)?.label || value;
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<readonly SearchSelectionOption[]>(options);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const emitted = useRef<string | null>(null);
  const selected = useRef<SearchSelectionOption | null>(null);
  useEffect(() => {
    if (emitted.current === value) { emitted.current = null; return; }
    setQuery(selectedLabel);
    setActive(-1);
  }, [value, selectedLabel]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPending(true); setFailed(false); setActive(-1);
    const timer = setTimeout(async () => {
      try {
        const items = onSearch ? await onSearch(query, controller.signal) : options.filter(option => normalize([option.label, option.value, ...(option.keywords || [])].join(" ")).includes(normalize(query)));
        if (!controller.signal.aborted) { setResults(items); setPending(false); }
      } catch {
        if (!controller.signal.aborted) { setFailed(true); setPending(false); setResults([]); }
      }
    }, debounceMs);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open, options, onSearch, debounceMs]);
  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);
  function choose(option: SearchSelectionOption) {
    selected.current = option;
    emitted.current = option.value;
    onChange(option.value); setQuery(option.label); setOpen(false); setActive(-1);
    input.current?.focus();
  }
  return <div className="search-selection" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); onBlur?.(); }
  }}>
    <div className="search-selection-input">
      <Search size={17} aria-hidden="true" />
      <input id={inputId} ref={node => { input.current = node; inputRef?.(node); }} className="inp" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && !pending && active >= 0 ? `${listId}-${active}` : undefined} aria-invalid={invalid || undefined} aria-describedby={describedBy} autoComplete="off" value={query} disabled={disabled} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={event => {
        setQuery(event.target.value); setOpen(true); setPending(true); setActive(-1);
        if (value) { emitted.current = ""; onChange(""); }
      }} onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(selected.current?.value === value ? selected.current.label : selectedLabel); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setOpen(true);
          if (!pending && results.length) setActive(index => event.key === "ArrowDown" ? Math.min(index + 1, results.length - 1) : index < 0 ? results.length - 1 : Math.max(index - 1, 0));
        }
        if (event.key === "Enter" && open) { event.preventDefault(); if (!pending && active >= 0 && results[active]) choose(results[active]); }
      }} />
      <ChevronDown size={16} className="search-selection-chevron" aria-hidden="true" />
    </div>
    {open && <div className="search-selection-dropdown">
      <ul id={listId} role="listbox" aria-busy={pending} className="search-selection-options">
        {!pending && !failed && results.map((option, index) => <li id={`${listId}-${index}`} key={option.value} role="option" aria-selected={value === option.value} className={active === index ? "active" : ""} onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{value === option.value && <Check size={16} aria-hidden="true" />}</li>)}
      </ul>
      {(pending || failed || !results.length) && <p className="search-selection-status" role="status">{pending ? messages.loading : failed ? messages.error : messages.empty}</p>}
    </div>}
  </div>;
}
