import { PrismaClient, Team } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

interface PlayerCareer {
  player: string;
  player_id: string;
  pos: string;
  ht_in_in: string;
  wt: string;
  birth_date: string;
  colleges: string;
  from: string;
  to: string;
  debut: string;
  hof: string;
}

interface PlayerStats {
  player: string;
  player_id: string;
  season: string;
  age: string;
  tm: string;
  lg: string;
  pos: string;
  g: string;
  gs: string;
  mp: string;
  fg: string;
  fga: string;
  fg_pct: string;
  fg3: string;
  fg3a: string;
  fg3_pct: string;
  fg2: string;
  fg2a: string;
  fg2_pct: string;
  ft: string;
  fta: string;
  ft_pct: string;
  orb: string;
  drb: string;
  trb: string;
  ast: string;
  stl: string;
  blk: string;
  tov: string;
  pf: string;
  pts: string;
}

async function importPlayers() {
  console.log('🏀 Начинаем импорт игроков...');

  // Получаем все команды для маппинга
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  
  // Создаем маппинг названий команд
  teams.forEach(team => {
    teamMap.set(team.name, team.id);
    teamMap.set(team.name.replace(' ', ''), team.id);
    if (team.nickname) teamMap.set(team.nickname, team.id);
    
    // Маппинг для аббревиатур (часто используются в статистике)
    const abbrevMap: { [key: string]: string } = {
      'ATL': 'Atlanta Hawks',
      'BOS': 'Boston Celtics',
      'BRK': 'Brooklyn Nets',
      'CHA': 'Charlotte Hornets',
      'CHI': 'Chicago Bulls',
      'CLE': 'Cleveland Cavaliers',
      'DAL': 'Dallas Mavericks',
      'DEN': 'Denver Nuggets',
      'DET': 'Detroit Pistons',
      'GSW': 'Golden State Warriors',
      'HOU': 'Houston Rockets',
      'IND': 'Indiana Pacers',
      'LAC': 'LA Clippers',
      'LAL': 'Los Angeles Lakers',
      'MEM': 'Memphis Grizzlies',
      'MIA': 'Miami Heat',
      'MIL': 'Milwaukee Bucks',
      'MIN': 'Minnesota Timberwolves',
      'NOP': 'New Orleans Pelicans',
      'NYK': 'New York Knicks',
      'OKC': 'Oklahoma City Thunder',
      'ORL': 'Orlando Magic',
      'PHI': 'Philadelphia 76ers',
      'PHX': 'Phoenix Suns',
      'POR': 'Portland Trail Blazers',
      'SAC': 'Sacramento Kings',
      'SAS': 'San Antonio Spurs',
      'TOR': 'Toronto Raptors',
      'UTA': 'Utah Jazz',
      'WAS': 'Washington Wizards'
    };
    
    const teamName = abbrevMap[team.name];
    if (teamName) {
      teamMap.set(team.name, team.id);
    }
  });

  // Загружаем основную информацию об игроках
  const players: PlayerCareer[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../data/Player Career Info.csv'))
      .pipe(csv())
      .on('data', (data: any) => players.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Найдено ${players.length} игроков`);

  // Создаем игроков в БД
  let playerCount = 0;
  const playerMap = new Map(); // player_id -> наш ID

  for (const p of players) {
    try {
      const nameParts = p.player.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Парсим рост (дюймы -> см)
      let height = null;
      if (p.ht_in_in) {
        height = Math.round(parseInt(p.ht_in_in) * 2.54);
      }

      // Парсим вес (фунты -> кг)
      let weight = null;
      if (p.wt) {
        weight = Math.round(parseInt(p.wt) * 0.453592);
      }

      const player = await prisma.player.create({
        data: {
          firstName,
          lastName,
          fullName: p.player,
          birthDate: p.birth_date ? new Date(p.birth_date) : null,
          height,
          weight,
          position: p.pos || 'Unknown',
          isActive: parseInt(p.to) >= 2024,
          teamId: 1, // временно, потом обновим из статистики
        }
      });

      playerMap.set(p.player_id, player.id);
      playerCount++;
      
      if (playerCount % 100 === 0) {
        console.log(`✅ Импортировано ${playerCount} игроков...`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при импорте игрока ${p.player}:`, error);
    }
  }

  console.log(`✅ Импортировано всего: ${playerCount} игроков`);

  // Теперь импортируем статистику игроков по сезонам
  console.log('\n📊 Начинаем импорт статистики игроков...');
  
  const playerStats: PlayerStats[] = [];
  
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../data/Player Per Game.csv'))
      .pipe(csv())
      .on('data', (data: any) => playerStats.push(data))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log(`📋 Найдено ${playerStats.length} записей статистики`);

  let statsCount = 0;
  let skippedStats = 0;
  const teamUpdateCount = new Map();

  for (const stat of playerStats) {
    try {
      const playerId = playerMap.get(stat.player_id);
      if (!playerId) {
        skippedStats++;
        continue;
      }

      const teamName = stat.tm;
      let teamId = teamMap.get(teamName);
      
      // Пробуем найти команду по разным вариантам названия
      if (!teamId) {
        for (const team of teams) {
          if (team.name.includes(teamName) || 
              team.nickname === teamName ||
              team.name === teamName) {
            teamId = team.id;
            break;
          }
        }
      }

      // Обновляем команду игрока (последняя известная)
      if (teamId && !teamUpdateCount.has(playerId)) {
        await prisma.player.update({
          where: { id: playerId },
          data: { teamId }
        });
        teamUpdateCount.set(playerId, true);
      }

      // Рассчитываем средние показатели
      const games = parseInt(stat.g) || 0;
      const points = parseFloat(stat.pts) || 0;
      const rebounds = parseFloat(stat.trb) || 0;
      const assists = parseFloat(stat.ast) || 0;
      const steals = parseFloat(stat.stl) || 0;
      const blocks = parseFloat(stat.blk) || 0;
      const minutes = parseFloat(stat.mp) || 0;
      
      const fg = parseFloat(stat.fg) || 0;
      const fga = parseFloat(stat.fga) || 0;
      const fgPct = fga > 0 ? (fg / fga) * 100 : 0;
      
      const fg3 = parseFloat(stat.fg3) || 0;
      const fg3a = parseFloat(stat.fg3a) || 0;
      const fg3Pct = fg3a > 0 ? (fg3 / fg3a) * 100 : 0;
      
      const ft = parseFloat(stat.ft) || 0;
      const fta = parseFloat(stat.fta) || 0;
      const ftPct = fta > 0 ? (ft / fta) * 100 : 0;

      // Обновляем статистику игрока (берем лучшие показатели за карьеру)
      const currentPlayer = await prisma.player.findUnique({
        where: { id: playerId }
      });

      if (currentPlayer) {
        await prisma.player.update({
          where: { id: playerId },
          data: {
            pointsPerGame: Math.max(currentPlayer.pointsPerGame || 0, points),
            reboundsPerGame: Math.max(currentPlayer.reboundsPerGame || 0, rebounds),
            assistsPerGame: Math.max(currentPlayer.assistsPerGame || 0, assists),
            stealsPerGame: Math.max(currentPlayer.stealsPerGame || 0, steals),
            blocksPerGame: Math.max(currentPlayer.blocksPerGame || 0, blocks),
            minutesPerGame: Math.max(currentPlayer.minutesPerGame || 0, minutes),
            fgPercentage: Math.max(currentPlayer.fgPercentage || 0, fgPct),
            threePercentage: Math.max(currentPlayer.threePercentage || 0, fg3Pct),
            ftPercentage: Math.max(currentPlayer.ftPercentage || 0, ftPct),
          }
        });
      }

      statsCount++;
      
      if (statsCount % 5000 === 0) {
        console.log(`✅ Обработано ${statsCount} записей статистики...`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при импорте статистики:`, error);
    }
  }

  console.log(`✅ Импортировано статистики: ${statsCount} записей`);
  console.log(`⏭️ Пропущено: ${skippedStats} (игроки не найдены в БД)`);
  console.log(`🏢 Обновлено команд для игроков: ${teamUpdateCount.size}`);
}

async function main() {
  try {
    await importPlayers();
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();