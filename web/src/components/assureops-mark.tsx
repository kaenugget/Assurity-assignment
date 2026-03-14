export function AssureOpsMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-300/70 bg-white/90 shadow-sm">
        <svg viewBox="0 0 32 32" className="h-5.5 w-5.5" aria-hidden>
          <circle cx="16" cy="16" r="11" fill="none" stroke="#1d2430" strokeWidth="2.2" />
          <path
            d="M10.5 18.5c1.7-3.5 4.2-5.3 7.3-5.3 1.8 0 3.3.5 4.8 1.7"
            fill="none"
            stroke="#e68b42"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <path
            d="M9.5 14.1c1.5-2.8 3.8-4.1 6.7-4.1 1.7 0 3.2.5 4.8 1.5"
            fill="none"
            stroke="#f0b57d"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <circle cx="21.6" cy="14.2" r="1.7" fill="#1d2430" />
        </svg>
      </div>
      <div className="text-left">
        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">AssureOps</div>
        <div className="text-xs text-slate-600">Ops cockpit</div>
      </div>
    </div>
  );
}
