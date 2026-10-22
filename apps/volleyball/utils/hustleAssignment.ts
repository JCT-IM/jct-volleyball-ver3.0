import type { AssessmentFlagRevision, HustlePlayerRef, HustleRevision } from '../types';

type RosterPlayer = { id: string; originalName: string; studentNumber?: string };

type SideRoster = {
    name?: string;
    players?: Record<string, RosterPlayer>;
    onCourtPlayerIds?: string[];
    benchPlayerIds?: string[];
};

export type HustleMatchLike = {
    teamA: SideRoster;
    teamB: SideRoster;
    isAssessment?: boolean;
    hustlePlayerIds?: string[];
    hustlePlayers?: HustlePlayerRef[];
    hustleRetroactive?: boolean;
    hustleUpdatedAt?: string;
    hustleHistory?: HustleRevision[];
    assessmentFlagHistory?: AssessmentFlagRevision[];
    date?: string;
};

export type ParticipatingPlayer = {
    id: string;
    name: string;
    team: 'A' | 'B';
    studentNumber?: string;
};

/** 현재 허슬 지정 ID. 사후 입력도 종료 직후 선정과 같은 필드를 읽는다. */
export const collectHustlePlayerIds = (match: {
    hustlePlayerIds?: string[];
    hustlePlayers?: { id: string }[];
}): string[] => {
    if (match.hustlePlayerIds && match.hustlePlayerIds.length > 0) {
        return match.hustlePlayerIds.filter(Boolean);
    }
    return (match.hustlePlayers ?? []).map(player => player.id).filter(Boolean);
};

/**
 * 그 경기에 실제로 나간 출전 선수.
 * 코트와 벤치를 합친다. 둘 다 비어 있는 옛 기록만 경기 로스터(players)로 되돌린다.
 */
export const listParticipatingPlayers = (match: { teamA: SideRoster; teamB: SideRoster }): ParticipatingPlayer[] => {
    const fromSide = (side: 'A' | 'B'): ParticipatingPlayer[] => {
        const team = side === 'A' ? match.teamA : match.teamB;
        const players = team.players ?? {};
        const designated = [...(team.onCourtPlayerIds ?? []), ...(team.benchPlayerIds ?? [])];
        const ids = designated.length > 0 ? [...new Set(designated)] : Object.keys(players);
        return ids.flatMap(id => {
            const player = players[id];
            if (!player) return [];
            return [{
                id: player.id,
                name: player.originalName,
                team: side,
                studentNumber: player.studentNumber,
            }];
        });
    };
    return [...fromSide('A'), ...fromSide('B')];
};

const snapshotPlayers = (
    ids: string[],
    players: HustlePlayerRef[],
    candidates: ParticipatingPlayer[],
): HustlePlayerRef[] => {
    if (players.length > 0) {
        return players.map(player => ({ id: player.id, name: player.name, team: player.team }));
    }
    return ids.map(id => {
        const found = candidates.find(player => player.id === id);
        return { id, name: found?.name ?? '선수', team: found?.team ?? 'A' };
    });
};

/**
 * 허슬 플레이어 1명을 사후 지정한다.
 * 현재 값은 덮어쓰고, 이전 값은 hustleHistory에 남긴다.
 * markAsAssessment는 일반 경기를 수행평가로 바꿀 때만 이력을 추가한다.
 * 출전 선수가 아니면 null.
 */
export const applyRetroactiveHustle = <T extends HustleMatchLike>(
    match: T,
    playerId: string,
    options: { markAsAssessment: boolean; now?: string },
): T | null => {
    const candidates = listParticipatingPlayers(match);
    const picked = candidates.find(player => player.id === playerId);
    if (!picked) return null;

    const now = options.now ?? new Date().toISOString();
    const prevIds = match.hustlePlayerIds ?? [];
    const prevPlayers = match.hustlePlayers ?? [];
    const hadPrevious = prevIds.length > 0 || prevPlayers.length > 0;
    const history = [...(match.hustleHistory ?? [])];
    if (hadPrevious) {
        const playerIds = prevIds.length > 0 ? [...prevIds] : prevPlayers.map(player => player.id);
        history.unshift({
            at: match.hustleUpdatedAt ?? match.date ?? now,
            source: match.hustleRetroactive ? 'retroactive' : 'live',
            playerIds,
            players: snapshotPlayers(playerIds, prevPlayers, candidates),
        });
    }

    const next: T = {
        ...match,
        hustlePlayerIds: [picked.id],
        hustlePlayers: [{ id: picked.id, name: picked.name, team: picked.team }],
        hustleRetroactive: true,
        hustleUpdatedAt: now,
        hustleHistory: history,
    };

    if (options.markAsAssessment && match.isAssessment !== true) {
        next.isAssessment = true;
        next.assessmentFlagHistory = [
            { at: now, from: false, to: true },
            ...(match.assessmentFlagHistory ?? []),
        ];
    }

    return next;
};

export const formatHustleTimestamp = (iso: string | undefined): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('ko-KR');
};
