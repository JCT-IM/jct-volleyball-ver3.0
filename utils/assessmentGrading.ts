/**
 * 수행평가 채점 계산.
 * 경기 기록의 winner, 클래스 랭킹 보드, 허슬 집계는 바꾸지 않고
 * 여기서 읽은 숫자로만 점수를 만든다.
 *
 * 우수/노력 지수는 screens/AssessmentRankingScreen.tsx 와 같은 식이다.
 * 우수 = 득점×1 + 에이스×1 + 스파이크×1 + 블로킹×1
 * 노력 = 노력상×2 + 디그×1 + 서브 인×0.5 + 어시스트×0.5
 * 채점만 지수 배율을 곱한 뒤 둘 중 높은 쪽에 개인 평가 구간을 적용한다.
 */

export type RatioBasis = 'rally' | 'sum';
export type IndexScope = 'cumulative' | 'assessment';
export type GradeField = 'portfolio' | 'team' | 'individual' | 'role' | 'roleCount';
export type PersonalSource = 'excellence' | 'effort' | 'tie' | 'absent';

export interface ScoreBand {
    minInclusive: number;
    score: number;
}

export interface RankPoint {
    rank: number;
    score: number;
}

export interface AssessmentGradingConfig {
    rankPoints: RankPoint[];
    teamPartialScore: number;
    teamAbsentScore: number;
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    ratioBasis: RatioBasis;
    indexScope: IndexScope;
    indexScale: number;
    individualBands: ScoreBand[];
    individualFallbackScore: number;
    individualAbsentScore: number;
    roleBands: ScoreBand[];
    portfolioOptions: number[];
    expectedTeamMatchCount: number;
}

export interface GradeEdit {
    field: GradeField;
    from: number | null;
    to: number | null;
    at: string;
}

export interface GradeLockMap {
    portfolio?: number | null;
    team?: number | null;
    individual?: number | null;
    role?: number | null;
    roleCount?: number | null;
}

export interface StudentGradeEdits {
    locks: GradeLockMap;
    history: GradeEdit[];
}

export interface ClassGradebook {
    setId: string;
    config: AssessmentGradingConfig;
    inclusion: Record<string, boolean>;
    students: Record<string, StudentGradeEdits>;
}

export interface AssessmentGradeBackup {
    version: 1;
    exportedAt: string;
    books: Record<string, ClassGradebook>;
}

export interface IndexStats {
    points: number;
    serviceAces: number;
    spikeSuccesses: number;
    blockingPoints: number;
    digs: number;
    serveIn: number;
    assists: number;
    hustles: number;
}

export interface StandingMatchInput {
    teamAKey: string;
    teamBKey: string;
    rallyA: number;
    rallyB: number;
    sumA: number;
    sumB: number;
    setsA: number;
    setsB: number;
}

export interface StandingTeamInput {
    key: string;
    name: string;
}

export interface StandingRow {
    key: string;
    name: string;
    rank: number | null;
    played: number;
    win: number;
    draw: number;
    loss: number;
    points: number;
    rallyFor: number;
    rallyAgainst: number;
    sumFor: number;
    sumAgainst: number;
    setsFor: number;
    setsAgainst: number;
    pointRatio: number;
}

interface Acc extends StandingRow {
    games: {
        opp: string;
        rallyFor: number;
        rallyAgainst: number;
        sumFor: number;
        sumAgainst: number;
        setsFor: number;
        setsAgainst: number;
        result: 'win' | 'draw' | 'loss';
    }[];
}

export const defaultAssessmentConfig = (): AssessmentGradingConfig => ({
    rankPoints: [
        { rank: 1, score: 30 },
        { rank: 2, score: 28 },
        { rank: 3, score: 26 },
        { rank: 4, score: 24 },
    ],
    teamPartialScore: 22,
    teamAbsentScore: 18,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    ratioBasis: 'rally',
    indexScope: 'cumulative',
    indexScale: 2.0,
    individualBands: [
        { minInclusive: 15, score: 10 },
        { minInclusive: 10, score: 9 },
        { minInclusive: 7, score: 8 },
    ],
    individualFallbackScore: 7,
    individualAbsentScore: 4,
    roleBands: [
        { minInclusive: 6, score: 10 },
        { minInclusive: 5, score: 9 },
        { minInclusive: 4, score: 8 },
        { minInclusive: 3, score: 7 },
        { minInclusive: 2, score: 6 },
        { minInclusive: 1, score: 5 },
        { minInclusive: 0, score: 4 },
    ],
    portfolioOptions: [10, 9, 8, 7, 6, 4],
    expectedTeamMatchCount: 6,
});

export const mergeConfig = (partial?: Partial<AssessmentGradingConfig> | null): AssessmentGradingConfig => {
    const base = defaultAssessmentConfig();
    if (!partial) return base;
    const indexScale = Number(partial.indexScale);
    return {
        ...base,
        ...partial,
        rankPoints: Array.isArray(partial.rankPoints) ? partial.rankPoints.map(item => ({ ...item })) : base.rankPoints,
        individualBands: Array.isArray(partial.individualBands) ? partial.individualBands.map(item => ({ ...item })) : base.individualBands,
        roleBands: Array.isArray(partial.roleBands) ? partial.roleBands.map(item => ({ ...item })) : base.roleBands,
        portfolioOptions: Array.isArray(partial.portfolioOptions) ? [...partial.portfolioOptions] : base.portfolioOptions,
        indexScale: Number.isFinite(indexScale) ? indexScale : base.indexScale,
    };
};

export const emptyStudentEdits = (): StudentGradeEdits => ({ locks: {}, history: [] });

export const gradingMatchKey = (match: {
    date?: string;
    time?: number;
    teamA: { key?: string; name?: string; score?: number };
    teamB: { key?: string; name?: string; score?: number };
}): string => [
    match.date ?? '',
    match.time ?? '',
    match.teamA.key ?? match.teamA.name ?? '',
    match.teamB.key ?? match.teamB.name ?? '',
    match.teamA.score ?? '',
    match.teamB.score ?? '',
].join('|');

export const isMatchIncluded = (isAssessment: boolean, explicit: boolean | undefined): boolean => {
    if (explicit !== undefined) return explicit;
    return isAssessment;
};

export const extractMatchTotals = (match: {
    teamA: { score?: number; fairPlay?: number; threeHitPlays?: number; setsWon?: number };
    teamB: { score?: number; fairPlay?: number; threeHitPlays?: number; setsWon?: number };
    setScores?: { teamA: number; teamB: number }[];
    winner?: 'A' | 'B' | null;
}): {
    rallyA: number;
    rallyB: number;
    sumA: number;
    sumB: number;
    setsA: number;
    setsB: number;
    outcome: 'A' | 'B' | 'draw';
    differs: boolean;
} => {
    const rallyOf = (side: 'A' | 'B') => {
        if (match.setScores && match.setScores.length > 0) {
            return match.setScores.reduce((sum, set) => sum + (side === 'A' ? (set.teamA || 0) : (set.teamB || 0)), 0);
        }
        return side === 'A' ? (match.teamA.score || 0) : (match.teamB.score || 0);
    };
    const bonusOf = (side: 'A' | 'B') => {
        const team = side === 'A' ? match.teamA : match.teamB;
        return (team.fairPlay || 0) + (team.threeHitPlays || 0);
    };
    const rallyA = rallyOf('A');
    const rallyB = rallyOf('B');
    const sumA = rallyA + bonusOf('A');
    const sumB = rallyB + bonusOf('B');
    let setsA = 0;
    let setsB = 0;
    if (match.setScores && match.setScores.length > 0) {
        match.setScores.forEach(set => {
            if ((set.teamA || 0) > (set.teamB || 0)) setsA += 1;
            else if ((set.teamB || 0) > (set.teamA || 0)) setsB += 1;
        });
    } else {
        setsA = match.teamA.setsWon || 0;
        setsB = match.teamB.setsWon || 0;
    }
    const outcome = sumA === sumB ? 'draw' as const : sumA > sumB ? 'A' as const : 'B' as const;
    const stored = match.winner ?? null;
    return { rallyA, rallyB, sumA, sumB, setsA, setsB, outcome, differs: stored !== outcome };
};

const pointRatio = (scored: number, conceded: number): number => {
    if (conceded === 0) return scored > 0 ? Number.POSITIVE_INFINITY : 0;
    return scored / conceded;
};

const compareDescNumber = (left: number, right: number): number => {
    const leftInf = left === Number.POSITIVE_INFINITY;
    const rightInf = right === Number.POSITIVE_INFINITY;
    if (leftInf || rightInf) {
        if (leftInf && rightInf) return 0;
        return leftInf ? -1 : 1;
    }
    if (left === right) return 0;
    return left > right ? -1 : 1;
};

const compareBase = (left: Acc, right: Acc, basis: RatioBasis): number => {
    if (left.points !== right.points) return right.points - left.points;
    const leftRatio = pointRatio(
        basis === 'rally' ? left.rallyFor : left.sumFor,
        basis === 'rally' ? left.rallyAgainst : left.sumAgainst,
    );
    const rightRatio = pointRatio(
        basis === 'rally' ? right.rallyFor : right.sumFor,
        basis === 'rally' ? right.rallyAgainst : right.sumAgainst,
    );
    const ratioOrder = compareDescNumber(leftRatio, rightRatio);
    if (ratioOrder !== 0) return ratioOrder;
    const leftSets = left.setsFor - left.setsAgainst;
    const rightSets = right.setsFor - right.setsAgainst;
    if (leftSets !== rightSets) return rightSets - leftSets;
    return 0;
};

const blankAcc = (key: string, name: string): Acc => ({
    key,
    name,
    rank: null,
    played: 0,
    win: 0,
    draw: 0,
    loss: 0,
    points: 0,
    rallyFor: 0,
    rallyAgainst: 0,
    sumFor: 0,
    sumAgainst: 0,
    setsFor: 0,
    setsAgainst: 0,
    pointRatio: 0,
    games: [],
});

const applyResult = (
    acc: Acc,
    options: { winPoints: number; drawPoints: number; lossPoints: number },
    side: {
        opp: string;
        rallyFor: number;
        rallyAgainst: number;
        sumFor: number;
        sumAgainst: number;
        setsFor: number;
        setsAgainst: number;
        result: 'win' | 'draw' | 'loss';
    },
) => {
    acc.played += 1;
    acc.rallyFor += side.rallyFor;
    acc.rallyAgainst += side.rallyAgainst;
    acc.sumFor += side.sumFor;
    acc.sumAgainst += side.sumAgainst;
    acc.setsFor += side.setsFor;
    acc.setsAgainst += side.setsAgainst;
    if (side.result === 'win') {
        acc.win += 1;
        acc.points += options.winPoints;
    } else if (side.result === 'draw') {
        acc.draw += 1;
        acc.points += options.drawPoints;
    } else {
        acc.loss += 1;
        acc.points += options.lossPoints;
    }
    acc.games.push(side);
};

const miniAcc = (team: Acc, opponents: Set<string>, options: { winPoints: number; drawPoints: number; lossPoints: number }): Acc => {
    const next = blankAcc(team.key, team.name);
    team.games.forEach(game => {
        if (!opponents.has(game.opp)) return;
        applyResult(next, options, game);
    });
    return next;
};

export const buildStandings = (
    teams: StandingTeamInput[],
    matches: StandingMatchInput[],
    options: { basis: RatioBasis; winPoints: number; drawPoints: number; lossPoints: number },
): StandingRow[] => {
    const map = new Map<string, Acc>();
    teams.forEach(team => map.set(team.key, blankAcc(team.key, team.name)));
    const ensure = (key: string) => {
        let acc = map.get(key);
        if (!acc) {
            acc = blankAcc(key, key);
            map.set(key, acc);
        }
        return acc;
    };

    matches.forEach(match => {
        if (!match.teamAKey || !match.teamBKey || match.teamAKey === match.teamBKey) return;
        const outcome = match.sumA === match.sumB ? 'draw' : match.sumA > match.sumB ? 'A' : 'B';
        const left = ensure(match.teamAKey);
        const right = ensure(match.teamBKey);
        applyResult(left, options, {
            opp: match.teamBKey,
            rallyFor: match.rallyA,
            rallyAgainst: match.rallyB,
            sumFor: match.sumA,
            sumAgainst: match.sumB,
            setsFor: match.setsA,
            setsAgainst: match.setsB,
            result: outcome === 'draw' ? 'draw' : outcome === 'A' ? 'win' : 'loss',
        });
        applyResult(right, options, {
            opp: match.teamAKey,
            rallyFor: match.rallyB,
            rallyAgainst: match.rallyA,
            sumFor: match.sumB,
            sumAgainst: match.sumA,
            setsFor: match.setsB,
            setsAgainst: match.setsA,
            result: outcome === 'draw' ? 'draw' : outcome === 'B' ? 'win' : 'loss',
        });
    });

    const known = teams.map(team => map.get(team.key)!).filter(Boolean);
    const active = known.filter(team => team.played > 0);
    const idle = known.filter(team => team.played === 0);
    const sorted = [...active].sort((left, right) => compareBase(left, right, options.basis));
    const ordered: { team: Acc; mini: Acc; groupId: number }[] = [];
    let groupId = 0;
    for (let index = 0; index < sorted.length;) {
        let end = index;
        while (end + 1 < sorted.length && compareBase(sorted[index], sorted[end + 1], options.basis) === 0) end += 1;
        const group = sorted.slice(index, end + 1);
        if (group.length === 1) {
            ordered.push({ team: group[0], mini: group[0], groupId });
        } else {
            const keys = new Set(group.map(team => team.key));
            const ranked = group
                .map(team => ({ team, mini: miniAcc(team, keys, options), groupId }))
                .sort((left, right) => compareBase(left.mini, right.mini, options.basis));
            ordered.push(...ranked);
        }
        groupId += 1;
        index = end + 1;
    }

    const rows: StandingRow[] = [];
    let cursor = 0;
    while (cursor < ordered.length) {
        let end = cursor;
        while (
            end + 1 < ordered.length
            && ordered[end].groupId === ordered[end + 1].groupId
            && compareBase(ordered[end].mini, ordered[end + 1].mini, options.basis) === 0
        ) {
            end += 1;
        }
        const rank = cursor + 1;
        for (let slot = cursor; slot <= end; slot += 1) {
            const team = ordered[slot].team;
            const scored = options.basis === 'rally' ? team.rallyFor : team.sumFor;
            const conceded = options.basis === 'rally' ? team.rallyAgainst : team.sumAgainst;
            const { games: _games, ...rest } = team;
            rows.push({ ...rest, rank, pointRatio: pointRatio(scored, conceded) });
        }
        cursor = end + 1;
    }
    idle.forEach(team => {
        const { games: _games, ...rest } = team;
        rows.push({ ...rest, rank: null, pointRatio: 0 });
    });
    return rows;
};

export const rankPointScore = (rank: number | null, rankPoints: RankPoint[]): number | null => {
    if (rank == null) return null;
    const found = rankPoints.find(item => item.rank === rank);
    return found ? found.score : null;
};

export const meetsHalfParticipation = (played: number, teamMatches: number): boolean => {
    if (teamMatches <= 0) return false;
    return played * 2 >= teamMatches;
};

export const teamPointsForStudent = (input: {
    played: number;
    teamMatches: number;
    rank: number | null;
    config: AssessmentGradingConfig;
}): number | null => {
    if (input.teamMatches <= 0 || input.played <= 0) return input.config.teamAbsentScore;
    if (!meetsHalfParticipation(input.played, input.teamMatches)) return input.config.teamPartialScore;
    return rankPointScore(input.rank, input.config.rankPoints);
};

export const bandScore = (value: number, bands: ScoreBand[], fallback: number): number => {
    const sorted = [...bands].sort((left, right) => right.minInclusive - left.minInclusive);
    for (const band of sorted) {
        if (value >= band.minInclusive) return band.score;
    }
    return fallback;
};

export const excellenceIndex = (stats: IndexStats): number => (
    (stats.points || 0) * 1
    + (stats.serviceAces || 0) * 1
    + (stats.spikeSuccesses || 0) * 1
    + (stats.blockingPoints || 0) * 1
);

export const effortIndex = (stats: IndexStats): number => (
    (stats.hustles || 0) * 2
    + (stats.digs || 0) * 1
    + (stats.serveIn || 0) * 0.5
    + (stats.assists || 0) * 0.5
);

export const choosePersonalIndex = (excellence: number, effort: number): { value: number; source: Exclude<PersonalSource, 'absent'> } => {
    if (effort > excellence) return { value: effort, source: 'effort' };
    if (excellence > effort) return { value: excellence, source: 'excellence' };
    return { value: excellence, source: 'tie' };
};

export const personalEvaluation = (
    participated: boolean,
    stats: IndexStats,
    config: AssessmentGradingConfig,
): { excellence: number; effort: number; chosen: number; source: PersonalSource; score: number } => {
    if (!participated) {
        return { excellence: 0, effort: 0, chosen: 0, source: 'absent', score: config.individualAbsentScore };
    }
    const scale = Number.isFinite(config.indexScale) ? config.indexScale : 2.0;
    const excellence = excellenceIndex(stats) * scale;
    const effort = effortIndex(stats) * scale;
    const chosen = choosePersonalIndex(excellence, effort);
    return {
        excellence,
        effort,
        chosen: chosen.value,
        source: chosen.source,
        score: bandScore(chosen.value, config.individualBands, config.individualFallbackScore),
    };
};

export const individualDistribution = (
    rows: { participated: boolean; stats: IndexStats }[],
    config: AssessmentGradingConfig,
): { score: number; count: number }[] => {
    const counts = new Map<number, number>();
    rows.forEach(row => {
        const score = personalEvaluation(row.participated, row.stats, config).score;
        counts.set(score, (counts.get(score) ?? 0) + 1);
    });
    return [...counts.entries()]
        .map(([score, count]) => ({ score, count }))
        .sort((left, right) => right.score - left.score);
};

export const duplicateRoleKeys = (entries: { date: string; matchInfo: string }[]): string[] => {
    const counts = new Map<string, number>();
    entries.forEach(entry => {
        const key = `${entry.date}|${entry.matchInfo}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].filter(([, count]) => count >= 2).map(([key]) => key);
};

const hasLock = (locks: GradeLockMap, field: GradeField): boolean => Object.prototype.hasOwnProperty.call(locks, field);

export const applyGradeLocks = (
    computed: { team: number | null; individual: number; roleCount: number },
    locks: GradeLockMap,
    config: AssessmentGradingConfig,
): {
    portfolio: number | null;
    team: number | null;
    individual: number;
    role: number;
    roleCount: number;
    locked: Record<GradeField, boolean>;
} => {
    const roleCount = hasLock(locks, 'roleCount') ? Number(locks.roleCount) : computed.roleCount;
    const role = hasLock(locks, 'role') ? Number(locks.role) : bandScore(roleCount, config.roleBands, config.roleBands[config.roleBands.length - 1]?.score ?? 0);
    const team = hasLock(locks, 'team') ? (locks.team ?? null) : computed.team;
    const individual = hasLock(locks, 'individual') ? Number(locks.individual) : computed.individual;
    const portfolio = hasLock(locks, 'portfolio') ? (locks.portfolio ?? null) : null;
    return {
        portfolio,
        team,
        individual,
        role,
        roleCount,
        locked: {
            portfolio: hasLock(locks, 'portfolio'),
            team: hasLock(locks, 'team'),
            individual: hasLock(locks, 'individual'),
            role: hasLock(locks, 'role'),
            roleCount: hasLock(locks, 'roleCount'),
        },
    };
};

export const withGradeEdit = (
    edits: StudentGradeEdits,
    field: GradeField,
    from: number | null,
    to: number | null,
    at: string,
): StudentGradeEdits => ({
    locks: { ...edits.locks, [field]: to },
    history: [{ field, from, to, at }, ...edits.history],
});

export const withoutGradeLock = (
    edits: StudentGradeEdits,
    field: GradeField,
    from: number | null,
    at: string,
): StudentGradeEdits => {
    const locks = { ...edits.locks };
    delete locks[field];
    return {
        locks,
        history: [{ field, from, to: null, at }, ...edits.history],
    };
};

export const indexScopeLabel = (scope: IndexScope): string => (
    scope === 'assessment' ? '수행평가 경기만' : '랭킹 보드와 동일(누적)'
);
