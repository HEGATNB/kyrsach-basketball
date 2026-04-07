import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Users, X } from 'lucide-react';
import { apiRequest, type Player, type Team } from '@/shared/api/client';
import {
  formatPlayerDraft,
  formatPlayerGames,
  getPlayerFallbackImage,
  getPlayerImageUrl,
  formatPlayerMinutes,
  formatPlayerName,
  formatPlayerPercent,
  formatPlayerWeight,
} from '@/shared/lib/playerDisplay';
import { hexToRgba } from '@/shared/lib/teamBrand';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { PlayerCard } from '@/shared/ui/PlayerCard';
import { TeamMark } from '@/shared/ui/TeamMark';

type PlayersView = 'cards' | 'board';

function normalizeLookup(value?: string | null) {
  return value?.trim().toUpperCase() || '';
}

function mergePlayersWithTeams(players: Player[], teams: Team[]) {
  const teamsByAbbrev = new Map(teams.map((team) => [normalizeLookup(team.abbrev), team]));
  const teamsByName = new Map(teams.map((team) => [normalizeLookup(team.name), team]));

  return players.map((player) => {
    const resolvedTeam =
      teamsByAbbrev.get(normalizeLookup(player.team_abbrev || player.team?.abbrev)) ||
      teamsByName.get(normalizeLookup(player.team?.name));

    if (!resolvedTeam) {
      return player;
    }

    return {
      ...player,
      team_id: player.team_id || resolvedTeam.id,
      team: {
        ...resolvedTeam,
        ...player.team,
        id: resolvedTeam.id,
        name: resolvedTeam.name,
        city: resolvedTeam.city,
        abbrev: resolvedTeam.abbrev,
        arena: resolvedTeam.arena,
        foundedYear: resolvedTeam.foundedYear,
        logoUrl: resolvedTeam.logoUrl || player.team?.logoUrl,
        brandColor: resolvedTeam.brandColor || player.team?.brandColor,
        accentColor: resolvedTeam.accentColor || player.team?.accentColor,
      },
    };
  });
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-muted">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PlayersView>('cards');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [playersData, teamsData] = await Promise.all([
          apiRequest<Player[]>('/players'),
          apiRequest<Team[]>('/teams'),
        ]);

        setTeams(teamsData);
        setPlayers(
          mergePlayersWithTeams(playersData, teamsData).sort(
            (left, right) => right.points_per_game - left.points_per_game,
          ),
        );
      } catch (error) {
        console.error('Failed to load players or teams', error);
      } finally {
        setLoading(false);
      }
    };

    load();
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
      [
        formatPlayerName(player),
        player.team?.name,
        player.team?.city,
        player.team?.abbrev,
        player.team_abbrev,
        player.position,
        player.season,
        player.college,
        player.country,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [players, search]);

  const topScorer = useMemo(
    () => [...filteredPlayers].sort((left, right) => right.points_per_game - left.points_per_game)[0],
    [filteredPlayers],
  );
  const topPlaymaker = useMemo(
    () => [...filteredPlayers].sort((left, right) => right.assists_per_game - left.assists_per_game)[0],
    [filteredPlayers],
  );
  const averagePoints =
    filteredPlayers.length > 0
      ? filteredPlayers.reduce((sum, player) => sum + player.points_per_game, 0) / filteredPlayers.length
      : 0;
  const visibleTeams = new Set(
    filteredPlayers.map((player) => player.team?.abbrev || player.team_abbrev || player.team?.name || 'NBA'),
  ).size;
  const seasonCount = new Set(filteredPlayers.map((player) => player.season).filter(Boolean)).size;
  const selectedPlayerTint = selectedPlayer?.team?.brandColor || '#d07939';

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
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Player database</p>
                <h1 className="mt-2 font-spacegrotesk text-3xl font-bold text-white sm:text-4xl">
                  Cleaner roster cards built from season data.
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Team context is now merged from the team dataset, while player cards focus on season, games, age, school
              and actual box-score output from the database instead of decorative scouting copy.
            </p>
          </div>

          <div className="w-full max-w-[360px] space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.22em] text-slate-500">Search players</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Player, team, season, college..."
                className="field-shell mt-3 px-4 py-3"
              />
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                {teams.length} teams synced for logos and context.
              </p>
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
            <p className="mt-2 text-base font-semibold text-white">{topScorer ? formatPlayerName(topScorer) : 'Unavailable'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {topScorer ? `${topScorer.points_per_game.toFixed(1)} PTS • ${topScorer.season || 'N/A'}` : 'No data'}
            </p>
          </div>
          <div className="surface-muted">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Top playmaker</p>
            <p className="mt-2 text-base font-semibold text-white">{topPlaymaker ? formatPlayerName(topPlaymaker) : 'Unavailable'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {topPlaymaker ? `${topPlaymaker.assists_per_game.toFixed(1)} AST • ${topPlaymaker.season || 'N/A'}` : 'No data'}
            </p>
          </div>
          <div className="surface-muted">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average scoring</p>
            <p className="mt-2 text-base font-semibold text-white">{averagePoints.toFixed(1)} PPG</p>
            <p className="mt-1 text-sm text-slate-400">{seasonCount || 0} seasons in the current result set.</p>
          </div>
          <div className="surface-muted text-sm text-slate-300">
            <Sparkles className="mr-2 inline h-4 w-4 text-[var(--accent)]" />
            {visibleTeams} team contexts merged into player cards from the team dataset.
          </div>
        </div>
      </GlowingCard>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[rgba(232,161,67,0.2)] border-t-[var(--accent)]" />
        </div>
      ) : view === 'cards' ? (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPlayers.map((player, index) => (
            <PlayerCard
              key={player.id}
              player={player}
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
                <col style={{ width: '156px' }} />
                <col style={{ width: '104px' }} />
                <col style={{ width: '76px' }} />
                <col style={{ width: '88px' }} />
                <col style={{ width: '88px' }} />
                <col style={{ width: '88px' }} />
              </colgroup>
              <thead className="bg-white/[0.02]">
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Player
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Team
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Season
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    GP
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
                  const playerImageUrl = getPlayerImageUrl(player);
                  const fallbackImage = getPlayerFallbackImage(player);

                  return (
                    <tr key={player.id} className="border-t border-white/6 transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4 align-middle">
                        <div className="flex min-w-0 items-center gap-4">
                          <img
                            src={playerImageUrl}
                            alt={formatPlayerName(player)}
                            className="h-14 w-14 shrink-0 rounded-[12px] border border-white/8 object-cover object-top"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              (event.target as HTMLImageElement).src = fallbackImage;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">{formatPlayerName(player)}</p>
                            <button
                              type="button"
                              onClick={() => setSelectedPlayer(player)}
                              className="mt-1 truncate text-left text-xs uppercase tracking-[0.16em] text-slate-500 transition hover:text-white"
                            >
                              {player.position || 'Player'} {player.number ? `• #${player.number}` : ''}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <TeamMark team={player.team} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{player.team?.abbrev || player.team_abbrev || 'NBA'}</p>
                            <p className="truncate text-xs text-slate-500">{player.team?.city || player.team?.name || 'League'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle text-sm text-white">{player.season || 'N/A'}</td>
                      <td className="px-5 py-4 text-right align-middle text-sm tabular-nums text-white">
                        {formatPlayerGames(player.games_played)}
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
              const playerImageUrl = getPlayerImageUrl(player);
              const fallbackImage = getPlayerFallbackImage(player);

              return (
                <div key={player.id} className="border-b border-white/6 p-5 last:border-0">
                  <div className="flex min-w-0 items-center gap-4">
                    <img
                      src={playerImageUrl}
                      alt={formatPlayerName(player)}
                      className="h-14 w-14 shrink-0 rounded-[12px] border border-white/8 object-cover object-top"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{formatPlayerName(player)}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayer(player)}
                        className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500 transition hover:text-white"
                      >
                        {player.season || 'Season n/a'} • {player.position || 'Player'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Team</span>
                    <div className="flex items-center gap-3">
                      <TeamMark team={player.team} size="sm" />
                      <span className="truncate text-sm text-white">{player.team?.abbrev || player.team_abbrev || 'NBA'}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <InfoTile label="GP" value={formatPlayerGames(player.games_played)} />
                    <InfoTile label="PTS" value={player.points_per_game.toFixed(1)} />
                    <InfoTile label="REB" value={player.rebounds_per_game.toFixed(1)} />
                    <InfoTile label="AST" value={player.assists_per_game.toFixed(1)} />
                    <InfoTile label="Age" value={player.age ? String(player.age) : 'N/A'} />
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
          <div className="mx-auto flex min-h-full max-w-6xl items-center">
            <div className="w-full" onClick={(event) => event.stopPropagation()}>
              <GlowingCard glowColor="orange" className="overflow-hidden p-0">
                <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div
                    className="border-b border-white/6 p-6 lg:border-b-0 lg:border-r"
                    style={{
                      borderColor: hexToRgba(selectedPlayerTint, 0.18),
                      background: `linear-gradient(180deg, rgba(255,246,229,0.03), rgba(255,246,229,0.01)), radial-gradient(circle at top right, ${hexToRgba(selectedPlayerTint, 0.16)}, transparent 44%)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="data-chip">{selectedPlayer.position || 'Player'}</span>
                      <TeamMark team={selectedPlayer.team} size="md" />
                    </div>

                    <div className="mt-6 overflow-hidden rounded-[18px] border border-white/10 bg-black/20">
                      <img
                        src={getPlayerImageUrl(selectedPlayer)}
                        alt={formatPlayerName(selectedPlayer)}
                        className="h-[320px] w-full object-cover object-top"
                        loading="eager"
                        decoding="async"
                        onError={(event) => {
                          (event.target as HTMLImageElement).src = getPlayerFallbackImage(selectedPlayer);
                        }}
                      />
                    </div>

                    <div className="mt-6">
                      <h2 className="text-3xl font-semibold text-white">{formatPlayerName(selectedPlayer)}</h2>
                      <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-300">
                        {selectedPlayer.team?.name || selectedPlayer.team_abbrev || 'NBA roster'}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {selectedPlayer.season || 'Season n/a'} season • {formatPlayerGames(selectedPlayer.games_played)} GP •{' '}
                        {selectedPlayer.points_per_game.toFixed(1)} PTS • {selectedPlayer.rebounds_per_game.toFixed(1)} REB •{' '}
                        {selectedPlayer.assists_per_game.toFixed(1)} AST
                      </p>
                    </div>
                  </div>

                  <div className="p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Player profile</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          Database-backed season snapshot
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

                    <div className="mt-6 grid gap-3 md:grid-cols-5">
                      <InfoTile label="PTS" value={selectedPlayer.points_per_game.toFixed(1)} />
                      <InfoTile label="REB" value={selectedPlayer.rebounds_per_game.toFixed(1)} />
                      <InfoTile label="AST" value={selectedPlayer.assists_per_game.toFixed(1)} />
                      <InfoTile label="GP" value={formatPlayerGames(selectedPlayer.games_played)} />
                      <InfoTile label="MIN" value={formatPlayerMinutes(selectedPlayer.minutes_per_game)} />
                    </div>

                    <div className="mt-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Profile</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <InfoTile label="Season" value={selectedPlayer.season || 'N/A'} />
                        <InfoTile label="Position" value={selectedPlayer.position || 'N/A'} />
                        <InfoTile label="Number" value={selectedPlayer.number ? `#${selectedPlayer.number}` : 'N/A'} />
                        <InfoTile label="Height" value={selectedPlayer.height || selectedPlayer.player_height || 'N/A'} />
                        <InfoTile label="Weight" value={formatPlayerWeight(selectedPlayer.weight || selectedPlayer.player_weight)} />
                        <InfoTile label="Country" value={selectedPlayer.country || 'N/A'} />
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Advanced metrics</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <InfoTile label="True shooting" value={formatPlayerPercent(selectedPlayer.true_shooting)} />
                        <InfoTile label="Usage rate" value={formatPlayerPercent(selectedPlayer.usage_rate)} />
                        <InfoTile label="Assist %" value={formatPlayerPercent(selectedPlayer.assist_percentage)} />
                        <InfoTile
                          label="Net rating"
                          value={typeof selectedPlayer.net_rating === 'number' ? selectedPlayer.net_rating.toFixed(1) : 'N/A'}
                        />
                        <InfoTile label="Off reb %" value={formatPlayerPercent(selectedPlayer.offensive_rebound_pct)} />
                        <InfoTile label="Def reb %" value={formatPlayerPercent(selectedPlayer.defensive_rebound_pct)} />
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Background</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <InfoTile label="Team" value={selectedPlayer.team?.name || selectedPlayer.team_abbrev || 'N/A'} />
                        <InfoTile label="City" value={selectedPlayer.team?.city || 'N/A'} />
                        <InfoTile label="Arena" value={selectedPlayer.team?.arena || 'N/A'} />
                        <InfoTile label="College" value={selectedPlayer.college || 'N/A'} />
                        <InfoTile label="Draft" value={formatPlayerDraft(selectedPlayer)} />
                        <InfoTile label="Age" value={selectedPlayer.age ? `${selectedPlayer.age}` : 'N/A'} />
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
