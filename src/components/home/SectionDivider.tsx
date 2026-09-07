/**
 * SectionDivider — separador sutil e consistente entre seções da homepage.
 * Hairline âmbar com losango central, discreto em ambos os temas.
 * Oculto em mobile (sm-) para não roubar espaço vertical.
 */
export function SectionDivider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`hidden sm:flex relative w-full items-center justify-center py-4 lg:py-6 ${className}`}
    >
      <span className="h-px flex-1 max-w-[36%] bg-gradient-to-r from-transparent via-amber-400/25 to-amber-400/40" />
      <span className="mx-3 flex items-center gap-1.5">
        <span className="h-1 w-1 rotate-45 bg-amber-400/60" />
        <span className="h-1.5 w-1.5 rotate-45 border border-amber-400/70" />
        <span className="h-1 w-1 rotate-45 bg-amber-400/60" />
      </span>
      <span className="h-px flex-1 max-w-[36%] bg-gradient-to-l from-transparent via-amber-400/25 to-amber-400/40" />
    </div>
  );
}

export default SectionDivider;
