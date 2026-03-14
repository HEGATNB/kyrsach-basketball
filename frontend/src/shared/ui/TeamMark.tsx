import { useEffect, useState, type CSSProperties } from 'react';
import type { Team } from '@/shared/api/client';
import { getTeamBrand, hexToRgba } from '@/shared/lib/teamBrand';

interface TeamMarkProps {
  team?: Pick<Team, 'name' | 'abbrev' | 'logoUrl' | 'brandColor' | 'accentColor'> | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES = {
  sm: 'h-10 w-10 rounded-[12px] text-[11px]',
  md: 'h-14 w-14 rounded-[14px] text-sm',
  lg: 'h-20 w-20 rounded-[18px] text-lg',
};

function getFallbackCode(team?: Pick<Team, 'name' | 'abbrev'> | null) {
  if (team?.abbrev) {
    return team.abbrev;
  }

  const initials =
    team?.name
      ?.split(' ')
      .map((chunk) => chunk[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'NBA';

  return initials;
}

export function TeamMark({ team, size = 'md', className = '' }: TeamMarkProps) {
  const [broken, setBroken] = useState(false);
  const brand = getTeamBrand({ abbrev: team?.abbrev, name: team?.name });
  const brandColor = team?.brandColor || brand.brandColor;
  const accentColor = team?.accentColor || brand.accentColor;
  const logoUrl = team?.logoUrl || brand.logoUrl;
  const style: CSSProperties = {
    borderColor: hexToRgba(brandColor, 0.28),
    background: `linear-gradient(145deg, ${hexToRgba(brandColor, 0.18)}, ${hexToRgba(accentColor, 0.12)})`,
  };

  useEffect(() => {
    setBroken(false);
  }, [logoUrl]);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border ${SIZE_STYLES[size]} ${className}`}
      style={style}
    >
      {!broken && logoUrl ? (
        <img
          src={logoUrl}
          alt={`${team?.name || brand.name} logo`}
          className="h-[74%] w-[74%] object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="font-spacegrotesk font-bold tracking-[0.12em] text-white">{getFallbackCode(team)}</span>
      )}
    </div>
  );
}
