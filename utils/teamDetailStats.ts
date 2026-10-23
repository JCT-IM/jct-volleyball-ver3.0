/** 팀 한 쪽의 숫자만. 이름·학번이 들어 있는 players / hustlePlayers 는 읽지 않는다. */
export interface TeamSideNumbers {
    name?: string;
    key?: string;
    score?: number;
    serviceAces?: number;
    serviceFaults?: number;
    blockingPoints?: number;
    spikeSuccesses?: number;
    threeHitPlays?: number;
    playerStats?: Record<string, { serveIn?: number } | null | undefined>;
}

export interface AnalysisMatchInput {
    date?: string;
    winner?: 'A' | 'B' | null;
    isAssessment?: boolean;
    teamA?: TeamSideNumbers;
    teamB?: TeamSideNumbers;
}

export interface TeamSetRef {
    id?: string;
    className?: string;
}

export type MatchCategory = 'practice' | 'assessment1' | 'assessment2';

export const CATEGORY_LABEL: Record<MatchCategory, string> = {
    practice: '연습',
    assessment1: '수행평가 1회전',
    assessment2: '수행평가 2회전',
};

export const CATEGORY_ORDER: MatchCategory[] = ['practice', 'assessment1', 'assessment2'];

export type TrendMetric =
    | 'points'
    | 'serveSuccessRate'
    | 'serviceFaults'
    | 'threeHitPlays'
    | 'spikeSuccesses'
    | 'blockingPoints';

export const TREND_METRICS: { key: TrendMetric; label: string }[] = [
    { key: 'points', label: '득점' },
    { key: 'serveSuccessRate', label: '서브 성공률' },
    { key: 'serviceFaults', label: '서브 범실' },
    { key: 'threeHitPlays', label: '3단 플레이' },
    { key: 'spikeSuccesses', label: '스파이크 득점' },
    { key: 'blockingPoints', label: '블로킹 득점' },
];

/** 이 횟수보다 시도가 적으면 판정하지 않는다. */
export const MIN_SAMPLE_ATTEMPTS = 5;

export const CATEGORY_SHORT: Record<MatchCategory, string> = {
    practice: '연습',
    assessment1: '1회전',
    assessment2: '2회전',
};

export interface TeamMatchSnapshot {
    date?: string;
    opponent: string;
    result: '승' | '패';
    /** 우리 득점:상대 득점 */
    scoreLabel: string;
    pointsFor: number;
    pointsAgainst: number;
    serviceAces: number;
    serveIn: number;
    serviceFaults: number;
    threeHitPlays: number;
    opponentAces: number;
    spikeSuccesses: number;
    blockingPoints: number;
}

export interface ClassifiedTeamMatch {
    category: MatchCategory;
    snapshot: TeamMatchSnapshot;
}

export interface TeamBucket {
    games: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    serviceAces: number;
    serveIn: number;
    serviceFaults: number;
    threeHitPlays: number;
    opponentAces: number;
    spikeSuccesses: number;
    blockingPoints: number;
}

export interface TeamRates {
    /** (서브 득점 + 서브 In) / (서브 득점 + 서브 In + 서브 범실) × 100. 학생 상세와 같은 식. */
    serveSuccessRate: number | null;
    serveSuccesses: number;
    serveAttempts: number;
    games: number;
    /** 서브 범실 합 ÷ 경기수 */
    serveFaultsPerGame: number | null;
    serveFaultsTotal: number;
    /** 3단 플레이 합 ÷ 경기수. 기록관 버튼 횟수. */
    threeHitPerGame: number | null;
    threeHitTotal: number;
    /** 상대 서브 득점 합 ÷ 경기수 */
    opponentAcesPerGame: number | null;
    opponentAcesTotal: number;
    /** 총득점 / 총실점 */
    scoringRate: number | null;
    /** 승수 / 경기수 × 100. 팀 분석 표와 같은 식. */
    winRate: number | null;
}

export interface PooledRate {
    rate: number | null;
    successes: number;
    attempts: number;
}

/** 다른 팀 기록을 경기 수로 나눈 합산 평균. 팀별 평균을 다시 평균내지 않는다. */
export interface PooledPerGame {
    perGame: number | null;
    total: number;
    games: number;
}

const num = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/** playerStats 에서 서브 In 숫자만 합산. 키(선수 id)와 그 외 필드는 쓰지 않는다. */
const sumServeIn = (playerStats: TeamSideNumbers['playerStats']): number => {
    if (!playerStats) return 0;
    let sum = 0;
    for (const stat of Object.values(playerStats)) {
        sum += num(stat?.serveIn);
    }
    return sum;
};

export const formatPerGame = (value: number | null): string => {
    if (value == null || Number.isNaN(value)) return '기록 없음';
    const roundedValue = Math.round(value * 10) / 10;
    return Number.isInteger(roundedValue) ? String(roundedValue) : roundedValue.toFixed(1);
};

const perGame = (total: number, games: number): number | null => (
    games > 0 ? total / games : null
);

export const formatPercent = (value: number | null): string => {
    if (value == null || Number.isNaN(value)) return '기록 없음';
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
};

export const formatRatio = (value: number | null): string => {
    if (value == null || Number.isNaN(value)) return '기록 없음';
    return value.toFixed(2);
};

const dateKey = (date?: string): string => {
    if (!date) return 'unknown';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return 'unknown';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const classFromKey = (key: string | undefined, teamSets: TeamSetRef[]): string | null => {
    if (!key) return null;
    const setId = String(key).split('___')[0];
    return teamSets.find(s => s.id === setId)?.className ?? null;
};

const matchTouchesClass = (match: AnalysisMatchInput, className: string, teamSets: TeamSetRef[]): boolean => {
    if (!className) return false;
    const a = classFromKey(match.teamA?.key, teamSets);
    const b = classFromKey(match.teamB?.key, teamSets);
    return a === className || b === className;
};

const snapshotOf = (match: AnalysisMatchInput, teamName: string): TeamMatchSnapshot | null => {
    const side: 'A' | 'B' | null = match.teamA?.name === teamName ? 'A' : match.teamB?.name === teamName ? 'B' : null;
    if (!side) return null;
    const ours = side === 'A' ? match.teamA : match.teamB;
    const opp = side === 'A' ? match.teamB : match.teamA;
    if (!ours || !opp) return null;
    const pointsFor = num(ours.score);
    const pointsAgainst = num(opp.score);
    return {
        date: match.date,
        opponent: opp.name || '상대',
        result: match.winner === side ? '승' : '패',
        scoreLabel: `${pointsFor}:${pointsAgainst}`,
        pointsFor,
        pointsAgainst,
        serviceAces: num(ours.serviceAces),
        serveIn: sumServeIn(ours.playerStats),
        serviceFaults: num(ours.serviceFaults),
        threeHitPlays: num(ours.threeHitPlays),
        opponentAces: num(opp.serviceAces),
        spikeSuccesses: num(ours.spikeSuccesses),
        blockingPoints: num(ours.blockingPoints),
    };
};

/**
 * 연습 / 수행평가 1회전 / 2회전.
 * 같은 반 수행평가가 이틀 이상이면 날짜를 앞뒤로 나눈다.
 * 경기일이 하루뿐이면 시간순으로 앞에서 (팀 수 − 1)경기를 1회전으로 둔다.
 */
export const categorizeTeamMatches = (
    teamName: string,
    className: string,
    teamCount: number,
    matches: AnalysisMatchInput[],
    teamSets: TeamSetRef[],
): ClassifiedTeamMatch[] => {
    const classDates = new Set<string>();
    for (const match of matches) {
        if (match.isAssessment !== true) continue;
        if (!matchTouchesClass(match, className, teamSets)) continue;
        const key = dateKey(match.date);
        if (key !== 'unknown') classDates.add(key);
    }
    const sortedDates = [...classDates].sort();
    const roundByDate = new Map<string, 1 | 2>();
    const useDateRounds = sortedDates.length >= 2;
    if (useDateRounds) {
        const split = Math.floor(sortedDates.length / 2);
        sortedDates.forEach((d, i) => roundByDate.set(d, i < split ? 1 : 2));
    }

    const indexed = matches.map((match, index) => ({ match, index }));
    indexed.sort((a, b) => {
        const dt = new Date(a.match.date ?? 0).getTime() - new Date(b.match.date ?? 0).getTime();
        return dt || a.index - b.index;
    });

    const teamMatches = indexed
        .map(({ match }) => ({ match, snapshot: snapshotOf(match, teamName) }))
        .filter((row): row is { match: AnalysisMatchInput; snapshot: TeamMatchSnapshot } => row.snapshot != null);

    const assessmentCount = teamMatches.filter(row => row.match.isAssessment === true).length;
    const gamesPerRound = teamCount >= 2 ? teamCount - 1 : Math.max(1, Math.ceil(assessmentCount / 2));
    let assessmentIndex = 0;

    return teamMatches.map(({ match, snapshot }) => {
        if (match.isAssessment !== true) {
            return { category: 'practice' as const, snapshot };
        }
        let round: 1 | 2;
        if (useDateRounds) {
            round = roundByDate.get(dateKey(match.date)) ?? 1;
        } else {
            round = assessmentIndex < gamesPerRound ? 1 : 2;
        }
        assessmentIndex += 1;
        return { category: round === 1 ? 'assessment1' as const : 'assessment2' as const, snapshot };
    });
};

export const emptyBucket = (): TeamBucket => ({
    games: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    serviceAces: 0,
    serveIn: 0,
    serviceFaults: 0,
    threeHitPlays: 0,
    opponentAces: 0,
    spikeSuccesses: 0,
    blockingPoints: 0,
});

export const bucketFrom = (snapshots: TeamMatchSnapshot[]): TeamBucket => {
    const bucket = emptyBucket();
    for (const s of snapshots) {
        bucket.games += 1;
        if (s.result === '승') bucket.wins += 1;
        else bucket.losses += 1;
        bucket.pointsFor += s.pointsFor;
        bucket.pointsAgainst += s.pointsAgainst;
        bucket.serviceAces += s.serviceAces;
        bucket.serveIn += s.serveIn;
        bucket.serviceFaults += s.serviceFaults;
        bucket.threeHitPlays += s.threeHitPlays;
        bucket.opponentAces += s.opponentAces;
        bucket.spikeSuccesses += s.spikeSuccesses;
        bucket.blockingPoints += s.blockingPoints;
    }
    return bucket;
};

export const ratesFromBucket = (bucket: TeamBucket): TeamRates => {
    const serveSuccesses = bucket.serviceAces + bucket.serveIn;
    const serveAttempts = serveSuccesses + bucket.serviceFaults;
    return {
        serveSuccessRate: serveAttempts > 0 ? (serveSuccesses / serveAttempts) * 100 : null,
        serveSuccesses,
        serveAttempts,
        games: bucket.games,
        serveFaultsPerGame: perGame(bucket.serviceFaults, bucket.games),
        serveFaultsTotal: bucket.serviceFaults,
        threeHitPerGame: perGame(bucket.threeHitPlays, bucket.games),
        threeHitTotal: bucket.threeHitPlays,
        opponentAcesPerGame: perGame(bucket.opponentAces, bucket.games),
        opponentAcesTotal: bucket.opponentAces,
        scoringRate: bucket.pointsAgainst > 0 ? bucket.pointsFor / bucket.pointsAgainst : null,
        winRate: bucket.games > 0 ? (bucket.wins / bucket.games) * 100 : null,
    };
};

const addSnapshot = (bucket: TeamBucket, snapshot: TeamMatchSnapshot) => {
    bucket.games += 1;
    if (snapshot.result === '승') bucket.wins += 1;
    else bucket.losses += 1;
    bucket.pointsFor += snapshot.pointsFor;
    bucket.pointsAgainst += snapshot.pointsAgainst;
    bucket.serviceAces += snapshot.serviceAces;
    bucket.serveIn += snapshot.serveIn;
    bucket.serviceFaults += snapshot.serviceFaults;
    bucket.threeHitPlays += snapshot.threeHitPlays;
    bucket.opponentAces += snapshot.opponentAces;
    bucket.spikeSuccesses += snapshot.spikeSuccesses;
    bucket.blockingPoints += snapshot.blockingPoints;
};

/**
 * 같은 반에서 보고 있는 팀을 뺀 다른 팀의 시도를 하나로 합친 평균.
 * 팀마다 평균을 낸 뒤 다시 평균내지 않는다.
 */
export const peerClassRates = (
    className: string,
    excludeTeamName: string,
    matches: AnalysisMatchInput[],
    teamSets: TeamSetRef[],
): { serve: PooledRate; serveFaults: PooledPerGame; threeHit: PooledPerGame } => {
    const bucket = emptyBucket();
    const names = new Set<string>();
    for (const match of matches) {
        for (const side of [match.teamA, match.teamB]) {
            if (!side?.name || side.name === excludeTeamName) continue;
            if (classFromKey(side.key, teamSets) !== className) continue;
            names.add(side.name);
        }
    }
    for (const name of names) {
        for (const match of matches) {
            const onA = match.teamA?.name === name && classFromKey(match.teamA?.key, teamSets) === className;
            const onB = match.teamB?.name === name && classFromKey(match.teamB?.key, teamSets) === className;
            if (!onA && !onB) continue;
            const snapshot = snapshotOf(match, name);
            if (snapshot) addSnapshot(bucket, snapshot);
        }
    }
    const rates = ratesFromBucket(bucket);
    return {
        serve: { rate: rates.serveSuccessRate, successes: rates.serveSuccesses, attempts: rates.serveAttempts },
        serveFaults: { perGame: rates.serveFaultsPerGame, total: rates.serveFaultsTotal, games: rates.games },
        threeHit: { perGame: rates.threeHitPerGame, total: rates.threeHitTotal, games: rates.games },
    };
};

export type RateChange = '상승' | '하락' | '같음' | '표본 적음';

export interface MetricReading {
    key: 'serve' | 'threeHit';
    label: string;
    rateText: string;
    countText: string | null;
    averageText: string;
    changeText: string;
    sampleDetail: string;
}

export interface MetricReadingGroups {
    higher: MetricReading[];
    lower: MetricReading[];
    same: MetricReading[];
    smallSample: MetricReading[];
    /** 우리 팀 시도는 충분하지만 반 평균을 만들 시도가 5회 미만인 경우 */
    noBaseline: MetricReading[];
}

const rounded = (value: number) => Math.round(value * 10) / 10;

/** 서브 시도 5회 미만이거나 경기 수가 1경기 이하면 반 평균과 비교하지 않는다. */
export const isSmallSample = (rates: { games: number; serveAttempts: number }): boolean => (
    rates.games <= 1 || rates.serveAttempts < MIN_SAMPLE_ATTEMPTS
);

const sampleDetail = (rates: TeamRates): string => {
    const parts: string[] = [];
    if (rates.serveAttempts < MIN_SAMPLE_ATTEMPTS) parts.push(`서브 시도 ${rates.serveAttempts}회`);
    if (rates.games <= 1) parts.push(`경기 ${rates.games}`);
    return parts.join(' · ');
};

const changeOf = (before: number | null, beforeSmall: boolean, after: number | null, afterSmall: boolean): RateChange => {
    if (before == null || after == null || beforeSmall || afterSmall) return '표본 적음';
    const left = rounded(before);
    const right = rounded(after);
    if (right > left) return '상승';
    if (right < left) return '하락';
    return '같음';
};

/**
 * 서브 성공률과 3단 플레이(경기당)만 반 평균과 비교한다.
 * 서브 시도가 5회 미만이거나 경기 수가 1경기 이하면 높은/낮은 쪽에 넣지 않는다.
 */
export const readJudgedMetrics = (input: {
    overall: TeamRates;
    sideA: TeamRates;
    sideB: TeamRates;
    labelA: string;
    labelB: string;
    classServeAverage: number | null;
    classServeAttempts: number;
    classThreeHitPerGame: number | null;
    classThreeHitGames: number;
}): MetricReadingGroups => {
    const groups: MetricReadingGroups = { higher: [], lower: [], same: [], smallSample: [], noBaseline: [] };
    const overallSmall = isSmallSample(input.overall);
    const sideASmall = isSmallSample(input.sideA);
    const sideBSmall = isSmallSample(input.sideB);
    const specs: {
        key: 'serve' | 'threeHit';
        label: string;
        value: number | null;
        valueText: string;
        countText: string | null;
        before: number | null;
        after: number | null;
        classAverage: number | null;
        classReady: boolean;
        averageText: string;
    }[] = [
        {
            key: 'serve',
            label: '서브 성공률',
            value: input.overall.serveSuccessRate,
            valueText: formatPercent(input.overall.serveSuccessRate),
            countText: null,
            before: input.sideA.serveSuccessRate,
            after: input.sideB.serveSuccessRate,
            classAverage: input.classServeAverage,
            classReady: input.classServeAverage != null && input.classServeAttempts >= MIN_SAMPLE_ATTEMPTS,
            averageText: input.classServeAverage == null ? '반 평균 기록 없음' : `반 평균 ${formatPercent(input.classServeAverage)}`,
        },
        {
            key: 'threeHit',
            label: '3단 플레이(경기당)',
            value: input.overall.threeHitPerGame,
            valueText: formatPerGame(input.overall.threeHitPerGame),
            countText: input.overall.games > 0 ? `총 ${input.overall.threeHitTotal}` : null,
            before: input.sideA.threeHitPerGame,
            after: input.sideB.threeHitPerGame,
            classAverage: input.classThreeHitPerGame,
            classReady: input.classThreeHitPerGame != null && input.classThreeHitGames > 1,
            averageText: input.classThreeHitPerGame == null ? '반 평균 기록 없음' : `반 평균 ${formatPerGame(input.classThreeHitPerGame)}`,
        },
    ];

    for (const spec of specs) {
        const change = changeOf(spec.before, sideASmall, spec.after, sideBSmall);
        const item: MetricReading = {
            key: spec.key,
            label: spec.label,
            rateText: spec.valueText,
            countText: spec.countText,
            averageText: spec.averageText,
            changeText: `${input.labelA}→${input.labelB} ${change}`,
            sampleDetail: sampleDetail(input.overall),
        };
        if (overallSmall || spec.value == null) {
            groups.smallSample.push(item);
            continue;
        }
        if (!spec.classReady || spec.classAverage == null) {
            groups.noBaseline.push(item);
            continue;
        }
        const ours = rounded(spec.value);
        const peer = rounded(spec.classAverage);
        if (ours > peer) groups.higher.push(item);
        else if (ours < peer) groups.lower.push(item);
        else groups.same.push(item);
    }
    return groups;
};

const metricNumber = (snapshot: TeamMatchSnapshot, metric: TrendMetric): number => {
    if (metric === 'points') return snapshot.pointsFor;
    if (metric === 'serviceFaults') return snapshot.serviceFaults;
    if (metric === 'threeHitPlays') return snapshot.threeHitPlays;
    if (metric === 'spikeSuccesses') return snapshot.spikeSuccesses;
    if (metric === 'blockingPoints') return snapshot.blockingPoints;
    const rates = ratesFromBucket(bucketFrom([snapshot]));
    return rates.serveSuccessRate == null ? 0 : parseFloat(rates.serveSuccessRate.toFixed(1));
};

export interface TeamTrendPoint {
    name: string;
    date?: string;
    team?: string;
    opponent?: string;
    result?: string;
    score?: string;
    categoryLabel?: string;
    [key: string]: string | number | undefined;
}

/** 최근 10경기. 호출 쪽 경기 목록은 오래된 경기 → 최근 경기 순. */
export const buildTrendPoints = (
    classified: ClassifiedTeamMatch[],
    category: 'all' | MatchCategory,
    metric: TrendMetric,
    teamName: string,
): { points: TeamTrendPoint[]; total: number; dataKey: string } => {
    const label = TREND_METRICS.find(m => m.key === metric)?.label ?? '득점';
    const filtered = classified.filter(row => category === 'all' || row.category === category);
    const recent = filtered.slice(-10);
    const points = recent.map((row, index) => ({
        name: `G${index + 1}`,
        date: row.snapshot.date ? new Date(row.snapshot.date).toLocaleDateString() : '',
        team: teamName,
        opponent: row.snapshot.opponent,
        result: row.snapshot.result,
        score: row.snapshot.scoreLabel,
        categoryLabel: CATEGORY_LABEL[row.category],
        [label]: metricNumber(row.snapshot, metric),
    }));
    return { points, total: filtered.length, dataKey: label };
};

export interface TeamAiSummaryInput {
    round1: TeamRates;
    round2: TeamRates;
    classServeAverage: number | null;
    classServeFaultsPerGame: number | null;
    classThreeHitPerGame: number | null;
}

const withAverage = (value: number | null, format: (value: number | null) => string): string => (
    value == null ? '' : `(반 평균 ${format(value)})`
);

/**
 * 복사 문장. 팀 이름·학생 이름·학번은 인자로 받지 않고, 주어는 항상 '우리 팀'이다.
 * 숫자와 반 평균만 담는다.
 */
export const buildTeamAiSummary = (input: TeamAiSummaryInput): string => {
    const serveAverage = withAverage(input.classServeAverage, formatPercent);
    const faultAverage = withAverage(input.classServeFaultsPerGame, formatPerGame);
    const threeHitAverage = withAverage(input.classThreeHitPerGame, formatPerGame);
    return `우리 팀 서브 성공률 1회전 ${formatPercent(input.round1.serveSuccessRate)} → 2회전 ${formatPercent(input.round2.serveSuccessRate)}${serveAverage}, 서브 범실 1회전 ${formatPerGame(input.round1.serveFaultsPerGame)} → 2회전 ${formatPerGame(input.round2.serveFaultsPerGame)}${faultAverage}, 3단 플레이 경기당 1회전 ${formatPerGame(input.round1.threeHitPerGame)} → 2회전 ${formatPerGame(input.round2.threeHitPerGame)}${threeHitAverage}, 득점률 1회전 ${formatRatio(input.round1.scoringRate)} → 2회전 ${formatRatio(input.round2.scoringRate)}, 승률 1회전 ${formatPercent(input.round1.winRate)} → 2회전 ${formatPercent(input.round2.winRate)}`;
};
