import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Cpu,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { apiRequest, type Match, type Prediction, type Team } from '@/shared/api/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { GlowingCard } from '@/shared/ui/GlowingCard';
import { TeamMark } from '@/shared/ui/TeamMark';

type HomeTab = 'overview' | 'schedule' | 'teams' | 'predictions';
type DashboardStats = {
  accuracy?: number | null;
  totalTrainingData?: number;
  totalTrainingGames?: number;
  totalPredictions?: number;
  modelVersion?: string;
  lastUpdated?: string;
};

const tabs: Array<{ id: HomeTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Games' },
  { id: 'teams', label: 'Teams' },
  { id: 'predictions', label: 'Predictions' },
];

const numberFormatter = new Intl.NumberFormat('en-US');

function getTrainingSampleCount(stats: DashboardStats | null) {
  return stats?.totalTrainingData ?? stats?.totalTrainingGames ?? 0;
}

function getTeamWinRate(team: Team) {
  if (typeof team.winPct === 'number' && Number.isFinite(team.winPct)) {
    return team.winPct <= 1 ? team.winPct * 100 : team.winPct;
  }

  const totalGames = team.wins + team.losses;
  return totalGames > 0 ? (team.wins / totalGames) * 100 : 0;
}

function formatGameDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatGameTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTeamRecord(team: Team) {
  return `${numberFormatter.format(team.wins)}-${numberFormatter.format(team.losses)}`;
}

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HomeTab>('overview');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsData, matchesData, statsData] = await Promise.all([
          apiRequest<Team[]>('/teams'),
          apiRequest<Match[]>('/matches?limit=8'),
          apiRequest<DashboardStats>('/predict/stats'),
        ]);

        setTeams([...teamsData].sort((left, right) => getTeamWinRate(right) - getTeamWinRate(left)));
        setMatches(matchesData);
        setStats(statsData);

        if (user) {
          const predictionData = await apiRequest<Prediction[]>('/predictions/my');
          setPredictions(predictionData.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to load dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const featuredMatch = useMemo(
    () => matches.find((match) => match.status !== 'finished') || matches[0] || null,
    [matches],
  );
  const topTeams = useMemo(() => teams.slice(0, 6), [teams]);
  const upcomingMatches = useMemo(() => matches.filter((match) => match.status !== 'finished'), [matches]);
  const recentMatches = useMemo(() => matches.filter((match) => match.status === 'finished'), [matches]);
  const accuracyValue = typeof stats?.accuracy === 'number' ? Math.round(stats.accuracy) : null;
  const accuracyLabel = accuracyValue === null ? '--' : `${accuracyValue}%`;
  const sampleCount = getTrainingSampleCount(stats);
  const featuredLabel = featuredMatch?.status === 'finished' || upcomingMatches.length === 0 ? 'Latest result' : 'Next matchup';

  const summary = useMemo(
    () => [
      {
        label: 'Accuracy',
        value: accuracyLabel,
        detail: accuracyValue === null ? 'awaiting evaluated run' : 'validated model output',
        icon: Cpu,
      },
      {
        label: 'Teams',
        value: `${teams.length}`,
        detail: 'franchise profiles',
        icon: Trophy,
      },
      {
        label: 'Games',
        value: `${matches.length}`,
        detail: 'loaded fixtures',
        icon: CalendarDays,
      },
      {
        label: 'Samples',
        value: numberFormatter.format(sampleCount),
        detail: 'historical game rows',
        icon: Activity,
      },
    ],
    [accuracyLabel, accuracyValue, matches.length, sampleCount, teams.length],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[rgba(232,161,67,0.2)] border-t-[var(--accent)]" />
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Loading dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.14fr)_380px]">
        <GlowingCard glowColor="orange" className="p-7 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="data-chip">
                <ShieldCheck className="h-3.5 w-3.5" />
                Connected stack
              </span>
              <span className="data-chip">
                <Sparkles className="h-3.5 w-3.5" />
                Live basketball workspace
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {user ? `${user.role} session active` : 'Guest mode'}
            </p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace overview</p>
              <h1 className="mt-3 max-w-3xl font-spacegrotesk text-3xl font-bold leading-tight text-white sm:text-4xl">
                Live basketball data, prediction context and team profiles in one calmer board.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                This view now leans on the actual backend state: franchise data, loaded games, model samples and quick
                routes into schedule, teams and prediction history without the extra landing-page filler.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => navigate(user ? '/prediction/new' : '/auth')} className="btn-primary">
                  {user ? 'New prediction' : 'Sign in'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate('/matches')} className="btn-secondary">
                  Open schedule
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="surface-muted">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Model version</p>
                <p className="mt-2 text-lg font-semibold text-white">{stats?.modelVersion || 'v1.0'}</p>
                <p className="mt-2 text-sm text-slate-400">Published backend model snapshot.</p>
              </div>
              <div className="surface-muted">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Data window</p>
                <p className="mt-2 text-lg font-semibold text-white">{recentMatches.length} finals</p>
                <p className="mt-2 text-sm text-slate-400">{upcomingMatches.length} upcoming games in the current feed.</p>
              </div>
              <div className="surface-muted">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last sync</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {stats?.lastUpdated ? formatGameDate(stats.lastUpdated) : 'Live now'}
                </p>
                <p className="mt-2 text-sm text-slate-400">Snapshot pulled from the Node API.</p>
              </div>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard glowColor="blue" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{featuredLabel}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {featuredMatch ? `${featuredMatch.homeTeam.abbrev} vs ${featuredMatch.awayTeam.abbrev}` : 'No game loaded'}
              </h2>
            </div>
            <span className="data-chip">
              {featuredMatch?.status === 'finished' ? 'Final' : featuredMatch ? 'Scheduled' : 'Waiting'}
            </span>
          </div>

          {featuredMatch ? (
            <div className="mt-6 space-y-4">
              <div className="surface-muted flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</p>
                  <p className="mt-2 text-sm font-medium text-white">{formatGameDate(featuredMatch.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Window</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {featuredMatch.status === 'finished' ? 'Final result' : formatGameTime(featuredMatch.date)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] sm:items-center">
                <div className="surface-muted text-center">
                  <TeamMark team={featuredMatch.homeTeam} size="md" className="mx-auto" />
                  <p className="mt-3 text-lg font-semibold text-white">{featuredMatch.homeTeam.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {featuredMatch.homeTeam.city || 'Home side'}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    {featuredMatch.status === 'finished' ? 'Score' : 'Tipoff'}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
                    {featuredMatch.status === 'finished'
                      ? `${featuredMatch.homeScore ?? '--'}:${featuredMatch.awayScore ?? '--'}`
                      : formatGameTime(featuredMatch.date)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {featuredMatch.status === 'finished' ? 'game final' : 'scheduled'}
                  </p>
                </div>

                <div className="surface-muted text-center">
                  <TeamMark team={featuredMatch.awayTeam} size="md" className="mx-auto" />
                  <p className="mt-3 text-lg font-semibold text-white">{featuredMatch.awayTeam.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {featuredMatch.awayTeam.city || 'Away side'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="surface-muted">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Model confidence</p>
                  <p className="mt-2 text-lg font-semibold text-white">{accuracyLabel}</p>
                </div>
                <div className="surface-muted">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Loaded games</p>
                  <p className="mt-2 text-lg font-semibold text-white">{matches.length}</p>
                </div>
                <div className="surface-muted">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Training rows</p>
                  <p className="mt-2 text-lg font-semibold text-white">{numberFormatter.format(sampleCount)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-400">The next loaded fixture will appear here.</p>
          )}
        </GlowingCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <GlowingCard key={item.label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-[2rem] font-semibold leading-none text-white">{item.value}</p>
                <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-white/[0.04] p-2.5 text-slate-200">
                <item.icon className="h-4 w-4" />
              </div>
            </div>
          </GlowingCard>
        ))}
      </section>

      <section className="space-y-4">
        <div className="segmented-bar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`segmented-item ${activeTab === tab.id ? 'segmented-item-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <GlowingCard glowColor="orange" className="p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workspace status</p>
              <div className="mt-4 grid gap-3">
                <div className="surface-muted">
                  <p className="text-sm font-semibold text-white">Prediction service</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {accuracyValue === null
                      ? 'The model endpoint is reachable, but no validated accuracy snapshot has been published yet.'
                      : `Latest published accuracy is ${accuracyLabel} with model version ${stats?.modelVersion || 'v1.0'}.`}
                  </p>
                </div>
                <div className="surface-muted">
                  <p className="text-sm font-semibold text-white">Current game window</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {recentMatches.length} finished games and {upcomingMatches.length} upcoming games are available in
                    the current feed.
                  </p>
                </div>
                <div className="surface-muted">
                  <p className="text-sm font-semibold text-white">Dataset scope</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {teams.length} franchises are loaded, with {numberFormatter.format(sampleCount)} historical rows
                    connected to the prediction backend.
                  </p>
                </div>
              </div>
            </GlowingCard>

            <GlowingCard glowColor="green" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Franchise board</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Top win-rate profiles</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    This dataset exposes franchise-level history, so the board ranks teams by all-time win rate instead
                    of season standings.
                  </p>
                </div>
                <button onClick={() => navigate('/teams')} className="btn-secondary">
                  Team index
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {topTeams.map((team, index) => (
                  <button
                    key={team.id}
                    onClick={() => navigate(`/teams/${team.id}`)}
                    className="grid w-full gap-3 rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05] md:grid-cols-[28px_40px_minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="text-sm font-semibold text-slate-500">{index + 1}</div>
                    <TeamMark team={team} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{team.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {team.city || team.state || 'NBA'} • {team.arena || 'Arena unavailable'}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-lg font-semibold tabular-nums text-white">{getTeamWinRate(team).toFixed(1)}%</p>
                      <p className="text-xs text-slate-400">{formatTeamRecord(team)} all-time</p>
                    </div>
                  </button>
                ))}
              </div>
            </GlowingCard>
          </div>
        )}

        {activeTab === 'schedule' && (
          <GlowingCard glowColor="blue" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Loaded games</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {upcomingMatches.length ? 'Upcoming and recent games' : 'Latest loaded results'}
                </h2>
              </div>
              <button onClick={() => navigate('/matches')} className="btn-secondary">
                All games
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/matches/${match.id}`)}
                  className="grid w-full gap-4 rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05] lg:grid-cols-[170px_minmax(0,1fr)_120px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock3 className="h-4 w-4" />
                      {formatGameDate(match.date)}
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {match.status === 'finished' ? 'Final result' : formatGameTime(match.date)}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-3 text-sm font-semibold text-white">
                      <TeamMark team={match.homeTeam} size="sm" />
                      <span className="truncate">{match.homeTeam.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-semibold text-white">
                      <TeamMark team={match.awayTeam} size="sm" />
                      <span className="truncate">{match.awayTeam.name}</span>
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-lg font-semibold tabular-nums text-white">
                      {match.homeScore ?? '--'} : {match.awayScore ?? '--'}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {match.homeTeam.abbrev} vs {match.awayTeam.abbrev}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </GlowingCard>
        )}

        {activeTab === 'teams' && (
          <GlowingCard glowColor="green" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Team board</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Franchise profiles</h2>
              </div>
              <button onClick={() => navigate('/teams')} className="btn-secondary">
                Team index
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {topTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => navigate(`/teams/${team.id}`)}
                  className="rounded-[18px] border border-white/8 bg-white/[0.03] px-5 py-5 text-left transition hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {team.city || team.state || 'NBA franchise'}
                      </p>
                      <p className="mt-2 truncate text-xl font-semibold text-white">{team.name}</p>
                      <p className="mt-2 truncate text-sm text-slate-400">{team.arena || 'Arena unavailable'}</p>
                    </div>
                    <TeamMark team={team} size="md" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="surface-muted">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Win %</p>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-white">{getTeamWinRate(team).toFixed(1)}%</p>
                    </div>
                    <div className="surface-muted">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">PPG</p>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-white">{team.avgPointsFor.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                    <span>{formatTeamRecord(team)} all-time</span>
                    <span>{team.foundedYear || '--'}</span>
                  </div>
                </button>
              ))}
            </div>
          </GlowingCard>
        )}

        {activeTab === 'predictions' && (
          <GlowingCard glowColor="purple" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Prediction lane</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {user ? 'Recent model runs' : 'Prediction workspace'}
                </h2>
              </div>
              <button onClick={() => navigate(user ? '/history' : '/auth')} className="btn-secondary">
                {user ? 'History' : 'Sign in'}
              </button>
            </div>

            {user && predictions.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.id}
                    onClick={() => navigate(`/prediction/${prediction.id}`)}
                    className="flex w-full items-center justify-between rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {prediction.team1?.abbrev} vs {prediction.team2?.abbrev}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {prediction.expectedScoreTeam1}:{prediction.expectedScoreTeam2} expected score
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[var(--accent)]">{prediction.confidence}%</p>
                      <p className="text-xs text-slate-500">{new Date(prediction.createdAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[14px] border border-white/8 bg-white/[0.03] px-5 py-6">
                <p className="text-sm leading-6 text-slate-300">
                  {user
                    ? 'You have not saved any prediction runs yet. Start with a matchup and the result will appear here and in history.'
                    : 'Sign in to save predictions, revisit results and compare model outputs over time.'}
                </p>
              </div>
            )}
          </GlowingCard>
        )}
      </section>
    </div>
  );
};

export default HomePage;
