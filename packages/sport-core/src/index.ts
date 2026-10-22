/** 기록은 event.type 과 playerId 로만 연결한다. 문장을 파싱하는 함수는 두지 않는다. */
export interface SportEventRef {
    type: string;
    playerId: string | null;
}

export interface ScoreButton {
    key: string;
    label: string;
    icon?: string;
    scoresPoint: boolean;
    statKey?: string;
}

export interface ScoreButtonGroup {
    id: string;
    label: string;
    buttons: ScoreButton[];
}

export interface StatDefinition {
    key: string;
    label: string;
    scope: 'player' | 'team';
    aggregation: 'sum' | 'count';
}

export interface WinCondition {
    targetScore: number;
    sets: number;
    deuce: boolean;
    mustWinBy: number;
    courtChange: boolean;
}

export interface OptionalFeatures {
    heatmap: boolean;
    tacticalBoard: boolean;
    libero: boolean;
    serveOrder: boolean;
}

export interface SportDefinition {
    id: string;
    name: string;
    teamSize: number;
    rolesForNonPlayers: { key: string; label: string }[];
    scoreButtons: ScoreButtonGroup[];
    statDefinitions: StatDefinition[];
    winCondition: WinCondition;
    optionalFeatures: OptionalFeatures;
}
