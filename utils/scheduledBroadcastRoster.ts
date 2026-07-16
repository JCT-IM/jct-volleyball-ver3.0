import { Player, PlayerStats, SavedTeamInfo, ScheduledRosterPlayer, Stats, TeamMatchState } from '../types';

const emptyStats = (): Stats => ({
    height: 0,
    shuttleRun: 0,
    flexibility: 0,
    fiftyMeterDash: 0,
    underhand: 0,
    serve: 0,
});

export const emptyPlayerStats = (): PlayerStats => ({
    points: 0,
    serviceAces: 0,
    serviceFaults: 0,
    blockingPoints: 0,
    spikeSuccesses: 0,
    directSuccesses: 0,
    serveIn: 0,
    digs: 0,
    assists: 0,
});

export function createPlayerFromRosterEntry(entry: ScheduledRosterPlayer, index: number, idPrefix: string): Player {
    const id = entry.id?.trim() || `${idPrefix}-${index}-${Math.random().toString(36).slice(2, 8)}`;
    const name = (entry.name || `선수${index + 1}`).trim();
    return {
        id,
        originalName: name,
        anonymousName: name,
        class: '',
        studentNumber: (entry.number || String(index + 1)).trim(),
        gender: '',
        stats: emptyStats(),
        isCaptain: false,
        totalScore: 0,
    };
}

export function rosterToPlayersRecord(roster: ScheduledRosterPlayer[] | undefined, idPrefix: string): Record<string, Player> {
    const list = roster ?? [];
    return list.reduce((acc, entry, i) => {
        const p = createPlayerFromRosterEntry(entry, i, idPrefix);
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, Player>);
}

export function playersRecordToRoster(players: Record<string, Player>): ScheduledRosterPlayer[] {
    return Object.values(players).map(p => ({
        id: p.id,
        name: p.originalName,
        number: p.studentNumber,
    }));
}

export function buildSavedTeamInfo(teamName: string, players: Record<string, Player>): SavedTeamInfo {
    const ids = Object.keys(players);
    return {
        teamName,
        captainId: ids[0] ?? '',
        playerIds: ids,
    };
}

export function buildTeamMatchPartial(
    teamName: string,
    players: Record<string, Player>
): Pick<TeamMatchState, 'name' | 'players' | 'playerStats' | 'onCourtPlayerIds' | 'benchPlayerIds'> {
    const ids = Object.keys(players);
    const playerStats = ids.reduce((acc, id) => {
        acc[id] = emptyPlayerStats();
        return acc;
    }, {} as Record<string, PlayerStats>);
    return {
        name: teamName,
        players,
        playerStats,
        onCourtPlayerIds: ids,
        benchPlayerIds: [],
    };
}

/** 줄바꿈/쉼표로 구분된 이름 목록 → 로스터 */
export function parseNamesToRoster(raw: string): ScheduledRosterPlayer[] {
    return raw
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(Boolean)
        .map((name, i) => ({ name, number: String(i + 1) }));
}

/** 우리/상대 팀 이름 → 매치업 설명 (`{홈} VS {어웨이}`) */
export function buildMatchupDescription(homeTeamName?: string, awayTeamName?: string): string {
    const home = homeTeamName?.trim() || '우리팀 미정';
    const away = awayTeamName?.trim() || '상대팀 미정';
    return `${home} VS ${away}`;
}
