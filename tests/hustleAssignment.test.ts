import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    HUSTLE_CLEAR_NOTICE,
    applyRetroactiveHustle,
    collectAssessmentHustlePlayerIds,
    collectHustlePlayerIds,
    initialHustleSelection,
    listParticipatingPlayers,
    type HustleMatchLike,
} from '../utils/hustleAssignment.ts';

const player = (id: string, name: string) => ({ id, originalName: name, studentNumber: id });

const match = (): HustleMatchLike => ({
    teamA: {
        name: '청룡',
        players: {
            a1: player('a1', '김출전'),
            a2: player('a2', '이벤치'),
            a3: player('a3', '박미출전'),
        },
        onCourtPlayerIds: ['a1'],
        benchPlayerIds: ['a2'],
    },
    teamB: {
        name: '백호',
        players: {
            b1: player('b1', '최출전'),
        },
        onCourtPlayerIds: ['b1'],
        benchPlayerIds: [],
    },
    isAssessment: false,
    hustlePlayerIds: ['a1'],
    hustlePlayers: [{ id: 'a1', name: '김출전', team: 'A' }],
    hustleUpdatedAt: '2026-10-01T01:00:00.000Z',
    hustleRetroactive: false,
});

test('후보는 양 팀 players 전체이고 코트와 벤치는 거르지 않는다', () => {
    const ids = listParticipatingPlayers(match()).map(item => item.id);
    assert.deepEqual(ids, ['a1', 'a2', 'a3', 'b1']);
});

test('players에 없는 기존 허슬은 이름이 남고 체크된 후보로 남는다', () => {
    const stored = {
        ...match(),
        isAssessment: true,
        hustlePlayerIds: ['a1', 'ghost'],
        hustlePlayers: [
            { id: 'a1', name: '김출전', team: 'A' as const },
            { id: 'ghost', name: '이름유지', team: 'B' as const },
        ],
    };
    const listed = listParticipatingPlayers(stored);
    const ghost = listed.find(item => item.id === 'ghost');
    assert.ok(ghost);
    assert.equal(ghost.name, '이름유지');
    assert.equal(ghost.team, 'B');
    assert.equal(listed.some(item => item.id === 'a3'), true);
    assert.deepEqual(initialHustleSelection(stored), ['a1', 'ghost']);

    const saved = applyRetroactiveHustle(stored, ['ghost', 'a3'], { now: '2026-10-23T02:00:00.000Z' });
    assert.ok(saved);
    assert.deepEqual(saved.hustlePlayers, [
        { id: 'ghost', name: '이름유지', team: 'B' },
        { id: 'a3', name: '박미출전', team: 'A' },
    ]);
});

test('수정 창은 저장된 허슬을 빈 상태가 아니라 선택된 상태로 연다', () => {
    const stored = {
        ...match(),
        isAssessment: true,
        hustlePlayerIds: ['a1', 'b1', 'a3', 'a1'],
        hustlePlayers: [
            { id: 'a1', name: '김출전', team: 'A' as const },
            { id: 'b1', name: '최출전', team: 'B' as const },
        ],
    };
    assert.deepEqual(initialHustleSelection(stored), ['a1', 'b1', 'a3']);

    const fromPlayersOnly = { ...match(), hustlePlayerIds: [], hustlePlayers: [{ id: 'a2', name: '이벤치', team: 'A' as const }] };
    assert.deepEqual(initialHustleSelection(fromPlayersOnly), ['a2']);
    assert.deepEqual(initialHustleSelection({ ...match(), hustlePlayerIds: [], hustlePlayers: [] }), []);
});

test('사후 지정은 여러 명을 덮어쓰고 이전 값과 시각을 남긴다', () => {
    const now = '2026-10-22T07:00:00.000Z';
    const next = applyRetroactiveHustle(match(), ['b1'], { markAsAssessment: false, now });
    assert.ok(next);
    assert.deepEqual(next.hustlePlayerIds, ['b1']);
    assert.equal(next.hustleRetroactive, true);
    assert.equal(next.hustleUpdatedAt, now);
    assert.equal(next.hustleHistory?.length, 1);
    assert.deepEqual(next.hustleHistory?.[0].playerIds, ['a1']);
    assert.equal(next.hustleHistory?.[0].source, 'live');
    assert.equal(next.isAssessment, true);
    assert.equal(next.assessmentFlagHistory?.[0]?.to, true);

    const again = applyRetroactiveHustle(next, ['a2', 'b1'], { markAsAssessment: true, now: '2026-10-22T08:00:00.000Z' });
    assert.ok(again);
    assert.deepEqual(again.hustlePlayerIds, ['a2', 'b1']);
    assert.deepEqual(again.hustleHistory?.map(item => item.playerIds), [['b1'], ['a1']]);
    assert.equal(again.hustleHistory?.[0].source, 'retroactive');
    assert.equal(again.isAssessment, true);
    assert.equal(again.assessmentFlagHistory?.length, 1);
    assert.deepEqual(collectHustlePlayerIds(again), ['a2', 'b1']);
});

test('명단과 기존 허슬에 없는 학생은 지정하지 않고, 이미 수행평가인 경기는 유형 이력을 추가하지 않는다', () => {
    assert.equal(applyRetroactiveHustle(match(), ['없는학생'], { markAsAssessment: true, now: '2026-10-22T07:00:00.000Z' }), null);
    assert.equal(applyRetroactiveHustle(match(), ['a2', '없는학생'], { markAsAssessment: true, now: '2026-10-22T07:00:00.000Z' }), null);
    const onRoster = applyRetroactiveHustle(match(), ['a3'], { markAsAssessment: true, now: '2026-10-22T07:00:00.000Z' });
    assert.ok(onRoster);
    assert.deepEqual(onRoster.hustlePlayerIds, ['a3']);
    const assessment = { ...match(), isAssessment: true };
    const next = applyRetroactiveHustle(assessment, ['a2'], { markAsAssessment: true, now: '2026-10-22T07:00:00.000Z' });
    assert.ok(next);
    assert.equal(next.isAssessment, true);
    assert.equal(next.assessmentFlagHistory, undefined);
});

test('수행평가를 일반으로 되돌리면 허슬이 해제되고 이전 선택은 이력에 남는다', () => {
    const now = '2026-10-23T01:00:00.000Z';
    const assessment = {
        ...match(),
        isAssessment: true,
        hustlePlayerIds: ['a1', 'b1'],
        hustlePlayers: [
            { id: 'a1', name: '김출전', team: 'A' as const },
            { id: 'b1', name: '최출전', team: 'B' as const },
        ],
    };
    const next = applyRetroactiveHustle(assessment, ['a2'], { revertToRegular: true, now });
    assert.ok(next);
    assert.equal(next.isAssessment, false);
    assert.deepEqual(next.hustlePlayerIds, []);
    assert.deepEqual(next.hustlePlayers, []);
    assert.deepEqual(next.hustleHistory?.[0].playerIds, ['a1', 'b1']);
    assert.equal(next.hustleRetroactive, true);
    assert.equal(next.hustleUpdatedAt, now);
    assert.equal(next.assessmentFlagHistory?.[0]?.from, true);
    assert.equal(next.assessmentFlagHistory?.[0]?.to, false);
    assert.equal(next.assessmentFlagHistory?.[0]?.at, now);
    assert.equal(HUSTLE_CLEAR_NOTICE, '허슬 지정이 해제됩니다');
    assert.deepEqual(collectHustlePlayerIds(assessment), ['a1', 'b1']);

    const stayed = applyRetroactiveHustle(match(), [], { revertToRegular: true, now });
    assert.ok(stayed);
    assert.equal(stayed.isAssessment, false);
    assert.equal(stayed.assessmentFlagHistory, undefined);
    assert.deepEqual(stayed.hustleHistory?.[0].playerIds, ['a1']);
});

test('일반 경기에 남은 허슬은 지우지 않고 집계에서만 뺀다', () => {
    const regular = match();
    assert.equal(regular.isAssessment, false);
    assert.deepEqual(collectHustlePlayerIds(regular), ['a1']);
    assert.deepEqual(collectAssessmentHustlePlayerIds(regular), []);
    assert.deepEqual(collectAssessmentHustlePlayerIds({ ...regular, isAssessment: true }), ['a1']);
    assert.deepEqual(collectAssessmentHustlePlayerIds({ hustlePlayers: [{ id: 'a2' }] }), []);
    assert.deepEqual(collectAssessmentHustlePlayerIds({ isAssessment: true, hustlePlayers: [{ id: 'a2' }] }), ['a2']);
    assert.deepEqual(collectHustlePlayerIds({}), []);
});
