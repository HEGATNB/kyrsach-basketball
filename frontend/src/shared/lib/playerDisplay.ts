import type { Player } from '@/shared/api/client';
import { getTeamBrand } from './teamBrand';

export function formatPlayerName(player: Pick<Player, 'first_name' | 'last_name'>) {
  return `${player.first_name} ${player.last_name}`.trim();
}

export function getPlayerImageUrl(player: Pick<Player, 'first_name' | 'last_name' | 'image_url'>) {
  if (player.image_url) {
    return player.image_url;
  }

  const firstName = player.first_name?.toLowerCase().replace(/[^a-z]/g, '') || '';
  const lastName = player.last_name?.toLowerCase().replace(/[^a-z]/g, '') || '';
  const lastNamePart = lastName.slice(0, 5);
  const firstNamePart = firstName.slice(0, 2);

  return `https://www.basketball-reference.com/req/202503171/images/players/${lastNamePart}${firstNamePart}01.jpg`;
}

export function getPlayerFallbackImage(player: Pick<Player, 'team' | 'team_abbrev'>) {
  if (player.team?.logoUrl) {
    return player.team.logoUrl;
  }

  return getTeamBrand({ abbrev: player.team?.abbrev || player.team_abbrev, name: player.team?.name }).logoUrl;
}

export function formatPlayerWeight(weight?: number) {
  return weight ? `${Math.round(weight)} kg` : 'N/A';
}

export function formatPlayerPercent(value?: number, digits = 1) {
  return typeof value === 'number' ? `${(value * 100).toFixed(digits)}%` : 'N/A';
}

export function formatPlayerDraft(player: Pick<Player, 'draft_year' | 'draft_round' | 'draft_number'>) {
  if (player.draft_year && player.draft_round && player.draft_number) {
    return `R${player.draft_round} / #${player.draft_number} • ${player.draft_year}`;
  }

  if (player.draft_year) {
    return player.draft_year;
  }

  return 'Undrafted / N.A.';
}

export function formatPlayerMinutes(value?: number) {
  return typeof value === 'number' ? value.toFixed(1) : 'N/A';
}

export function formatPlayerGames(value?: number) {
  return typeof value === 'number' ? String(value) : 'N/A';
}
