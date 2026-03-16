import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, Users, X } from 'lucide-react';
import { apiRequest, type Player } from '@/shared/api/client';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { PlayerCard } from '@/shared/ui/PlayerCard';
import { TeamMark } from '@/shared/ui/TeamMark';
import { hexToRgba } from '@/shared/lib/teamBrand';

type PlayersView = 'cards' | 'board';

const PLAYER_IMAGE_FALLBACK = 'https://www.nba.com/assets/logos/teams/primary/web/NBA.svg';

function formatFullName(player: Player) {
  return `${player.first_name} ${player.last_name}`.trim();
}

function getPlayerArchetype(player: Player) {
  if (player.points_per_game >= 28 && player.assists_per_game >= 6) {
    return 'offensive engine';
  }

  if (player.assists_per_game >= 8) {
    return 'lead playmaker';
  }

  if (player.rebounds_per_game >= 10 && (player.blocks_per_game || 0) >= 1) {
    return 'interior anchor';
  }

  if (player.points_per_game >= 22) {
    return 'primary scorer';
  }

  if (player.rebounds_per_game >= 8) {
    return 'frontcourt finisher';
  }

  return 'rotation connector';
}

function getPlayerSummary(player: Player) {
  const name = formatFullName(player);
  const teamName = player.team?.name || 'his team';
  return `${name} profiles as a ${getPlayerArchetype(player)} for ${teamName}, bringing ${player.points_per_game.toFixed(1)} points and ${player.assists_per_game.toFixed(1)} assists per game.`;
}

function getPlayerFallbackImage(player: Player) {
  return player.team?.logoUrl || PLAYER_IMAGE_FALLBACK;
}

function getPlayerStrengths(player: Player) {
  const strengths: string[] = [];

  if (player.points_per_game >= 25) {
    strengths.push('High-volume scoring load');
  } else if (player.points_per_game >= 18) {
    strengths.push('Reliable secondary scoring');
  } else {
    strengths.push('Efficient complementary production');
  }

  if (player.assists_per_game >= 7) {
    strengths.push('Creates offense for others');
  } else if (player.assists_per_game >= 4) {
    strengths.push('Keeps the ball moving');
  } else {
    strengths.push('Plays within a defined role');
  }

  if (player.rebounds_per_game >= 9) {
    strengths.push('Controls the glass');
  } else if ((player.blocks_per_game || 0) >= 1.2 || (player.steals_per_game || 0) >= 1.3) {
    strengths.push('Adds defensive events');
  } else {
    strengths.push('Supports the rotation cleanly');
  }

  return strengths;
}

function getScoutParagraphs(player: Player) {
  const name = formatFullName(player);
  const teamName = player.team?.name || 'his team';
  const archetype = getPlayerArchetype(player);

  return [
    `${name} works as a ${archetype} for ${teamName}. With ${player.points_per_game.toFixed(1)} points, ${player.rebounds_per_game.toFixed(1)} rebounds and ${player.assists_per_game.toFixed(1)} assists per game, he gives this roster a stable production base every night.`,
    player.assists_per_game >= 6
      ? `The playmaking profile is a major part of the package. He can bend possessions with the ball, keep pressure on help defenders and still create clean looks for teammates when the defense loads up.`
      : `The value comes more from role clarity and repeatable possessions. He can stay within structure, finish the actions built for him and keep the offensive floor balanced around higher-usage teammates.`,
    (player.rebounds_per_game >= 8 || (player.blocks_per_game || 0) >= 1)
      ? `Physically, the profile reads strong enough to impact extra possessions as well. The rebounding and interior presence help his lineup survive tougher stretches without losing shape.`
      : `The profile is less about raw size and more about rhythm, spacing and possession quality. That makes him especially useful when the staff wants cleaner decision-making from the unit.`,
  ];
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PlayersView>('cards');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    apiRequest<Player[]>('/players')
      .then(setPlayers)
      .catch((error) => console.error('Failed to load players', error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPlayer) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPlayer(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPlayer]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return players;
    }

    return players.filter((player) =>
      [formatFullName(player), player.team?.name, player.position]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [players, search]);

  const topScorer = filteredPlayers[0];
  const topPlaymaker = [...filteredPlayers].sort((left, right) => right.assists_per_game - left.assists_per_game)[0];
  const averagePoints =
    filteredPlayers.length > 0
      ? filteredPlayers.reduce((sum, player) => sum + player.points_per_game, 0) / filteredPlayers.length
      : 0;

  return (
    <div className="space-y-6">
      <GlowingCard glowColor="orange" className="p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[rgba(236,216,171,0.72)]">Player cards</p>
                <h1 className="mt-2 font-spacegrotesk text-3xl font-bold text-white sm:text-4xl">
                  Card-first roster view with scouting notes.
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Players now live as cards first. Open any one to read a fuller scouting summary instead of just scanning a raw stat line.
            </p>
          </div>

          <div className="w-full max-w-[360px] space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">Search players</label>
              <div className="relative mt-3">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Luka, Bam, Jayson..."
                  className="field-shell py-3 pl-12 pr-4"
                />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">View</p>
              <div className="segmented-bar mt-3">
                {([
                  ['cards', 'Cards'],
                  ['board', 'Board'],
                ] as Array<[PlayersView, string]>).map(([option, label]) => (
                  <button
                    key={option}
                    onClick={() => setView(option)}
                    className={`segmented-item ${view === option ? 'segmented-item-active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="surface-muted">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top scorer</p>
            <p className="mt-2 text-base font-semibold text-white">{topScorer ? formatFullName(topScorer) : 'Unavailable'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {topScorer ? `${topScorer.points_per_game.toFixed(1)} PTS` : 'No data'}
            </p>
          </div>
          <div className="surface-muted">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top playmaker</p>
            <p className="mt-2 text-base font-semibold text-white">{topPlaymaker ? formatFullName(topPlaymaker) : 'Unavailable'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {topPlaymaker ? `${topPlaymaker.assists_per_game.toFixed(1)} AST` : 'No data'}
            </p>
          </div>
          <div className="surface-muted">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average scoring</p>
            <p className="mt-2 text-base font-semibold text-white">{averagePoints.toFixed(1)} PPG</p>
            <p className="mt-1 text-sm text-slate-400">Across the current result set.</p>
          </div>
          <div className="surface-muted text-sm text-slate-300">
            <Sparkles className="mr-2 inline h-4 w-4 text-[#ddb36a]" />
            Click any card to open a scout report with player description and context.
          </div>
        </div>
      </GlowingCard>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[rgba(216,180,106,0.22)] border-t-[#c96a2b]" />
        </div>
      ) : view === 'cards' ? (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPlayers.map((player, index) => (
            <PlayerCard
              key={player.id}
              player={player}
              summary={getPlayerSummary(player)}
              delay={index * 0.03}
              onOpenDetails={() => setSelectedPlayer(player)}
            />
          ))}
        </section>
      ) : (
        <GlowingCard glowColor="green" className="overflow-hidden p-0">
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
                <col style={{ width: '180px' }} />
                <col style={{ width: '72px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '90px' }} />
              </colgroup>
              <thead className="bg-white/[0.02]">
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Player
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Team
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Pos
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    MIN
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    PTS
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    REB
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    AST
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => {
                  const fallbackImage = getPlayerFallbackImage(player);

                  return (
                    <tr key={player.id} className="border-t border-white/6 transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4 align-middle">
                        <div className="flex min-w-0 items-center gap-4">
                          <img
                            src={player.image_url || fallbackImage}
                            alt={formatFullName(player)}
                            className="h-14 w-14 shrink-0 rounded-[12px] border border-white/8 object-cover object-top"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              (event.target as HTMLImageElement).src = fallbackImage;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">{formatFullName(player)}</p>
                            <button
                              type="button"
                              onClick={() => setSelectedPlayer(player)}
                              className="mt-1 truncate text-left text-xs uppercase tracking-[0.16em] text-slate-500 transition hover:text-white"
                            >
                              Open scout report
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <TeamMark team={player.team} size="sm" />
                          <span className="truncate text-sm text-white">
                            {player.team?.abbrev || player.team?.name || 'NBA'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center align-middle text-sm text-slate-300">
                        {player.position || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-right align-middle text-sm tabular-nums text-white">
                        {player.minutes_per_game?.toFixed(1) || '0.0'}
                      </td>
                      <td className="px-5 py-4 text-right align-middle text-sm font-semibold tabular-nums text-white">
                        {player.points_per_game.toFixed(1)}
                      </td>
                      <td className="px-5 py-4 text-right align-middle text-sm tabular-nums text-white">
                        {player.rebounds_per_game.toFixed(1)}
                      </td>
                      <td className="px-5 py-4 text-right align-middle text-sm tabular-nums text-white">
                        {player.assists_per_game.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden">
            {filteredPlayers.map((player) => {
              const fallbackImage = getPlayerFallbackImage(player);

              return (
                <div key={player.id} className="table-row px-5 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <img
                      src={player.image_url || fallbackImage}
                      alt={formatFullName(player)}
                      className="h-14 w-14 shrink-0 rounded-[12px] border border-white/8 object-cover object-top"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{formatFullName(player)}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayer(player)}
                        className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 transition hover:text-white"
                      >
                        Open scout report
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Team</span>
                    <div className="flex items-center gap-3">
                      <TeamMark team={player.team} size="sm" />
                      <span className="truncate text-sm text-white">{player.team?.abbrev || player.team?.name || 'NBA'}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">POS</p>
                      <p className="mt-2 text-sm text-white">{player.position || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">MIN</p>
                      <p className="mt-2 text-sm tabular-nums text-white">{player.minutes_per_game?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">PTS</p>
                      <p className="mt-2 text-sm font-semibold tabular-nums text-white">{player.points_per_game.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">REB</p>
                      <p className="mt-2 text-sm tabular-nums text-white">{player.rebounds_per_game.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">AST</p>
                      <p className="mt-2 text-sm tabular-nums text-white">{player.assists_per_game.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlowingCard>
      )}

      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(3,4,6,0.76)] px-4 py-8 backdrop-blur-md"
          onClick={() => setSelectedPlayer(null)}
        >
          <div className="mx-auto flex min-h-full max-w-5xl items-center">
            <div className="w-full" onClick={(event) => event.stopPropagation()}>
              <GlowingCard glowColor="orange" className="overflow-hidden p-0">
                <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div
                    className="border-b border-white/6 p-6 lg:border-b-0 lg:border-r"
                    style={{
                      borderColor: hexToRgba(selectedPlayer.team?.brandColor || '#d07939', 0.22),
                      background: `linear-gradient(180deg, ${hexToRgba(selectedPlayer.team?.brandColor || '#d07939', 0.26)}, rgba(8,10,14,0.94))`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="data-chip">{selectedPlayer.position || 'Player'}</span>
                      <TeamMark team={selectedPlayer.team} size="md" />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-[18px] border border-white/10 bg-black/20">
                      <img
                        src={selectedPlayer.image_url || getPlayerFallbackImage(selectedPlayer)}
                        alt={formatFullName(selectedPlayer)}
                        className="h-[320px] w-full object-cover object-top"
                        loading="eager"
                        decoding="async"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src = getPlayerFallbackImage(selectedPlayer);
                        }}
                      />
                    </div>

                    <div className="mt-6">
                      <h2 className="text-3xl font-semibold text-white">{formatFullName(selectedPlayer)}</h2>
                      <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-200">
                        {selectedPlayer.team?.name || 'NBA roster'} / #{selectedPlayer.number || '--'}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scout report</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          {formatFullName(selectedPlayer)} in context
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayer(null)}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <div className="surface-muted">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">PTS</p>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-white">{selectedPlayer.points_per_game.toFixed(1)}</p>
                      </div>
                      <div className="surface-muted">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">REB</p>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-white">{selectedPlayer.rebounds_per_game.toFixed(1)}</p>
                      </div>
                      <div className="surface-muted">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">AST</p>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-white">{selectedPlayer.assists_per_game.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Description</p>
                      <div className="mt-3 space-y-4 text-sm leading-7 text-slate-300">
                        {getScoutParagraphs(selectedPlayer).map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {getPlayerStrengths(selectedPlayer).map((strength) => (
                        <div key={strength} className="surface-muted">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Strength</p>
                          <p className="mt-2 text-sm font-medium text-white">{strength}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <div className="surface-muted">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Height</p>
                        <p className="mt-2 text-sm font-medium text-white">{selectedPlayer.height || 'N/A'}</p>
                      </div>
                      <div className="surface-muted">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Weight</p>
                        <p className="mt-2 text-sm font-medium text-white">{selectedPlayer.weight ? `${selectedPlayer.weight} kg` : 'N/A'}</p>
                      </div>
                      <div className="surface-muted">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Minutes</p>
                        <p className="mt-2 text-sm font-medium tabular-nums text-white">{selectedPlayer.minutes_per_game?.toFixed(1) || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlowingCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
