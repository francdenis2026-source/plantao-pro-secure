import { ReactNode } from 'react';
import heroCommand_ptr from '@/assets/hud-hero-command.jpg.asset.json';
const heroCommand = (heroCommand_ptr as {url:string}).url;
import heroUnits_ptr from '@/assets/hud-hero-units.jpg.asset.json';
const heroUnits = (heroUnits_ptr as {url:string}).url;
import icon3dShield_ptr from '@/assets/icon3d-shield.png.asset.json';
const icon3dShield = (icon3dShield_ptr as {url:string}).url;
import icon3dBuilding_ptr from '@/assets/icon3d-building.png.asset.json';
const icon3dBuilding = (icon3dBuilding_ptr as {url:string}).url;
import icon3dTeam_ptr from '@/assets/icon3d-team.png.asset.json';
const icon3dTeam = (icon3dTeam_ptr as {url:string}).url;

type Variant = 'command' | 'units';
type IconKey = 'shield' | 'building' | 'team';

const heroMap: Record<Variant, string> = {
  command: heroCommand,
  units: heroUnits,
};
const iconMap: Record<IconKey, string> = {
  shield: icon3dShield,
  building: icon3dBuilding,
  team: icon3dTeam,
};

interface PanelHeroHUDProps {
  variant?: Variant;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: IconKey;
  right?: ReactNode;
}

export function PanelHeroHUD({
  variant = 'command',
  eyebrow = 'Comando Operacional',
  title,
  subtitle,
  icon = 'shield',
  right,
}: PanelHeroHUDProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.22)] hud-brackets mb-4 md:mb-6">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroMap[variant]}
          alt=""
          aria-hidden
          className="w-full h-full object-cover opacity-70"
          width={1920}
          height={640}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05050a] via-[#05050a]/70 to-[#05050a]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050a] via-transparent to-transparent" />
        <div className="absolute inset-0 hud-grid-bg opacity-40" />
      </div>

      {/* Content */}
      <div className="relative px-5 py-6 md:px-8 md:py-8 flex items-center gap-5 md:gap-7">
        <div className="hud-icon-3d shrink-0 !w-16 !h-16 md:!w-20 md:!h-20">
          <img src={iconMap[icon]} alt="" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="hud-eyebrow mb-1.5">{eyebrow}</div>
          <h1 className="hud-display text-2xl md:text-4xl leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm md:text-base text-[rgb(234,226,200)]/75 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {right && <div className="hidden md:flex items-center gap-2 shrink-0">{right}</div>}
      </div>

      {/* Bottom gold rail */}
      <div className="relative h-[2px] bg-gradient-to-r from-transparent via-[rgb(201,168,76)] to-transparent" />
    </div>
  );
}

export function HUDIcon3D({ name, className = '' }: { name: IconKey; className?: string }) {
  return (
    <span className={`hud-icon-3d ${className}`}>
      <img src={iconMap[name]} alt="" aria-hidden />
    </span>
  );
}
