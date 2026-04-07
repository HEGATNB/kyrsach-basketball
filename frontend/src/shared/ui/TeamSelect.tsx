import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { Team } from '@/shared/api/client';
import { TeamMark } from './TeamMark';

interface TeamSelectProps {
  value: string;
  onChange: (value: string) => void;
  teams: Team[];
  placeholder: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function TeamSelect({
  value,
  onChange,
  teams,
  placeholder,
  emptyMessage = 'No teams matched the current search.',
  searchPlaceholder = 'Search teams...',
}: TeamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === value) || null,
    [teams, value],
  );

  const filteredTeams = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);

    if (!normalizedQuery) {
      return teams;
    }

    return teams.filter((team) =>
      [team.name, team.city, team.abbrev].some(
        (field) => field && normalizeSearchValue(field).includes(normalizedQuery),
      ),
    );
  }, [query, teams]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const focusFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (teamId: number) => {
    onChange(String(teamId));
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`field-shell flex min-h-[84px] items-center justify-between gap-4 px-4 py-4 text-left ${
          isOpen
            ? 'border-[rgba(245,132,38,0.38)] bg-[rgba(10,10,10,0.92)] shadow-[0_0_0_3px_rgba(245,132,38,0.08)]'
            : ''
        }`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <TeamMark team={selectedTeam} size="md" className="h-16 w-16 rounded-[18px]" />

          <div className="min-w-0">
            <p className={`truncate text-lg font-semibold ${selectedTeam ? 'text-white' : 'text-slate-200'}`}>
              {selectedTeam?.name || placeholder}
            </p>
            <p className="mt-1 truncate text-sm text-slate-400">
              {selectedTeam
                ? `${selectedTeam.wins}-${selectedTeam.losses} record | ${(selectedTeam.avgPointsFor || 0).toFixed(1)} PPG`
                : 'Open the list and choose a team with logo, record and search support.'}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(6,8,12,0.98)] shadow-[0_32px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="border-b border-white/8 px-4 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="field-shell border-white/8 bg-white/[0.04] py-3 pl-11 pr-4 text-sm"
              />
            </label>
          </div>

          <div id={listboxId} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {filteredTeams.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400">{emptyMessage}</div>
            ) : (
              filteredTeams.map((team) => {
                const isSelected = String(team.id) === value;

                return (
                  <button
                    key={team.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(team.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition ${
                      isSelected
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-200 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <TeamMark team={team} size="sm" className="h-12 w-12 rounded-[14px]" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-inherit">{team.name}</p>
                      <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                        {(team.abbrev || 'NBA').toUpperCase()} | {team.wins}-{team.losses}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-white">{(team.avgPointsFor || 0).toFixed(1)}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">PPG</p>
                    </div>

                    <Check className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#f58426]' : 'text-transparent'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamSelect;
