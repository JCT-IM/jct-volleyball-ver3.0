import type { SportDefinition } from '@jct/sport-core';

/**
 * 배구 규칙 초안. 화면, 리듀서, 저장 형식에는 아직 연결하지 않는다.
 * 버튼 key 는 스코어보드 actionType 과 같고, 득점 기록은 type + playerId 로만 가리킨다.
 */
export const volleyballSport: SportDefinition = {
    id: 'volleyball',
    name: '배구',
    teamSize: 6,
    rolesForNonPlayers: [
        { key: 'announcer', label: '아나운서' },
        { key: 'referee', label: '주심' },
        { key: 'lineJudge', label: '선심' },
        { key: 'cameraDirector', label: '카메라 감독' },
        { key: 'recorder', label: '기록관' },
    ],
    scoreButtons: [
        {
            id: 'serve',
            label: '서브',
            buttons: [
                { key: 'SERVICE_ACE', label: '서브 득점', icon: 'volleyball', scoresPoint: true, statKey: 'serviceAces' },
                { key: 'SERVICE_FAULT', label: '서브 범실', icon: 'volleyball', scoresPoint: true, statKey: 'serviceFaults' },
                { key: 'SERVE_IN', label: '서브 인', icon: 'bolt', scoresPoint: false, statKey: 'serveIn' },
            ],
        },
        {
            id: 'attack',
            label: '공격',
            buttons: [
                { key: 'SPIKE_SUCCESS', label: '스파이크', icon: 'fire', scoresPoint: true, statKey: 'spikes' },
                { key: 'BLOCKING_POINT', label: '블로킹', icon: 'shield', scoresPoint: true, statKey: 'blocks' },
                { key: 'DIRECT_SUCCESS', label: '다이렉트', scoresPoint: true, statKey: 'directs' },
            ],
        },
        {
            id: 'defense',
            label: '수비',
            buttons: [
                { key: 'DIG_SUCCESS', label: '디그', icon: 'shield', scoresPoint: false, statKey: 'digs' },
                { key: 'DEFENSE_FAULT', label: '수비 범실', scoresPoint: true, statKey: 'defenseFaults' },
            ],
        },
        {
            id: 'match',
            label: '경기 운영',
            buttons: [
                { key: 'SCORE', label: '수동 득점', scoresPoint: true, statKey: 'points' },
                { key: 'TIMEOUT', label: '타임아웃', icon: 'stopwatch', scoresPoint: false },
                { key: 'ADJUST_FAIR_PLAY', label: '페어플레이', scoresPoint: false, statKey: 'fairPlay' },
                { key: 'INCREMENT_3_HIT', label: '3단 플레이', scoresPoint: false, statKey: 'threeHitPlays' },
            ],
        },
    ],
    statDefinitions: [
        { key: 'points', label: '득점', scope: 'player', aggregation: 'sum' },
        { key: 'serviceAces', label: '서브 득점', scope: 'player', aggregation: 'sum' },
        { key: 'serviceFaults', label: '서브 범실', scope: 'player', aggregation: 'sum' },
        { key: 'serveIn', label: '서브 인', scope: 'player', aggregation: 'sum' },
        { key: 'spikes', label: '스파이크', scope: 'player', aggregation: 'sum' },
        { key: 'blocks', label: '블로킹', scope: 'player', aggregation: 'sum' },
        { key: 'directs', label: '다이렉트', scope: 'player', aggregation: 'sum' },
        { key: 'digs', label: '디그', scope: 'player', aggregation: 'sum' },
        { key: 'defenseFaults', label: '수비 범실', scope: 'player', aggregation: 'sum' },
        { key: 'assists', label: '어시스트', scope: 'player', aggregation: 'sum' },
        { key: 'fairPlay', label: '페어플레이', scope: 'team', aggregation: 'sum' },
        { key: 'threeHitPlays', label: '3단 플레이', scope: 'team', aggregation: 'sum' },
        { key: 'timeouts', label: '타임아웃', scope: 'team', aggregation: 'count' },
    ],
    winCondition: {
        targetScore: 11,
        sets: 3,
        deuce: true,
        mustWinBy: 2,
        courtChange: true,
    },
    optionalFeatures: {
        heatmap: true,
        tacticalBoard: true,
        libero: true,
        serveOrder: true,
    },
};
