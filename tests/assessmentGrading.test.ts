import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    applyGradeLocks,
    buildStandings,
    choosePersonalIndex,
    defaultAssessmentConfig,
    duplicateRoleKeys,
    mergeConfig,
    extractMatchTotals,
    individualDistribution,
    meetsHalfParticipation,
    personalEvaluation,
    teamPointsForStudent,
    type IndexStats,
    type StandingMatchInput,
} from '../utils/assessmentGrading.ts';

const config = defaultAssessmentConfig();
const points = { winPoints: 3, drawPoints: 1, lossPoints: 0, basis: 'rally' as const };

const match = (partial: Partial<StandingMatchInput> & Pick<StandingMatchInput, 'teamAKey' | 'teamBKey'>): StandingMatchInput => ({
    rallyA: 11,
    rallyB: 9,
    sumA: 11,
    sumB: 9,
    setsA: 1,
    setsB: 0,
    ...partial,
});

const stats = (partial: Partial<IndexStats> = {}): IndexStats => ({
    points: 0,
    serviceAces: 0,
    spikeSuccesses: 0,
    blockingPoints: 0,
    digs: 0,
    serveIn: 0,
    assists: 0,
    hustles: 0,
    ...partial,
});

test('동점이면 득실율, 그다음 세트 득실, 그래도 같으면 공동 순위', () => {
    const teams = [
        { key: 'A', name: 'A' },
        { key: 'B', name: 'B' },
        { key: 'C', name: 'C' },
    ];
    const byRatio = buildStandings(teams, [
        match({ teamAKey: 'A', teamBKey: 'C', rallyA: 20, rallyB: 10, sumA: 20, sumB: 10 }),
        match({ teamAKey: 'B', teamBKey: 'C', rallyA: 15, rallyB: 12, sumA: 15, sumB: 12 }),
    ], points);
    assert.deepEqual(byRatio.map(row => [row.key, row.rank]), [['A', 1], ['B', 2], ['C', 3]]);

    const bySets = buildStandings(teams, [
        match({ teamAKey: 'A', teamBKey: 'C', rallyA: 30, rallyB: 20, sumA: 30, sumB: 20, setsA: 2, setsB: 0 }),
        match({ teamAKey: 'B', teamBKey: 'C', rallyA: 30, rallyB: 20, sumA: 30, sumB: 20, setsA: 2, setsB: 1 }),
    ], points);
    assert.equal(bySets.find(row => row.key === 'A')?.rank, 1);
    assert.equal(bySets.find(row => row.key === 'B')?.rank, 2);

    const shared = buildStandings(teams, [
        match({ teamAKey: 'A', teamBKey: 'B', rallyA: 10, rallyB: 10, sumA: 10, sumB: 10, setsA: 0, setsB: 0 }),
        match({ teamAKey: 'A', teamBKey: 'C', rallyA: 11, rallyB: 9, sumA: 11, sumB: 9 }),
        match({ teamAKey: 'B', teamBKey: 'C', rallyA: 11, rallyB: 9, sumA: 11, sumB: 9 }),
    ], points);
    assert.equal(shared.find(row => row.key === 'A')?.rank, 1);
    assert.equal(shared.find(row => row.key === 'B')?.rank, 1);
    assert.equal(shared.find(row => row.key === 'C')?.rank, 3);

    const cycle = buildStandings(teams, [
        match({ teamAKey: 'A', teamBKey: 'B', rallyA: 11, rallyB: 9, sumA: 11, sumB: 9 }),
        match({ teamAKey: 'B', teamBKey: 'C', rallyA: 11, rallyB: 9, sumA: 11, sumB: 9 }),
        match({ teamAKey: 'C', teamBKey: 'A', rallyA: 11, rallyB: 9, sumA: 11, sumB: 9 }),
    ], points);
    assert.deepEqual(cycle.map(row => row.rank), [1, 1, 1]);
});

test('합계 승자와 저장된 winner가 다르면 표시하고 득실 기준을 바꿀 수 있다', () => {
    const differed = extractMatchTotals({
        teamA: { score: 11, fairPlay: -2, threeHitPlays: 0 },
        teamB: { score: 9, fairPlay: 1, threeHitPlays: 1 },
        winner: 'A',
    });
    assert.equal(differed.outcome, 'B');
    assert.equal(differed.differs, true);
    const same = extractMatchTotals({
        teamA: { score: 11, fairPlay: 0, threeHitPlays: 1 },
        teamB: { score: 9, fairPlay: 0, threeHitPlays: 0 },
        winner: 'A',
    });
    assert.equal(same.outcome, 'A');
    assert.equal(same.differs, false);

    const teams = [{ key: 'A', name: 'A' }, { key: 'B', name: 'B' }];
    const rows = buildStandings(teams, [
        match({ teamAKey: 'A', teamBKey: 'B', rallyA: 11, rallyB: 9, sumA: 8, sumB: 12, setsA: 1, setsB: 0 }),
    ], { ...points, basis: 'sum' });
    assert.equal(rows.find(row => row.key === 'B')?.rank, 1);
    assert.equal(rows.find(row => row.key === 'B')?.points, 3);
});

test('참여 1/2는 참여×2가 팀 경기 수 이상일 때 충족한다', () => {
    assert.equal(meetsHalfParticipation(3, 5), true);
    assert.equal(meetsHalfParticipation(2, 5), false);
    assert.equal(meetsHalfParticipation(0, 4), false);
    assert.equal(meetsHalfParticipation(0, 0), false);
    assert.equal(teamPointsForStudent({ played: 0, teamMatches: 5, rank: 1, config }), 18);
    assert.equal(teamPointsForStudent({ played: 2, teamMatches: 5, rank: 1, config }), 22);
    assert.equal(teamPointsForStudent({ played: 3, teamMatches: 5, rank: 1, config }), 30);
    assert.equal(teamPointsForStudent({ played: 3, teamMatches: 5, rank: 5, config }), null);
    assert.equal(teamPointsForStudent({ played: 0, teamMatches: 0, rank: 1, config }), 18);
});

test('개인 점수는 높은 지수 하나에 구간을 적용하고 분포가 기준을 따른다', () => {
    const higherEffort = choosePersonalIndex(8, 12);
    assert.equal(higherEffort.source, 'effort');
    assert.equal(higherEffort.value, 12);
    const played = personalEvaluation(true, stats({ points: 10, serviceAces: 2, spikeSuccesses: 5, blockingPoints: 3, digs: 1 }), config);
    assert.equal(played.excellence, 40);
    assert.equal(played.source, 'excellence');
    assert.equal(played.score, 10);
    const low = personalEvaluation(true, stats({ digs: 4 }), config);
    assert.equal(low.chosen, 8);
    assert.equal(low.score, 8);
    const absent = personalEvaluation(false, stats(), config);
    assert.equal(absent.score, 4);

    const tuned = {
        ...config,
        individualBands: [{ minInclusive: 9, score: 10 }],
        individualFallbackScore: 6,
    };
    const distribution = individualDistribution([
        { participated: true, stats: stats({ points: 9 }) },
        { participated: true, stats: stats({ points: 3 }) },
        { participated: false, stats: stats() },
    ], tuned);
    assert.deepEqual(distribution, [
        { score: 10, count: 1 },
        { score: 6, count: 1 },
        { score: 4, count: 1 },
    ]);
});

test('지수 배율은 우수와 노력에 같이 곱한 뒤 높은 쪽에 구간을 적용하고, 없는 값은 반마다 2.0이다', () => {
    assert.equal(defaultAssessmentConfig().indexScale, 2);
    assert.equal(mergeConfig(undefined).indexScale, 2);
    assert.equal(mergeConfig({}).indexScale, 2);
    assert.equal(mergeConfig({ indexScale: 1.5 }).indexScale, 1.5);

    const unscaled = { ...config, indexScale: 1 };
    const raw = personalEvaluation(true, stats({ points: 4, digs: 5 }), unscaled);
    assert.equal(raw.excellence, 4);
    assert.equal(raw.effort, 5);
    assert.equal(raw.source, 'effort');
    assert.equal(raw.chosen, 5);
    assert.equal(raw.score, 7);

    const scaled = personalEvaluation(true, stats({ points: 4, digs: 5 }), { ...config, indexScale: 2 });
    assert.equal(scaled.excellence, 8);
    assert.equal(scaled.effort, 10);
    assert.equal(scaled.source, 'effort');
    assert.equal(scaled.chosen, 10);
    assert.equal(scaled.score, 9);
});

test('수정 잠금은 재계산 값을 덮어쓰지 않고 역할 횟수 수정은 역할 점수를 다시 계산한다', () => {
    const first = applyGradeLocks({ team: 30, individual: 9, roleCount: 2 }, { team: 28 }, config);
    assert.equal(first.team, 28);
    assert.equal(first.individual, 9);
    assert.equal(first.role, 6);
    const recalculated = applyGradeLocks({ team: 26, individual: 8, roleCount: 2 }, { team: 28 }, config);
    assert.equal(recalculated.team, 28);
    assert.equal(recalculated.individual, 8);

    const countEdited = applyGradeLocks({ team: 30, individual: 9, roleCount: 2 }, { roleCount: 5 }, config);
    assert.equal(countEdited.roleCount, 5);
    assert.equal(countEdited.role, 9);
    const bothLocked = applyGradeLocks({ team: 30, individual: 9, roleCount: 2 }, { roleCount: 5, role: 10 }, config);
    assert.equal(bothLocked.role, 10);
});

test('같은 날짜와 대진이 두 건 이상이면 알리고 항목 수는 줄이지 않는다', () => {
    const entries = [
        { date: '2026-10-01', matchInfo: 'A vs B', role: '주심' },
        { date: '2026-10-01', matchInfo: 'A vs B', role: '기록관' },
        { date: '2026-10-02', matchInfo: 'A vs C', role: '선심' },
    ];
    assert.deepEqual(duplicateRoleKeys(entries), ['2026-10-01|A vs B']);
    assert.equal(entries.length, 3);
});
