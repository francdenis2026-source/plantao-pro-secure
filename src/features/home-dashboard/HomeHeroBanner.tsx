import heroPhoto from '@/assets/midias/hero-agentes-viatura.png';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function HomeHeroBanner({ firstName, subtitle }: { firstName: string; subtitle: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <img
        src={heroPhoto}
        alt=""
        aria-hidden
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[70%_30%]"
        draggable={false}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(100deg, hsl(222 47% 8% / 0.95) 0%, hsl(222 47% 10% / 0.82) 42%, hsl(222 47% 10% / 0.35) 78%, hsl(222 47% 10% / 0.15) 100%)' }}
      />

      <div className="relative z-10 flex flex-col justify-between gap-6 px-5 py-6 sm:flex-row sm:items-center sm:px-8 sm:py-9">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{greeting()}, {firstName}!</h1>
          <p className="mt-1 text-sm text-white/70">{subtitle}</p>
        </div>
        <p className="max-w-[220px] shrink-0 text-right text-sm italic leading-snug text-white/60">
          "Segurança hoje,<br />mais oportunidades amanhã."
        </p>
      </div>
    </div>
  );
}
