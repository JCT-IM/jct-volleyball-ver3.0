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

/** 현재 허슬 지정 ID. 사후 입력도 종료 직후 선정과 같은 필드를 읽는다. 일반 경기 값도 지우지 않고 그대로 돌려준다. */
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
 * 랭킹 노력 횟수와 채점 노력 지수에 넣는 허슬.
 * 수행평가 경기의 지정만 센다. 일반 경기에 남아 있는 값은 집계에서 빠지고 기록은 유지된다.
 */
export const collectAssessmentHustlePlayerIds = (match: {
    isAssessment?: boolean;
    hustlePlayerIds?: string[];
    hustlePlayers?: { id: string }[];
}): string[] => {
    if (match.isAssessment !== true) return [];
    return collectHustlePlayerIds(match);
};

/** 수정 창을 열 때 미리 체크할 ID. 명단에 없는 기존 선택도 포함한다. */
export const initialHustleSelection = (match: HustleMatchLike): string[] => {
    const allowed = new Set(listParticipatingPlayers(match).map(player => player.id));
    const seen = new Set<string>();
    const selected: string[] = [];
    collectHustlePlayerIds(match).forEach(id => {
        if (!allowed.has(id) || seen.has(id)) return;
        seen.add(id);
        selected.push(id);
    });
    return selected;
};

export const HUSTLE_CLEAR_NOTICE = '허슬 지정이 해제됩니다';

/**
 * 종료 직후 허슬 선택과 같은 후보.
 * 양 팀 players 전체를 쓰고, 코트와 벤치 배열은 거르지 않는다.
 * players에 없는 기존 허슬 선택은 저장된 이름과 팀으로 뒤에 붙인다.
 */
export const listParticipatingPlayers = (match: {
    teamA: SideRoster;
    teamB: SideRoster;
    hustlePlayerIds?: string[];
    hustlePlayers?: HustlePlayerRef[];
}): ParticipatingPlayer[] => {
    const fromSide = (side: 'A' | 'B'): ParticipatingPlayer[] => {
        const team = side === 'A' ? match.teamA : match.teamB;
        return Object.values(team.players ?? {}).flatMap(player => {
            if (!player?.id) return [];
            return [{
                id: player.id,
                name: player.originalName,
                team: side,
                studentNumber: player.studentNumber,
            }];
        });
    };
    const roster = [...fromSide('A'), ...fromSide('B')];
    const known = new Set(roster.map(player => player.id));
    const saved = new Map((match.hustlePlayers ?? []).map(player => [player.id, player]));
    const extras = collectHustlePlayerIds(match).flatMap(id => {
        if (known.has(id)) return [];
        known.add(id);
        const ref = saved.get(id);
        return [{
            id,
            name: ref?.name || '선수',
            team: ref?.team === 'B' ? 'B' as const : 'A' as const,
        }];
    });
    return [...roster, ...extras];
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
 * 허슬 플레이어를 여러 명 사후 지정한다. 빈 배열이면 현재 지정을 모두 해제한다.
 * 현재 값은 덮어쓰고, 이전 값은 hustleHistory에 남긴다.
 * 한 명이라도 고르면 일반 경기도 수행평가로 바꾼다.
 * revertToRegular는 수행평가를 일반으로 되돌릴 때만 이력을 추가하고, 그때 허슬 선택은 모두 해제한다.
 * 양 팀 명단과 기존 허슬 선택에 없는 ID가 있으면 null.
 */
export const applyRetroactiveHustle = <T extends HustleMatchLike>(
    match: T,
    playerIds: string[],
    options: { markAsAssessment?: boolean; revertToRegular?: boolean; now?: string },
): T | null => {
    const candidates = listParticipatingPlayers(match);
    const byId = new Map(candidates.map(player => [player.id, player]));
    const reverting = options.revertToRegular === true && match.isAssessment === true;
    const requested = [...new Set(playerIds.filter(Boolean))];
    if (!reverting && requested.some(id => !byId.has(id))) return null;
    const picked = reverting ? [] : requested.map(id => byId.get(id)!);

    const now = options.now ?? new Date().toISOString();
    const prevIds = collectHustlePlayerIds(match);
    const prevPlayers = match.hustlePlayers ?? [];
    const hadPrevious = prevIds.length > 0 || prevPlayers.length > 0;
    const history = [...(match.hustleHistory ?? [])];
    if (hadPrevious) {
        history.unshift({
            at: match.hustleUpdatedAt ?? match.date ?? now,
            source: match.hustleRetroactive ? 'retroactive' : 'live',
            playerIds: [...prevIds],
            players: snapshotPlayers(prevIds, prevPlayers, candidates),
        });
    }

    const next: T = {
        ...match,
        hustlePlayerIds: picked.map(player => player.id),
        hustlePlayers: picked.map(player => ({ id: player.id, name: player.name, team: player.team })),
        hustleRetroactive: true,
        hustleUpdatedAt: now,
        hustleHistory: history,
    };

    if (reverting) {
        next.isAssessment = false;
        next.assessmentFlagHistory = [
            { at: now, from: true, to: false },
            ...(match.assessmentFlagHistory ?? []),
        ];
    } else if ((options.markAsAssessment || picked.length > 0) && match.isAssessment !== true) {
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
