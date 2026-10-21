import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AnalysisMatchInput, TeamRates } from '../utils/teamDetailStats.ts';
import {
    bucketFrom,
    buildTeamAiSummary,
    categorizeTeamMatches,
    peerClassRates,
    ratesFromBucket,
    readServeReceive,
} from '../utils/teamDetailStats.ts';

const FORBIDDEN = ['3팀', '4팀', '청룡', '홍길동', '김철수', '30101', '30102', '약점', '가장 약한'];

const rates = (partial: Partial<TeamRates>): TeamRates => ({
    serveSuccessRate: null,
    serveSuccesses: 0,
    serveAttempts: 0,
    receiveSuccessRate: null,
    receiveSuccesses: 0,
    receiveAttempts: 0,
    scoringRate: null,
    winRate: null,
    ...partial,
});

const assertNoIdentity = (text: string) => {
    for (const word of FORBIDDEN) {
        assert.equal(text.includes(word), false, `문장에 들어가면 안 되는 값: ${word}`);
    }
};

test('AI 복사 문장은 우리 팀으로 시작하고 이름·학번·약점 판정이 없다', () => {
    const summary = buildTeamAiSummary({
        round1: rates({
            serveSuccessRate: 72.7,
            receiveSuccessRate: 66.7,
            scoringRate: 1.2,
            winRate: 50,
        }),
        round2: rates({
            serveSuccessRate: 81.3,
            receiveSuccessRate: 71.4,
            scoringRate: 0.95,
            winRate: 100,
        }),
        classServeAverage: 78.1,
        classReceiveAverage: 70,
    });

    assert.equal(
        summary,
        '우리 팀 서브 성공률 1회전 72.7% → 2회전 81.3%(반 평균 78.1%), 리시브 성공률(나이스 기준) 1회전 66.7% → 2회전 71.4%(반 평균 70%), 득점률 1회전 1.20 → 2회전 0.95, 승률 1회전 50% → 2회전 100%',
    );
    assert.equal(summary.startsWith('우리 팀 '), true);
    assert.equal(buildTeamAiSummary.toString().includes('teamName'), false);
    assertNoIdentity(summary);
});

test('경기 기록에 이름과 학번이 있어도 복사 문장에는 숫자만 남는다', () => {
    const sets = [{ id: 'set1', className: '1반' }];
    const hiddenPlayer = {
        originalName: '홍길동',
        studentNumber: '30101',
        serveIn: 4,
        digs: 3,
    };
    const match = (date: string, assessment: boolean, winner: 'A' | 'B'): AnalysisMatchInput => ({
        date,
        winner,
        isAssessment: assessment,
        teamA: {
            name: '3팀',
            key: 'set1___3',
            score: winner === 'A' ? 21 : 10,
            serviceAces: 2,
            serviceFaults: 1,
            playerStats: { p1: hiddenPlayer },
        },
        teamB: {
            name: '4팀',
            key: 'set1___4',
            score: winner === 'A' ? 15 : 20,
            serviceAces: 1,
            serviceFaults: 1,
            playerStats: {
                p2: { serveIn: 2, digs: 2, originalName: '김철수', studentNumber: '30102' },
            },
        },
    });
    const matches = [
        match('2026-05-01T01:00:00.000Z', true, 'A'),
        match('2026-05-08T01:00:00.000Z', true, 'B'),
    ];
    const classified = categorizeTeamMatches('3팀', '1반', 4, matches, sets);
    const round1 = ratesFromBucket(bucketFrom(classified.filter(row => row.category === 'assessment1').map(row => row.snapshot)));
    const round2 = ratesFromBucket(bucketFrom(classified.filter(row => row.category === 'assessment2').map(row => row.snapshot)));
    const peers = peerClassRates('1반', '3팀', matches, sets);
    const summary = buildTeamAiSummary({
        round1,
        round2,
        classServeAverage: peers.serve.rate,
        classReceiveAverage: peers.receive.rate,
    });

    assert.equal(summary.startsWith('우리 팀 '), true);
    assertNoIdentity(summary);
    assert.equal(JSON.stringify(classified).includes('홍길동'), false);
    assert.equal(JSON.stringify(classified).includes('30101'), false);
});

test('시도 5회 미만은 반 평균 비교에서 빠지고, 승률·득점률은 판정하지 않는다', () => {
    const overall = rates({
        serveSuccessRate: 90,
        serveSuccesses: 4,
        serveAttempts: 4,
        receiveSuccessRate: 40,
        receiveSuccesses: 4,
        receiveAttempts: 10,
    });
    const rising = rates({
        serveSuccessRate: 60,
        serveAttempts: 6,
        receiveSuccessRate: 30,
        receiveAttempts: 6,
    });
    const risen = rates({
        serveSuccessRate: 80,
        serveAttempts: 6,
        receiveSuccessRate: 50,
        receiveAttempts: 6,
    });
    const reading = readServeReceive({
        overall,
        sideA: rising,
        sideB: risen,
        labelA: '1회전',
        labelB: '2회전',
        classServeAverage: 70,
        classReceiveAverage: 70,
        classServeAttempts: 10,
        classReceiveAttempts: 10,
    });

    assert.deepEqual(reading.higher.map(item => item.key), []);
    assert.deepEqual(reading.smallSample.map(item => item.key), ['serve']);
    assert.equal(reading.smallSample[0].attempts, 4);
    assert.deepEqual(reading.lower.map(item => item.key), ['receive']);
    assert.equal(reading.lower[0].changeText, '1회전→2회전 상승');
    assert.equal(reading.lower[0].countText, '4/10');
    const dumped = JSON.stringify(reading);
    assert.equal(dumped.includes('승률'), false);
    assert.equal(dumped.includes('득점률'), false);
    assert.equal(dumped.includes('약점'), false);
});
