import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AnalysisMatchInput, TeamRates } from '../utils/teamDetailStats.ts';
import {
    bucketFrom,
    buildTeamAiSummary,
    categorizeTeamMatches,
    peerClassRates,
    ratesFromBucket,
    readJudgedMetrics,
} from '../utils/teamDetailStats.ts';

const FORBIDDEN = ['3팀', '4팀', '청룡', '홍길동', '김철수', '30101', '30102', '약점', '가장 약한', '리시브', '나이스', '디그'];

const rates = (partial: Partial<TeamRates>): TeamRates => ({
    serveSuccessRate: null,
    serveSuccesses: 0,
    serveAttempts: 0,
    games: 0,
    serveFaultsPerGame: null,
    serveFaultsTotal: 0,
    threeHitPerGame: null,
    threeHitTotal: 0,
    opponentAcesPerGame: null,
    opponentAcesTotal: 0,
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
            serveFaultsPerGame: 1.5,
            threeHitPerGame: 2,
            scoringRate: 1.2,
            winRate: 50,
        }),
        round2: rates({
            serveSuccessRate: 81.3,
            serveFaultsPerGame: 0.5,
            threeHitPerGame: 3.4,
            scoringRate: 0.95,
            winRate: 100,
        }),
        classServeAverage: 78.1,
        classServeFaultsPerGame: 1.2,
        classThreeHitPerGame: 1.8,
    });

    assert.equal(
        summary,
        '우리 팀 서브 성공률 1회전 72.7% → 2회전 81.3%(반 평균 78.1%), 서브 범실 1회전 1.5 → 2회전 0.5(반 평균 1.2), 3단 플레이 경기당 1회전 2 → 2회전 3.4(반 평균 1.8), 득점률 1회전 1.20 → 2회전 0.95, 승률 1회전 50% → 2회전 100%',
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
            threeHitPlays: 4,
            playerStats: { p1: hiddenPlayer },
        },
        teamB: {
            name: '4팀',
            key: 'set1___4',
            score: winner === 'A' ? 15 : 20,
            serviceAces: 1,
            serviceFaults: 1,
            threeHitPlays: 2,
            playerStats: {
                p2: { serveIn: 2, originalName: '김철수', studentNumber: '30102' },
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
        classServeFaultsPerGame: peers.serveFaults.perGame,
        classThreeHitPerGame: peers.threeHit.perGame,
    });

    assert.equal(summary.startsWith('우리 팀 '), true);
    assert.equal(round1.threeHitTotal, 4);
    assert.equal(round1.opponentAcesTotal, 1);
    assert.equal(round1.serveFaultsPerGame, 1);
    assertNoIdentity(summary);
    assert.equal(JSON.stringify(classified).includes('홍길동'), false);
    assert.equal(JSON.stringify(classified).includes('30101'), false);
    assert.equal(JSON.stringify(classified).includes('김철수'), false);
});

test('서브 시도 5회 미만이거나 경기 수 1 이하면 비교에서 빠지고, 승률·득점률은 판정하지 않는다', () => {
    const fewServes = readJudgedMetrics({
        overall: rates({ serveSuccessRate: 90, serveAttempts: 4, games: 4, threeHitPerGame: 2, threeHitTotal: 8 }),
        sideA: rates({ serveSuccessRate: 60, serveAttempts: 6, games: 3, threeHitPerGame: 1 }),
        sideB: rates({ serveSuccessRate: 80, serveAttempts: 6, games: 3, threeHitPerGame: 2 }),
        labelA: '1회전',
        labelB: '2회전',
        classServeAverage: 70,
        classServeAttempts: 10,
        classThreeHitPerGame: 1.5,
        classThreeHitGames: 4,
    });
    assert.deepEqual(fewServes.higher.map(item => item.key), []);
    assert.deepEqual(fewServes.lower.map(item => item.key), []);
    assert.deepEqual(fewServes.smallSample.map(item => item.key), ['serve', 'threeHit']);
    assert.equal(fewServes.smallSample[0].sampleDetail.includes('서브 시도 4회'), true);

    const oneGame = readJudgedMetrics({
        overall: rates({ serveSuccessRate: 80, serveAttempts: 10, games: 1, threeHitPerGame: 3, threeHitTotal: 3 }),
        sideA: rates({ serveSuccessRate: 80, serveAttempts: 10, games: 1, threeHitPerGame: 3 }),
        sideB: rates({ serveSuccessRate: 80, serveAttempts: 10, games: 2, threeHitPerGame: 2 }),
        labelA: '1회전',
        labelB: '2회전',
        classServeAverage: 70,
        classServeAttempts: 10,
        classThreeHitPerGame: 1.5,
        classThreeHitGames: 4,
    });
    assert.deepEqual(oneGame.smallSample.map(item => item.key), ['serve', 'threeHit']);
    assert.equal(oneGame.smallSample[0].sampleDetail.includes('경기 1'), true);

    const compared = readJudgedMetrics({
        overall: rates({ serveSuccessRate: 60, serveAttempts: 8, games: 4, threeHitPerGame: 1, threeHitTotal: 4 }),
        sideA: rates({ serveSuccessRate: 50, serveAttempts: 8, games: 4, threeHitPerGame: 1, threeHitTotal: 4 }),
        sideB: rates({ serveSuccessRate: 70, serveAttempts: 8, games: 4, threeHitPerGame: 2, threeHitTotal: 8 }),
        labelA: '1회전',
        labelB: '2회전',
        classServeAverage: 70,
        classServeAttempts: 10,
        classThreeHitPerGame: 2.5,
        classThreeHitGames: 4,
    });
    assert.deepEqual(compared.lower.map(item => item.key), ['serve', 'threeHit']);
    assert.equal(compared.lower[0].changeText, '1회전→2회전 상승');
    assert.equal(compared.lower[1].countText, '총 4');
    const dumped = JSON.stringify(compared);
    assert.equal(dumped.includes('승률'), false);
    assert.equal(dumped.includes('득점률'), false);
    assert.equal(dumped.includes('약점'), false);
    assert.equal(dumped.includes('리시브'), false);
});
