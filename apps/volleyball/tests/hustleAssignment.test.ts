import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    applyRetroactiveHustle,
    collectHustlePlayerIds,
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

test('후보는 양 팀 출전 선수만 포함한다', () => {
    const ids = listParticipatingPlayers(match()).map(item => item.id);
    assert.deepEqual(ids, ['a1', 'a2', 'b1']);
});

test('사후 지정은 현재 값을 덮어쓰고 이전 값과 시각을 남긴다', () => {
    const now = '2026-10-22T07:00:00.000Z';
    const next = applyRetroactiveHustle(match(), 'b1', { markAsAssessment: false, now });
    assert.ok(next);
    assert.deepEqual(next.hustlePlayerIds, ['b1']);
    assert.equal(next.hustleRetroactive, true);
    assert.equal(next.hustleUpdatedAt, now);
    assert.equal(next.hustleHistory?.length, 1);
    assert.deepEqual(next.hustleHistory?.[0].playerIds, ['a1']);
    assert.equal(next.hustleHistory?.[0].source, 'live');
    assert.equal(next.isAssessment, false);

    const again = applyRetroactiveHustle(next, 'a2', { markAsAssessment: true, now: '2026-10-22T08:00:00.000Z' });
    assert.ok(again);
    assert.deepEqual(again.hustlePlayerIds, ['a2']);
    assert.deepEqual(again.hustleHistory?.map(item => item.playerIds[0]), ['b1', 'a1']);
    assert.equal(again.hustleHistory?.[0].source, 'retroactive');
    assert.equal(again.isAssessment, true);
    assert.deepEqual(again.assessmentFlagHistory?.[0], {
        at: '2026-10-22T08:00:00.000Z',
        from: false,
        to: true,
    });
    assert.deepEqual(collectHustlePlayerIds(again), ['a2']);
});

test('출전하지 않은 학생과 이미 수행평가인 경기는 규칙을 지킨다', () => {
    assert.equal(applyRetroactiveHustle(match(), 'a3', { markAsAssessment: true, now: '2026-10-22T07:00:00.000Z' }), null);
    const assessment = { ...match(), isAssessment: true };
    const next = applyRetroactiveHustle(assessment, 'a2', { markAsAssessment: true, now: '2026-10-22T07:00:00.000Z' });
    assert.ok(next);
    assert.equal(next.isAssessment, true);
    assert.equal(next.assessmentFlagHistory, undefined);
});

test('수행평가 여부와 상관없이 저장된 허슬 ID를 집계한다', () => {
    const regular = applyRetroactiveHustle(match(), 'b1', { markAsAssessment: false, now: '2026-10-22T07:00:00.000Z' });
    assert.ok(regular);
    assert.equal(regular.isAssessment, false);
    assert.deepEqual(collectHustlePlayerIds(regular), ['b1']);
    assert.deepEqual(collectHustlePlayerIds({ hustlePlayers: [{ id: 'a2' }] }), ['a2']);
    assert.deepEqual(collectHustlePlayerIds({}), []);
});
