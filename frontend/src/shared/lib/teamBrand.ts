export interface TeamBrand {
  name: string;
  teamId: string;
  brandColor: string;
  accentColor: string;
  neutralColor: string;
  logoUrl: string;
}

const FALLBACK_BRAND: TeamBrand = {
  name: 'NBA',
  teamId: 'league',
  brandColor: '#c96a2b',
  accentColor: '#607d96',
  neutralColor: '#f5efe4',
  logoUrl: 'https://www.nba.com/assets/logos/teams/primary/web/NBA.svg',
};

const TEAM_BRANDS: Record<string, TeamBrand> = {
  ATL: { name: 'Atlanta Hawks', teamId: '1610612737', brandColor: '#e03a3e', accentColor: '#c1d32f', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612737/global/L/logo.svg' },
  BOS: { name: 'Boston Celtics', teamId: '1610612738', brandColor: '#007a33', accentColor: '#ba9653', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg' },
  BRK: { name: 'Brooklyn Nets', teamId: '1610612751', brandColor: '#0a0a0a', accentColor: '#bfc0c2', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612751/global/L/logo.svg' },
  CHA: { name: 'Charlotte Hornets', teamId: '1610612766', brandColor: '#1d1160', accentColor: '#00788c', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612766/global/L/logo.svg' },
  CHI: { name: 'Chicago Bulls', teamId: '1610612741', brandColor: '#ce1141', accentColor: '#0f0f10', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612741/global/L/logo.svg' },
  CLE: { name: 'Cleveland Cavaliers', teamId: '1610612739', brandColor: '#860038', accentColor: '#fdbb30', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612739/global/L/logo.svg' },
  DAL: { name: 'Dallas Mavericks', teamId: '1610612742', brandColor: '#00538c', accentColor: '#b8c4ca', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612742/global/L/logo.svg' },
  DEN: { name: 'Denver Nuggets', teamId: '1610612743', brandColor: '#0e2240', accentColor: '#fec524', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612743/global/L/logo.svg' },
  DET: { name: 'Detroit Pistons', teamId: '1610612765', brandColor: '#c8102e', accentColor: '#1d42ba', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612765/global/L/logo.svg' },
  GSW: { name: 'Golden State Warriors', teamId: '1610612744', brandColor: '#1d428a', accentColor: '#ffc72c', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg' },
  HOU: { name: 'Houston Rockets', teamId: '1610612745', brandColor: '#ce1141', accentColor: '#c4ced4', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612745/global/L/logo.svg' },
  IND: { name: 'Indiana Pacers', teamId: '1610612754', brandColor: '#002d62', accentColor: '#fdbb30', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612754/global/L/logo.svg' },
  LAC: { name: 'LA Clippers', teamId: '1610612746', brandColor: '#c8102e', accentColor: '#1d428a', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612746/global/L/logo.svg' },
  LAL: { name: 'Los Angeles Lakers', teamId: '1610612747', brandColor: '#552583', accentColor: '#fdb927', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg' },
  MEM: { name: 'Memphis Grizzlies', teamId: '1610612763', brandColor: '#5d76a9', accentColor: '#f5b112', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612763/global/L/logo.svg' },
  MIA: { name: 'Miami Heat', teamId: '1610612748', brandColor: '#98002e', accentColor: '#f9a01b', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612748/global/L/logo.svg' },
  MIL: { name: 'Milwaukee Bucks', teamId: '1610612749', brandColor: '#00471b', accentColor: '#eee1c6', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612749/global/L/logo.svg' },
  MIN: { name: 'Minnesota Timberwolves', teamId: '1610612750', brandColor: '#0c2340', accentColor: '#78be20', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612750/global/L/logo.svg' },
  NOP: { name: 'New Orleans Pelicans', teamId: '1610612740', brandColor: '#0c2340', accentColor: '#c8102e', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612740/global/L/logo.svg' },
  NYK: { name: 'New York Knicks', teamId: '1610612752', brandColor: '#006bb6', accentColor: '#f58426', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg' },
  OKC: { name: 'Oklahoma City Thunder', teamId: '1610612760', brandColor: '#007ac1', accentColor: '#ef3b24', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612760/global/L/logo.svg' },
  ORL: { name: 'Orlando Magic', teamId: '1610612753', brandColor: '#0077c0', accentColor: '#c4ced4', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612753/global/L/logo.svg' },
  PHI: { name: 'Philadelphia 76ers', teamId: '1610612755', brandColor: '#006bb6', accentColor: '#ed174c', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612755/global/L/logo.svg' },
  PHX: { name: 'Phoenix Suns', teamId: '1610612756', brandColor: '#1d1160', accentColor: '#e56020', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612756/global/L/logo.svg' },
  POR: { name: 'Portland Trail Blazers', teamId: '1610612757', brandColor: '#e03a3e', accentColor: '#2d2d2d', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612757/global/L/logo.svg' },
  SAC: { name: 'Sacramento Kings', teamId: '1610612758', brandColor: '#5a2d81', accentColor: '#c4ced4', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612758/global/L/logo.svg' },
  SAS: { name: 'San Antonio Spurs', teamId: '1610612759', brandColor: '#c4ced4', accentColor: '#8a8d8f', neutralColor: '#0f0f10', logoUrl: 'https://cdn.nba.com/logos/nba/1610612759/global/L/logo.svg' },
  TOR: { name: 'Toronto Raptors', teamId: '1610612761', brandColor: '#ce1141', accentColor: '#a1a1a4', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612761/global/L/logo.svg' },
  UTA: { name: 'Utah Jazz', teamId: '1610612762', brandColor: '#002b5c', accentColor: '#f9a01b', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612762/global/L/logo.svg' },
  WAS: { name: 'Washington Wizards', teamId: '1610612764', brandColor: '#002b5c', accentColor: '#e31837', neutralColor: '#ffffff', logoUrl: 'https://cdn.nba.com/logos/nba/1610612764/global/L/logo.svg' },
};

function normalizeLookupValue(value?: string | null) {
  return value?.trim().toUpperCase().replace(/\s+/g, ' ') || '';
}

function getCodeFromName(name?: string | null) {
  const normalizedName = normalizeLookupValue(name);
  const match = Object.entries(TEAM_BRANDS).find(([, brand]) => normalizeLookupValue(brand.name) === normalizedName);
  return match?.[0];
}

export function getTeamBrand(input?: { abbrev?: string | null; name?: string | null } | string | null): TeamBrand {
  if (!input) {
    return FALLBACK_BRAND;
  }

  if (typeof input === 'string') {
    const key = normalizeLookupValue(input);
    return TEAM_BRANDS[key] || FALLBACK_BRAND;
  }

  const byCode = normalizeLookupValue(input.abbrev);
  if (TEAM_BRANDS[byCode]) {
    return TEAM_BRANDS[byCode];
  }

  const byName = getCodeFromName(input.name);
  return (byName && TEAM_BRANDS[byName]) || FALLBACK_BRAND;
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const safeHex = expanded.padEnd(6, '0').slice(0, 6);
  const r = Number.parseInt(safeHex.slice(0, 2), 16);
  const g = Number.parseInt(safeHex.slice(2, 4), 16);
  const b = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
