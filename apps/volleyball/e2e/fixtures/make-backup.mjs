import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const physical = {
  height: 170,
  shuttleRun: 10,
  flexibility: 20,
  fiftyMeterDash: 8,
  underhand: 5,
  serve: 5,
};

const emptyStat = {
  points: 0,
  serviceAces: 0,
  serviceFaults: 0,
  blockingPoints: 0,
  spikeSuccesses: 0,
  serveIn: 0,
  digs: 0,
  assists: 0,
};

function player(n, className) {
  return {
    id: `p${n}`,
    originalName: `학생${n}`,
    anonymousName: `학생${n}`,
    class: className,
    studentNumber: String(n),
    gender: n % 2 ? '남' : '여',
    stats: physical,
    isCaptain: false,
    totalScore: 0,
  };
}

function teamSet(id, className, teams) {
  const players = {};
  const saved = teams.map((team) => {
    const ids = team.nums.map((n) => {
      const p = player(n, className);
      players[p.id] = p;
      return p.id;
    });
    players[ids[0]].isCaptain = true;
    return {
      teamName: team.name,
      captainId: ids[0],
      playerIds: ids,
      color: team.color,
      slogan: '',
    };
  });
  return {
    id,
    className,
    savedAt: '2024-01-15T00:00:00.000Z',
    teams: saved,
    players,
    teamCount: teams.length,
  };
}

function side(set, teamName, score, won) {
  const team = set.teams.find((item) => item.teamName === teamName);
  const players = {};
  const playerStats = {};
  team.playerIds.forEach((id, index) => {
    players[id] = set.players[id];
    playerStats[id] = { ...emptyStat, points: index === 0 ? score : 0, spikeSuccesses: index === 0 ? score : 0 };
  });
  return {
    name: team.teamName,
    key: `${set.id}___${team.teamName}`,
    color: team.color,
    score,
    setsWon: won ? 1 : 0,
    timeouts: 0,
    fairPlay: 0,
    threeHitPlays: 0,
    serviceAces: 0,
    serviceFaults: 0,
    blockingPoints: 0,
    spikeSuccesses: score,
    players,
    playerStats,
    onCourtPlayerIds: team.playerIds,
    benchPlayerIds: [],
  };
}

function completedMatch(set, nameA, nameB, scoreA, scoreB, date, matchType) {
  return {
    teamA: side(set, nameA, scoreA, scoreA > scoreB),
    teamB: side(set, nameB, scoreB, scoreB > scoreA),
    servingTeam: null,
    currentSet: 1,
    maxSets: 1,
    isDeuce: false,
    gameOver: true,
    winner: scoreA >= scoreB ? 'A' : 'B',
    scoreHistory: [],
    eventHistory: [],
    scoreLocations: [],
    status: 'completed',
    timeout: null,
    date,
    time: 120,
    ...(matchType ? { matchType } : {}),
  };
}

const classSet = teamSet('set-class-1', '1반', [
  { name: '청팀', nums: [1, 2, 3, 4], color: '#3b82f6' },
  { name: '백팀', nums: [5, 6, 7, 8], color: '#ef4444' },
]);

const clubSet = teamSet('set-club-1', '연습조', [
  { name: '연습A', nums: [11, 12, 13, 14, 15, 16], color: '#f59e0b' },
  { name: '연습B', nums: [17, 18, 19, 20, 21, 22], color: '#8b5cf6' },
]);

const leakedTeamSet = teamSet('set-leaked', '1player_records_class_suffix', [
  { name: '키확인팀', nums: [31, 32], color: '#22c55e' },
]);

const backup = {
  settings: {
    winningScore: 3,
    includeBonusPointsInWinner: false,
    googleSheetUrl: '',
    tournamentTargetScore: 21,
    tournamentMaxSets: 3,
    volleyballRuleSystem: 6,
  },
  classTeamSets: [classSet],
  classMatchHistory: [completedMatch(classSet, '청팀', '백팀', 11, 7, '2024-01-15T09:00:00.000Z')],
  clubTeamSets: [clubSet],
  clubMatchHistory: [],
  clubPracticeMatchHistory: [completedMatch(clubSet, '연습A', '연습B', 15, 10, '2024-02-01T09:00:00.000Z', 'practice')],
  leakedTeamSet,
  jiveTeams: [{ id: 'jive-1', name: '학생41' }],
  jiveMatchHistory: [{ id: 'jive-m1', label: '학생41' }],
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'backup.json');
writeFileSync(out, `${JSON.stringify(backup, null, 2)}\n`);
console.log(out);
