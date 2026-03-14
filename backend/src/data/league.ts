export type ConferenceName = 'Eastern' | 'Western';

export type DivisionName =
  | 'Atlantic'
  | 'Central'
  | 'Southeast'
  | 'Northwest'
  | 'Pacific'
  | 'Southwest';

export interface TeamCatalogEntry {
  abbrev: string;
  name: string;
  city: string;
  nickname: string;
  conference: ConferenceName;
  division: DivisionName;
  arena: string;
  foundedYear: number;
}

export const CONFERENCES = [
  { name: 'Eastern' as const, shortName: 'East' },
  { name: 'Western' as const, shortName: 'West' },
];

export const DIVISIONS: Array<{ name: DivisionName; conference: ConferenceName }> = [
  { name: 'Atlantic', conference: 'Eastern' },
  { name: 'Central', conference: 'Eastern' },
  { name: 'Southeast', conference: 'Eastern' },
  { name: 'Northwest', conference: 'Western' },
  { name: 'Pacific', conference: 'Western' },
  { name: 'Southwest', conference: 'Western' },
];

export const TEAM_CATALOG: TeamCatalogEntry[] = [
  { abbrev: 'ATL', name: 'Atlanta Hawks', city: 'Atlanta', nickname: 'Hawks', conference: 'Eastern', division: 'Southeast', arena: 'State Farm Arena', foundedYear: 1949 },
  { abbrev: 'BOS', name: 'Boston Celtics', city: 'Boston', nickname: 'Celtics', conference: 'Eastern', division: 'Atlantic', arena: 'TD Garden', foundedYear: 1946 },
  { abbrev: 'BRK', name: 'Brooklyn Nets', city: 'Brooklyn', nickname: 'Nets', conference: 'Eastern', division: 'Atlantic', arena: 'Barclays Center', foundedYear: 1967 },
  { abbrev: 'CHA', name: 'Charlotte Hornets', city: 'Charlotte', nickname: 'Hornets', conference: 'Eastern', division: 'Southeast', arena: 'Spectrum Center', foundedYear: 1988 },
  { abbrev: 'CHI', name: 'Chicago Bulls', city: 'Chicago', nickname: 'Bulls', conference: 'Eastern', division: 'Central', arena: 'United Center', foundedYear: 1966 },
  { abbrev: 'CLE', name: 'Cleveland Cavaliers', city: 'Cleveland', nickname: 'Cavaliers', conference: 'Eastern', division: 'Central', arena: 'Rocket Arena', foundedYear: 1970 },
  { abbrev: 'DAL', name: 'Dallas Mavericks', city: 'Dallas', nickname: 'Mavericks', conference: 'Western', division: 'Southwest', arena: 'American Airlines Center', foundedYear: 1980 },
  { abbrev: 'DEN', name: 'Denver Nuggets', city: 'Denver', nickname: 'Nuggets', conference: 'Western', division: 'Northwest', arena: 'Ball Arena', foundedYear: 1967 },
  { abbrev: 'DET', name: 'Detroit Pistons', city: 'Detroit', nickname: 'Pistons', conference: 'Eastern', division: 'Central', arena: 'Little Caesars Arena', foundedYear: 1941 },
  { abbrev: 'GSW', name: 'Golden State Warriors', city: 'San Francisco', nickname: 'Warriors', conference: 'Western', division: 'Pacific', arena: 'Chase Center', foundedYear: 1946 },
  { abbrev: 'HOU', name: 'Houston Rockets', city: 'Houston', nickname: 'Rockets', conference: 'Western', division: 'Southwest', arena: 'Toyota Center', foundedYear: 1967 },
  { abbrev: 'IND', name: 'Indiana Pacers', city: 'Indianapolis', nickname: 'Pacers', conference: 'Eastern', division: 'Central', arena: 'Gainbridge Fieldhouse', foundedYear: 1967 },
  { abbrev: 'LAC', name: 'LA Clippers', city: 'Los Angeles', nickname: 'Clippers', conference: 'Western', division: 'Pacific', arena: 'Intuit Dome', foundedYear: 1970 },
  { abbrev: 'LAL', name: 'Los Angeles Lakers', city: 'Los Angeles', nickname: 'Lakers', conference: 'Western', division: 'Pacific', arena: 'Crypto.com Arena', foundedYear: 1947 },
  { abbrev: 'MEM', name: 'Memphis Grizzlies', city: 'Memphis', nickname: 'Grizzlies', conference: 'Western', division: 'Southwest', arena: 'FedExForum', foundedYear: 1995 },
  { abbrev: 'MIA', name: 'Miami Heat', city: 'Miami', nickname: 'Heat', conference: 'Eastern', division: 'Southeast', arena: 'Kaseya Center', foundedYear: 1988 },
  { abbrev: 'MIL', name: 'Milwaukee Bucks', city: 'Milwaukee', nickname: 'Bucks', conference: 'Eastern', division: 'Central', arena: 'Fiserv Forum', foundedYear: 1968 },
  { abbrev: 'MIN', name: 'Minnesota Timberwolves', city: 'Minneapolis', nickname: 'Timberwolves', conference: 'Western', division: 'Northwest', arena: 'Target Center', foundedYear: 1989 },
  { abbrev: 'NOP', name: 'New Orleans Pelicans', city: 'New Orleans', nickname: 'Pelicans', conference: 'Western', division: 'Southwest', arena: 'Smoothie King Center', foundedYear: 2002 },
  { abbrev: 'NYK', name: 'New York Knicks', city: 'New York', nickname: 'Knicks', conference: 'Eastern', division: 'Atlantic', arena: 'Madison Square Garden', foundedYear: 1946 },
  { abbrev: 'OKC', name: 'Oklahoma City Thunder', city: 'Oklahoma City', nickname: 'Thunder', conference: 'Western', division: 'Northwest', arena: 'Paycom Center', foundedYear: 1967 },
  { abbrev: 'ORL', name: 'Orlando Magic', city: 'Orlando', nickname: 'Magic', conference: 'Eastern', division: 'Southeast', arena: 'Kia Center', foundedYear: 1989 },
  { abbrev: 'PHI', name: 'Philadelphia 76ers', city: 'Philadelphia', nickname: '76ers', conference: 'Eastern', division: 'Atlantic', arena: 'Wells Fargo Center', foundedYear: 1946 },
  { abbrev: 'PHX', name: 'Phoenix Suns', city: 'Phoenix', nickname: 'Suns', conference: 'Western', division: 'Pacific', arena: 'Footprint Center', foundedYear: 1968 },
  { abbrev: 'POR', name: 'Portland Trail Blazers', city: 'Portland', nickname: 'Trail Blazers', conference: 'Western', division: 'Northwest', arena: 'Moda Center', foundedYear: 1970 },
  { abbrev: 'SAC', name: 'Sacramento Kings', city: 'Sacramento', nickname: 'Kings', conference: 'Western', division: 'Pacific', arena: 'Golden 1 Center', foundedYear: 1945 },
  { abbrev: 'SAS', name: 'San Antonio Spurs', city: 'San Antonio', nickname: 'Spurs', conference: 'Western', division: 'Southwest', arena: 'Frost Bank Center', foundedYear: 1967 },
  { abbrev: 'TOR', name: 'Toronto Raptors', city: 'Toronto', nickname: 'Raptors', conference: 'Eastern', division: 'Atlantic', arena: 'Scotiabank Arena', foundedYear: 1995 },
  { abbrev: 'UTA', name: 'Utah Jazz', city: 'Salt Lake City', nickname: 'Jazz', conference: 'Western', division: 'Northwest', arena: 'Delta Center', foundedYear: 1974 },
  { abbrev: 'WAS', name: 'Washington Wizards', city: 'Washington', nickname: 'Wizards', conference: 'Eastern', division: 'Southeast', arena: 'Capital One Arena', foundedYear: 1961 },
];
