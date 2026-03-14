import { ArrowUpRight } from 'lucide-react';
import { GlowingCard } from './GlowingCard';
import { TeamMark } from './TeamMark';
import { getTeamBrand, hexToRgba } from '@/shared/lib/teamBrand';

interface PlayerCardProps {
  player: {
    id: number;
    first_name: string;
    last_name: string;
    number?: number;
    position?: string;
    height?: string;
    weight?: number;
    minutes_per_game?: number;
    points_per_game: number;
    rebounds_per_game: number;
    assists_per_game: number;
    image_url?: string;
    team?: {
      name: string;
      abbrev?: string;
      logoUrl?: string;
      brandColor?: string;
      accentColor?: string;
    };
  };
  summary: string;
  delay?: number;
  onOpenDetails?: () => void;
}

export function PlayerCard({ player, summary, delay = 0, onOpenDetails }: PlayerCardProps) {
  const teamBrand = getTeamBrand({ abbrev: player.team?.abbrev, name: player.team?.name });
  const brandColor = player.team?.brandColor || teamBrand.brandColor;
  const accentColor = player.team?.accentColor || teamBrand.accentColor;
  const fallbackImage = player.team?.logoUrl || teamBrand.logoUrl;
  const heroStyle = {
    background: `linear-gradient(145deg, ${hexToRgba(brandColor, 0.22)}, ${hexToRgba(accentColor, 0.08)} 64%, rgba(7,9,12,0.92) 100%)`,
    borderColor: hexToRgba(brandColor, 0.26),
  };

  return (
    <GlowingCard
      glowColor="blue"
      delay={delay}
      className={`h-full overflow-hidden p-0 ${onOpenDetails ? 'cursor-pointer' : ''}`}
      onClick={onOpenDetails}
    >
      <div className="border-b border-white/6 p-5" style={heroStyle}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
              {player.position || 'Player'} / #{player.number || '--'}
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">
              {player.first_name} {player.last_name}
            </h3>
            <p className="mt-1 text-sm text-slate-200">{player.team?.name || 'NBA roster'}</p>
          </div>
          <TeamMark team={player.team} size="sm" />
        </div>

        <div className="mt-5 flex items-end gap-4">
          <div className="h-28 w-24 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-black/20">
            <img
              src={player.image_url || fallbackImage}
              alt={`${player.first_name} ${player.last_name}`}
              className="h-full w-full object-cover object-top"
              loading="lazy"
              decoding="async"
              onError={(event) => {
                (event.target as HTMLImageElement).src = fallbackImage;
              }}
            />
          </div>

          <div className="min-h-[84px] flex-1">
            <p className="text-sm leading-6 text-slate-100">{summary}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="stat-grid grid-cols-3">
          <div className="stat-grid-cell">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">PTS</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{player.points_per_game.toFixed(1)}</p>
          </div>
          <div className="stat-grid-cell">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">REB</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{player.rebounds_per_game.toFixed(1)}</p>
          </div>
          <div className="stat-grid-cell">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">AST</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{player.assists_per_game.toFixed(1)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex min-h-[30px] items-center justify-between gap-3 border-b border-white/6 pb-2 text-slate-300">
            <span className="text-slate-500">Height</span>
            <span className="font-medium text-white">{player.height || 'N/A'}</span>
          </div>
          <div className="flex min-h-[30px] items-center justify-between gap-3 border-b border-white/6 pb-2 text-slate-300">
            <span className="text-slate-500">Weight</span>
            <span className="font-medium text-white">{player.weight ? `${player.weight} kg` : 'N/A'}</span>
          </div>
          <div className="flex min-h-[30px] items-center justify-between gap-3 text-slate-300">
            <span className="text-slate-500">Minutes</span>
            <span className="font-medium tabular-nums text-white">{player.minutes_per_game?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="flex min-h-[30px] items-center justify-between gap-3 text-slate-300">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-white">{player.position || 'Rotation'}</span>
          </div>
        </div>

        {onOpenDetails && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails();
            }}
            className="btn-secondary mt-5 w-full justify-between"
          >
            Open scout report
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </GlowingCard>
  );
}
