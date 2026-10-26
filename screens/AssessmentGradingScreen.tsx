import React, { useEffect, useMemo, useState } from 'react';
import localforage from 'localforage';
import { useData } from '../contexts/DataContext';
import type { MatchState, Player, PlayerStats, TeamSet } from '../types';
import { RetroactiveHustleModal } from '../components/RetroactiveHustleModal';
import { applyRetroactiveHustle, collectAssessmentHustlePlayerIds, collectHustlePlayerIds } from '../utils/hustleAssignment';
import {
    INDIVIDUAL_RUBRIC,
    OFFICIAL_INDEX_SCALE,
    PORTFOLIO_RUBRIC,
    ROLE_RUBRIC,
    TEAM_RUBRIC,
    applyFieldLocks,
    applyGradeLocks,
    buildStandings,
    combinedRoleCount,
    defaultAssessmentConfig,
    describeIndividualBand,
    duplicateRoleKeys,
    expectedGamesPerTeam,
    matchesOfficialConfig,
    emptyStudentEdits,
    extractMatchTotals,
    gradingMatchKey,
    indexScopeLabel,
    individualDistribution,
    isMatchIncluded,
    meetsHalfParticipation,
    mergeConfig,
    rubricLabel,
    personalEvaluation,
    teamPointsForStudent,
    withGradeEdit,
    withoutGradeLock,
    type AssessmentGradeBackup,
    type AssessmentGradingConfig,
    type ClassGradebook,
    type GradeField,
    type IndexStats,
    type ScoreBand,
    type StudentGradeEdits,
} from '../utils/assessmentGrading';

const STORAGE_KEY = 'class_jct_volleyball_assessment_gradebook';

const FIELD_LABEL: Record<GradeField, string> = {
    portfolio: '포트폴리오',
    team: '팀 평가',
    individual: '개인 평가',
    role: '역할 점수',
    roleCount: '역할 횟수',
};

type StoredMatch = MatchState & { date: string; time?: number };

const identityOf = (player: Player) => `${player.class}-${player.studentNumber}-${player.originalName}`;

const teamKeyOf = (setId: string, teamName: string) => `${setId}___${teamName}`;

const setIdFromKey = (key?: string) => (key ? key.split('___')[0] : '');

const normalizeStore = (raw: unknown): AssessmentGradeBackup => {
    const booksIn = raw && typeof raw === 'object' && 'books' in raw ? (raw as { books?: unknown }).books : null;
    const books: Record<string, ClassGradebook> = {};
    if (booksIn && typeof booksIn === 'object') {
        Object.entries(booksIn as Record<string, ClassGradebook>).forEach(([id, book]) => {
            if (!book || typeof book !== 'object') return;
            books[id] = {
                setId: book.setId || id,
                config: mergeConfig(book.config),
                inclusion: book.inclusion ?? {},
                students: book.students ?? {},
            };
        });
    }
    return { version: 1, exportedAt: '', books };
};

const blankStats = (): IndexStats => ({
    points: 0, serviceAces: 0, spikeSuccesses: 0, blockingPoints: 0, digs: 0, serveIn: 0, assists: 0, hustles: 0,
});

const playerAppears = (match: MatchState, ids: Set<string>): boolean => {
    const sides = [match.teamA, match.teamB];
    for (const team of sides) {
        if (!team) continue;
        if (team.playerStats && Object.keys(team.playerStats).some(id => ids.has(id))) return true;
        if (team.players && Object.keys(team.players).some(id => ids.has(id))) return true;
        if ([...(team.onCourtPlayerIds ?? []), ...(team.benchPlayerIds ?? [])].some(id => ids.has(id))) return true;
    }
    return collectHustlePlayerIds(match).some(id => ids.has(id));
};

const downloadText = (filename: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const csvCell = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
};

const formatRatio = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : '실점 0');

const maxScore = (values: number[]) => values.reduce((best, value) => Math.max(best, value), 0);

const sourceLabel = (source: string) => {
    if (source === 'excellence') return '우수';
    if (source === 'effort') return '노력';
    if (source === 'tie') return '동점';
    return '미참여';
};

export default function AssessmentGradingScreen({ onBack }: { onBack: () => void }) {
    const {
        teamSets, matchHistory, practiceMatchHistory, leagueMatchHistory,
        saveMatchHistory, savePracticeMatchHistory, saveLeagueMatchHistory,
        showToast, requestPassword, p2p,
    } = useData();
    const [store, setStore] = useState<AssessmentGradeBackup>({ version: 1, exportedAt: '', books: {} });
    const [ready, setReady] = useState(false);
    const [setId, setSetId] = useState('');
    const [historyKey, setHistoryKey] = useState<string | null>(null);
    const [editMatch, setEditMatch] = useState<{ storageId: string; match: MatchState } | null>(null);
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [explainField, setExplainField] = useState<GradeField | null>(null);
    const [teamFilter, setTeamFilter] = useState('ALL');
    const [nameQuery, setNameQuery] = useState('');
    const [editedOnly, setEditedOnly] = useState(false);
    const [warningOnly, setWarningOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'number' | 'total'>('number');
    const [bulkTeam, setBulkTeam] = useState('ALL');
    const [sections, setSections] = useState({ criteria: false, matches: true, standings: true, students: true });
    const isStudentViewer = p2p.isConnected && !p2p.isHost;

    useEffect(() => {
        let cancelled = false;
        localforage.getItem(STORAGE_KEY).then(raw => {
            if (cancelled) return;
            setStore(normalizeStore(raw));
            setReady(true);
        }).catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!ready) return;
        localforage.setItem(STORAGE_KEY, store).catch(() => undefined);
    }, [store, ready]);

    useEffect(() => {
        if (!setId && teamSets.length > 0) setSetId(teamSets[0].id);
    }, [setId, teamSets]);

    const selectedSet = teamSets.find(set => set.id === setId) ?? null;
    const book = useMemo<ClassGradebook>(() => {
        const existing = store.books[setId];
        if (existing) return { ...existing, config: mergeConfig(existing.config), inclusion: existing.inclusion ?? {}, students: existing.students ?? {} };
        return { setId, config: defaultAssessmentConfig(), inclusion: {}, students: {} };
    }, [store, setId]);
    const config = book.config;
    const teamCount = selectedSet?.teamCount ?? selectedSet?.teams.length ?? 0;
    const expectedPerTeam = expectedGamesPerTeam(config.expectedTeamMatchCount, teamCount);

    const updateBook = (next: ClassGradebook) => {
        setStore(prev => ({ ...prev, books: { ...prev.books, [next.setId]: next } }));
    };

    const listedMatches = useMemo(() => {
        if (!selectedSet) return [];
        const sources: { kind: 'class' | 'practice' | 'league'; list: StoredMatch[] }[] = [
            { kind: 'class', list: matchHistory ?? [] },
            { kind: 'practice', list: practiceMatchHistory ?? [] },
            { kind: 'league', list: leagueMatchHistory ?? [] },
        ];
        const rows = sources.flatMap(source => source.list.map((raw, index) => ({ raw, index, kind: source.kind })))
            .filter(({ raw }) => raw?.status === 'completed')
            .filter(({ raw }) => setIdFromKey(raw.teamA?.key) === selectedSet.id || setIdFromKey(raw.teamB?.key) === selectedSet.id)
            .map(({ raw, index, kind }) => {
                const storageId = `${kind === 'class' ? 'history' : kind}-${index}`;
                const key = gradingMatchKey(raw);
                const totals = extractMatchTotals(raw);
                const assessment = raw.isAssessment === true;
                return {
                    storageId,
                    kind,
                    index,
                    raw,
                    key,
                    isAssessment: assessment,
                    included: isMatchIncluded(assessment, book.inclusion[key]),
                    totals,
                    dateLabel: raw.date ? new Date(raw.date).toLocaleString('ko-KR') : '',
                };
            });
        return rows.sort((left, right) => new Date(right.raw.date).getTime() - new Date(left.raw.date).getTime());
    }, [selectedSet, matchHistory, practiceMatchHistory, leagueMatchHistory, book.inclusion]);

    const standings = useMemo(() => {
        if (!selectedSet) return [];
        const teams = selectedSet.teams.map(team => ({ key: teamKeyOf(selectedSet.id, team.teamName), name: team.teamName }));
        const matches = listedMatches.filter(match => match.included).map(match => ({
            teamAKey: match.raw.teamA.key || match.raw.teamA.name,
            teamBKey: match.raw.teamB.key || match.raw.teamB.name,
            rallyA: match.totals.rallyA,
            rallyB: match.totals.rallyB,
            sumA: match.totals.sumA,
            sumB: match.totals.sumB,
            setsA: match.totals.setsA,
            setsB: match.totals.setsB,
        }));
        return buildStandings(teams, matches, {
            basis: config.ratioBasis,
            winPoints: config.winPoints,
            drawPoints: config.drawPoints,
            lossPoints: config.lossPoints,
        });
    }, [selectedSet, listedMatches, config.ratioBasis, config.winPoints, config.drawPoints, config.lossPoints]);

    const students = useMemo(() => {
        if (!selectedSet) return [];
        const aliases = new Map<string, string[]>();
        teamSets.forEach(set => {
            Object.values(set.players ?? {}).forEach(player => {
                if (!player) return;
                const key = identityOf(player);
                const list = aliases.get(key) ?? [];
                if (!list.includes(player.id)) list.push(player.id);
                aliases.set(key, list);
            });
        });
        const completed = [
            ...(matchHistory ?? []),
            ...(practiceMatchHistory ?? []),
            ...(leagueMatchHistory ?? []),
        ].filter(match => match?.status === 'completed');
        const scoped = config.indexScope === 'assessment' ? completed.filter(match => match.isAssessment === true) : completed;
        const included = listedMatches.filter(match => match.included);

        const groups = new Map<string, Player[]>();
        Object.values(selectedSet.players ?? {}).forEach(player => {
            if (!player) return;
            const key = identityOf(player);
            const list = groups.get(key) ?? [];
            list.push(player);
            groups.set(key, list);
        });

        return [...groups.entries()].map(([key, people]) => {
            const ids = new Set(aliases.get(key) ?? people.map(player => player.id));
            const primary = [...people].sort((left, right) => parseInt(left.studentNumber || '0', 10) - parseInt(right.studentNumber || '0', 10))[0];
            const perId = new Map<string, IndexStats>();
            ids.forEach(id => perId.set(id, blankStats()));
            scoped.forEach(match => {
                const hustles = new Set(collectAssessmentHustlePlayerIds(match));
                [match.teamA, match.teamB].forEach(team => {
                    Object.entries(team?.playerStats ?? {}).forEach(([id, rawStat]) => {
                        const stat = rawStat as PlayerStats;
                        if (!ids.has(id) || !stat) return;
                        const current = perId.get(id) ?? blankStats();
                        current.points += Number(stat.points) || 0;
                        current.serviceAces += Number(stat.serviceAces) || 0;
                        current.spikeSuccesses += Number(stat.spikeSuccesses) || 0;
                        current.blockingPoints += Number(stat.blockingPoints) || 0;
                        current.digs += Number(stat.digs) || 0;
                        current.serveIn += Number(stat.serveIn) || 0;
                        current.assists += Number(stat.assists) || 0;
                        perId.set(id, current);
                    });
                });
                ids.forEach(id => {
                    if (!hustles.has(id)) return;
                    const current = perId.get(id) ?? blankStats();
                    current.hustles += 1;
                    perId.set(id, current);
                });
            });
            const summed = blankStats();
            perId.forEach(stat => {
                summed.points += stat.points;
                summed.serviceAces += stat.serviceAces;
                summed.spikeSuccesses += stat.spikeSuccesses;
                summed.blockingPoints += stat.blockingPoints;
                summed.digs += stat.digs;
                summed.serveIn += stat.serveIn;
                summed.assists += stat.assists;
            });
            summed.hustles = Math.max(0, ...[...ids].map(id => perId.get(id)?.hustles ?? 0));
            const participated = scoped.some(match => playerAppears(match, ids));

            const roster = selectedSet.teams.filter(team => people.some(player => team.playerIds.includes(player.id)));
            const appearances = roster.map(team => {
                const teamKey = teamKeyOf(selectedSet.id, team.teamName);
                const teamMatches = included.filter(match => match.raw.teamA.key === teamKey || match.raw.teamB.key === teamKey);
                const played = teamMatches.filter(match => playerAppears(match.raw, ids)).length;
                return { team, teamKey, teamMatches: teamMatches.length, played };
            }).sort((left, right) => right.played - left.played);
            const chosen = appearances[0];
            const standing = chosen ? standings.find(row => row.key === chosen.teamKey) : undefined;
            const teamComputed = teamPointsForStudent({
                played: chosen?.played ?? 0,
                teamMatches: chosen?.teamMatches ?? 0,
                rank: standing?.rank ?? null,
                config,
            });
            const personal = personalEvaluation(participated, summed, config);
            const roleEntries = people.flatMap(player => player.roleHistory ?? []);
            const gamesPlayed = chosen?.played ?? 0;
            const roleDuties = roleEntries.length;
            const roleCount = combinedRoleCount(roleDuties, gamesPlayed);
            const edits = book.students[key] ?? emptyStudentEdits();
            const displayed = applyGradeLocks({
                team: teamComputed,
                individual: personal.score,
                roleCount,
            }, edits.locks, config);
            const numbers = [displayed.portfolio, displayed.team, displayed.individual, displayed.role];
            const total = numbers.every(value => typeof value === 'number') ? numbers.reduce((sum, value) => sum + (value as number), 0) : null;
            const resultDiffers = chosen
                ? included.some(match => (match.raw.teamA.key === chosen.teamKey || match.raw.teamB.key === chosen.teamKey) && match.totals.differs)
                : false;
            return {
                key,
                player: primary,
                otherTeams: appearances.slice(1).map(item => item.team.teamName),
                teamName: chosen?.team.teamName ?? '',
                played: chosen?.played ?? 0,
                teamMatches: chosen?.teamMatches ?? 0,
                rank: standing?.rank ?? null,
                teamComputed,
                personal,
                roleEntries,
                roleDuties,
                gamesPlayed,
                duplicateRoles: duplicateRoleKeys(roleEntries),
                edits,
                displayed,
                total,
                resultDiffers,
                stats: summed,
                participated,
            };
        }).sort((left, right) => parseInt(left.player.studentNumber || '0', 10) - parseInt(right.player.studentNumber || '0', 10));
    }, [selectedSet, teamSets, matchHistory, practiceMatchHistory, leagueMatchHistory, listedMatches, standings, config, book.students]);

    const distribution = useMemo(
        () => individualDistribution(students.map(student => ({ participated: student.participated, stats: student.stats })), config),
        [students, config],
    );
    const differedCount = listedMatches.filter(match => match.included && match.totals.differs).length;
    const includedCount = listedMatches.filter(match => match.included).length;
    const noGradingMatches = includedCount === 0;

    const visibleStudents = useMemo(() => {
        const query = nameQuery.trim();
        const rows = students.filter(student => {
            if (teamFilter !== 'ALL' && student.teamName !== teamFilter) return false;
            if (query && !student.player.originalName.includes(query) && !String(student.player.studentNumber).includes(query)) return false;
            const edited = Object.values(student.displayed.locked).some(Boolean);
            const warned = student.resultDiffers || student.duplicateRoles.length > 0;
            if (editedOnly && !edited) return false;
            if (warningOnly && !warned) return false;
            return true;
        });
        if (sortBy === 'total') {
            return [...rows].sort((left, right) => (right.total ?? -1) - (left.total ?? -1));
        }
        return rows;
    }, [students, teamFilter, nameQuery, editedOnly, warningOnly, sortBy]);

    const rankBars = useMemo(() => {
        const counts = new Map<string, number>();
        students.forEach(student => {
            const found = config.rankPoints.find(item => item.rank === student.rank);
            const label = found ? String(found.score) : '없음';
            counts.set(label, (counts.get(label) ?? 0) + 1);
        });
        return [...counts.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((left, right) => (Number(right.label) || -1) - (Number(left.label) || -1));
    }, [students, config.rankPoints]);

    const roleBars = useMemo(() => {
        const counts = new Map<number, number>();
        students.forEach(student => {
            const score = applyGradeLocks({ team: null, individual: 0, roleCount: combinedRoleCount(student.roleDuties, student.gamesPlayed) }, {}, config).role;
            counts.set(score, (counts.get(score) ?? 0) + 1);
        });
        return [...counts.entries()]
            .map(([score, count]) => ({ label: String(score), count }))
            .sort((left, right) => Number(right.label) - Number(left.label));
    }, [students, config]);

    const warnings = useMemo(() => {
        const items: { id: string; label: string; section: 'matches' | 'standings' | 'students'; target: string; studentKey?: string }[] = [];
        standings.filter(row => row.played !== expectedPerTeam).forEach(row => {
            items.push({
                id: `count-${row.key}`,
                label: `${row.name} 경기 수 ${row.played}경기 (기준 팀당 ${expectedPerTeam}경기 · 전체 ${config.expectedTeamMatchCount}경기)`,
                section: 'standings',
                target: `standing-${row.key}`,
            });
        });
        listedMatches.filter(match => match.included && match.totals.differs).forEach(match => {
            items.push({
                id: `diff-${match.storageId}`,
                label: `결과 달라짐 · ${match.raw.teamA.name} 대 ${match.raw.teamB.name}`,
                section: 'matches',
                target: `match-${match.storageId}`,
            });
        });
        students.filter(student => student.duplicateRoles.length > 0).forEach(student => {
            items.push({
                id: `role-${student.key}`,
                label: `역할 중복 · ${student.player.originalName} ${student.duplicateRoles.length}묶음`,
                section: 'students',
                target: `student-${student.key}`,
                studentKey: student.key,
            });
        });
        return items;
    }, [standings, expectedPerTeam, config.expectedTeamMatchCount, listedMatches, students]);

    const criteriaSummary = `팀 ${maxScore(config.rankPoints.map(item => item.score))}·개인 ${maxScore(config.individualBands.map(item => item.score))}·역할 ${maxScore(config.roleBands.map(item => item.score))}·포트폴리오 ${maxScore(config.portfolioOptions)} / 개인 지수: ${config.indexScope === 'assessment' ? '수행평가 경기만' : '누적'} ×${config.indexScale} / 득실율: ${config.ratioBasis === 'rally' ? '랠리 점수' : '합계'}`;

    const reveal = (section: 'criteria' | 'matches' | 'standings' | 'students', targetId: string, studentKey?: string) => {
        setSections(prev => ({ ...prev, [section]: true }));
        if (studentKey) {
            setExpandedKey(studentKey);
            setHistoryKey(null);
        }
        window.setTimeout(() => {
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 40);
    };

    const official = matchesOfficialConfig(config);

    const applyOfficialRubric = () => {
        if (!window.confirm('2026학년도 체육과 2학기 배구 평가표 기준으로 채점 구간, 합계 승패(게임 포인트+3단 플레이+페어플레이), 지수 배율 2.5를 넣습니다. 학생별 수정 잠금은 그대로입니다.')) return;
        updateBook({ ...book, config: defaultAssessmentConfig() });
        showToast('2026 공식 채점표를 적용했습니다.', 'success');
        setSections(prev => ({ ...prev, criteria: true }));
    };

    const applyPortfolioBulk = () => {
        const targets = students.filter(student => bulkTeam === 'ALL' || student.teamName === bulkTeam);
        if (targets.length === 0) {
            showToast('점수를 넣을 학생이 없습니다.', 'error');
            return;
        }
        const scope = bulkTeam === 'ALL' ? '전체 학생' : `${bulkTeam} 학생`;
        if (!window.confirm(`${scope} ${targets.length}명의 포트폴리오를 10점으로 넣습니다. 이미 10점인 칸은 그대로 둡니다.`)) return;
        updateBook({
            ...book,
            students: applyFieldLocks(
                book.students,
                targets.map(student => ({ key: student.key, field: 'portfolio' as const, from: student.displayed.portfolio, to: 10 })),
                new Date().toISOString(),
            ),
        });
    };

    const teamColor = (name: string) => selectedSet?.teams.find(team => team.teamName === name)?.color || '#64748b';

    const openExplain = (studentKey: string, field: GradeField) => {
        setExpandedKey(studentKey);
        setExplainField(field);
        setEditingCell(null);
    };

    const commit = (studentKey: string, field: GradeField, from: number | null, to: number | null) => {
        if (from === to) return;
        const current = book.students[studentKey] ?? emptyStudentEdits();
        updateBook({
            ...book,
            students: {
                ...book.students,
                [studentKey]: withGradeEdit(current, field, from, to, new Date().toISOString()),
            },
        });
    };

    const unlock = (studentKey: string, field: GradeField, from: number | null) => {
        const current = book.students[studentKey] ?? emptyStudentEdits();
        updateBook({
            ...book,
            students: {
                ...book.students,
                [studentKey]: withoutGradeLock(current, field, from, new Date().toISOString()),
            },
        });
    };

    const patchConfig = (patch: Partial<AssessmentGradingConfig>) => {
        updateBook({ ...book, config: mergeConfig({ ...config, ...patch }) });
    };

    const toggleMatch = (key: string, assessment: boolean, checked: boolean) => {
        const inclusion = { ...book.inclusion };
        if (checked === assessment) delete inclusion[key];
        else inclusion[key] = checked;
        updateBook({ ...book, inclusion });
    };

    const saveTypeChange = async (playerIds: string[], change: { markAsAssessment: boolean; revertToRegular: boolean }) => {
        if (!editMatch || isStudentViewer) return;
        const located = listedMatches.find(match => match.storageId === editMatch.storageId);
        if (!located) {
            showToast('이 경기 기록을 찾지 못했습니다.', 'error');
            return;
        }
        const next = applyRetroactiveHustle(located.raw, playerIds, change);
        if (!next) {
            showToast('명단과 기존 허슬 선택에 있는 학생만 지정할 수 있습니다.', 'error');
            return;
        }
        const source = located.kind === 'class' ? matchHistory : located.kind === 'practice' ? practiceMatchHistory : leagueMatchHistory;
        const list = [...source];
        list[located.index] = next;
        const message = '경기 유형과 허슬 플레이어를 저장했습니다.';
        if (located.kind === 'class') await saveMatchHistory(list, message);
        else if (located.kind === 'practice') await savePracticeMatchHistory(list, message);
        else await saveLeagueMatchHistory(list, message);
        setEditMatch(null);
    };

    const exportCsv = () => {
        if (!selectedSet) return;
        const headers = ['학번', '이름', '팀', '팀순위', '참여경기', '팀경기수', '포트폴리오', '팀평가', '개인평가', '우수지수', '노력지수', '반영지수', '반영부문', '역할횟수', '역할점수', '역할중복', '총점', '수정항목'];
        const lines = [headers.join(',')];
        students.forEach(student => {
            const locked = (Object.entries(student.displayed.locked) as [GradeField, boolean][])
                .filter(([, value]) => value)
                .map(([field]) => FIELD_LABEL[field])
                .join(' ');
            lines.push([
                student.player.studentNumber,
                student.player.originalName,
                student.teamName,
                student.rank ?? '',
                student.played,
                student.teamMatches,
                student.displayed.portfolio ?? '',
                student.displayed.team ?? '',
                student.displayed.individual,
                student.personal.excellence,
                student.personal.effort,
                student.personal.chosen,
                sourceLabel(student.personal.source),
                student.displayed.roleCount,
                student.displayed.role,
                student.duplicateRoles.length > 0 ? '예' : '',
                student.total ?? '',
                locked,
            ].map(csvCell).join(','));
        });
        downloadText(`수행평가채점_${selectedSet.className}.csv`, `\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8');
    };

    const exportJson = () => {
        const books = { ...store.books };
        if (setId) books[setId] = book;
        const payload: AssessmentGradeBackup = { version: 1, exportedAt: new Date().toISOString(), books };
        downloadText(`수행평가채점_백업_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
    };

    const importJson = async (file: File) => {
        try {
            const raw = JSON.parse(await file.text()) as { version?: number; books?: unknown };
            if (raw?.version !== 1 || !raw.books || typeof raw.books !== 'object') {
                showToast('채점 백업 형식이 아닙니다.', 'error');
                return;
            }
            const parsed = normalizeStore(raw);
            if (!window.confirm('불러오면 같은 팀 세트의 채점 설정, 성적부, 수정 이력을 파일 내용으로 바꿉니다.')) return;
            setStore(prev => ({ version: 1, exportedAt: new Date().toISOString(), books: { ...prev.books, ...parsed.books } }));
            showToast('채점 백업을 불러왔습니다.', 'success');
        } catch {
            showToast('백업 파일을 읽지 못했습니다.', 'error');
        }
    };

    if (isStudentViewer) {
        return (
            <div className="w-full p-4 text-sm text-slate-200">
                <p>학생 참여 화면에서는 수행평가 채점을 열 수 없습니다.</p>
            </div>
        );
    }

    const toggleSection = (key: 'criteria' | 'matches' | 'standings' | 'students') => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="w-full max-w-full text-sm text-slate-200 animate-fade-in space-y-4 overflow-x-hidden">
            <div className="sticky top-0 z-30 -mx-1 px-1 py-2 bg-slate-950/95 backdrop-blur border-b border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={onBack} className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 text-xl shrink-0" aria-label="뒤로">←</button>
                    <h1 className="text-lg font-bold text-slate-100 shrink-0">수행평가 채점</h1>
                    <select
                        value={setId}
                        onChange={event => { setSetId(event.target.value); setTeamFilter('ALL'); setBulkTeam('ALL'); }}
                        aria-label="반 · 팀 세트"
                        className="min-w-0 flex-1 max-w-md bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                        {teamSets.map(set => (
                            <option key={set.id} value={set.id}>{setLabel(set)}</option>
                        ))}
                    </select>
                    <span className="shrink-0 rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200">채점 {includedCount}경기</span>
                    <span className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${warnings.length > 0 ? 'border-amber-500/60 bg-amber-950/50 text-amber-200' : 'border-slate-600 bg-slate-800 text-slate-300'}`}>
                        경고 {warnings.length}
                    </span>
                    {official ? (
                        <span className="shrink-0 rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-200">2026 공식 채점표</span>
                    ) : (
                        <button type="button" onClick={applyOfficialRubric} className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-2 rounded-lg text-sm">
                            2026 채점표 적용
                        </button>
                    )}
                    <button type="button" onClick={exportCsv} className="shrink-0 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-2 rounded-lg text-sm">CSV</button>
                    <button type="button" onClick={exportJson} className="shrink-0 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-2 rounded-lg text-sm">JSON 백업</button>
                    <label className="shrink-0 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3 py-2 rounded-lg text-sm cursor-pointer">
                        JSON 불러오기
                        <input type="file" accept="application/json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importJson(file); event.target.value = ''; }} />
                    </label>
                </div>
            </div>

            {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-950/40 px-4 py-3 space-y-1" role="status">
                    {warnings.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => reveal(item.section, item.target, item.studentKey)}
                            className="block w-full text-left text-sm font-semibold text-amber-100 hover:text-amber-50 underline-offset-2 hover:underline"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            <section id="section-criteria" className="scroll-mt-28 rounded-lg border border-slate-700 bg-slate-900/60">
                <button type="button" onClick={() => toggleSection('criteria')} aria-expanded={sections.criteria} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <span className="text-slate-400" aria-hidden>{sections.criteria ? '▾' : '▸'}</span>
                    <span className="font-semibold text-base text-slate-100 shrink-0">채점 기준</span>
                    {!sections.criteria && <span className="text-sm text-slate-400 truncate">{criteriaSummary}</span>}
                </button>
                {sections.criteria && (
                    <div className="px-4 pb-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm text-slate-300">{criteriaSummary}</p>
                            {official ? (
                                <span className="text-sm text-slate-400">2026 공식 채점표와 같습니다.</span>
                            ) : (
                                <button type="button" onClick={applyOfficialRubric} className="text-sm font-semibold text-amber-200 underline">2026 공식 채점표 적용</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <RubricCard title={`데이터 기반 포트폴리오 (10)`} rows={PORTFOLIO_RUBRIC} />
                            <RubricCard title={`팀 평가 (30)`} rows={TEAM_RUBRIC} note="모둠원에게 같은 점수를 주고, 승패는 게임 포인트+3단 플레이+페어플레이 합계로 정합니다. 승 3·무 1·패 0점이며 동률이면 득실율→세트 득실→승자승입니다." />
                            <RubricCard title={`리그전 개인 평가 (10)`} rows={INDIVIDUAL_RUBRIC} note={`우수 지수 또는 노력 지수 중 높은 쪽에 구간을 적용합니다. 랭킹 보드와 같은 배율 ×${OFFICIAL_INDEX_SCALE}을 곱합니다.`} />
                            <RubricCard title={`역할 수행 (10)`} rows={ROLE_RUBRIC} note="기록관·주심·선심·아나운서·카메라감독 횟수와 선수로 뛴 경기를 합산합니다." />
                        </div>
                        <p className="text-sm text-slate-400">전입으로 성적 산출 근거가 없는 경우는 학업성적관리 규정에 따릅니다. 이 점수는 관찰 기록을 바탕으로 최종 협의하여 부여합니다.</p>
                        <p className="text-sm text-slate-400">개인 지수 범위: {indexScopeLabel(config.indexScope)}. 팀 순위와 참여 횟수는 체크된 채점 경기만 사용합니다. 누적은 완료 경기 전체를, 수행평가 경기만은 수행평가로 표시된 경기만 읽습니다.</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-3 text-sm text-slate-200">
                            <label className="inline-flex items-center">승점 <NumberBox value={config.winPoints} onCommit={value => patchConfig({ winPoints: value })} /></label>
                            <label className="inline-flex items-center">무승부 <NumberBox value={config.drawPoints} onCommit={value => patchConfig({ drawPoints: value })} /></label>
                            <label className="inline-flex items-center">패점 <NumberBox value={config.lossPoints} onCommit={value => patchConfig({ lossPoints: value })} /></label>
                            <label className="inline-flex items-center">참여 미달 <NumberBox value={config.teamPartialScore} onCommit={value => patchConfig({ teamPartialScore: value })} /></label>
                            <label className="inline-flex items-center">팀 미참여 <NumberBox value={config.teamAbsentScore} onCommit={value => patchConfig({ teamAbsentScore: value })} /></label>
                            <label className="inline-flex items-center">전체 경기 수 <NumberBox value={config.expectedTeamMatchCount} onCommit={value => patchConfig({ expectedTeamMatchCount: value })} /></label>
                            <span className="text-sm text-slate-400">팀당 {expectedPerTeam}경기{teamCount > 0 ? ` (${teamCount}팀)` : ''}</span>
                        </div>
                        <fieldset className="space-y-1 text-sm">
                            <legend className="font-semibold text-slate-100">점수 득실율</legend>
                            <label className="mr-4"><input type="radio" checked={config.ratioBasis === 'rally'} onChange={() => patchConfig({ ratioBasis: 'rally' })} /> 랠리 점수 기준</label>
                            <label><input type="radio" checked={config.ratioBasis === 'sum'} onChange={() => patchConfig({ ratioBasis: 'sum' })} /> 합계 기준</label>
                        </fieldset>
                        <fieldset className="space-y-1 text-sm">
                            <legend className="font-semibold text-slate-100">개인 지수에 넣을 경기</legend>
                            <label className="mr-4"><input type="radio" checked={config.indexScope === 'cumulative'} onChange={() => patchConfig({ indexScope: 'cumulative' })} /> 랭킹 보드와 동일(누적)</label>
                            <label><input type="radio" checked={config.indexScope === 'assessment'} onChange={() => patchConfig({ indexScope: 'assessment' })} /> 수행평가 경기만</label>
                        </fieldset>
                        <label className="inline-flex items-center text-sm text-slate-200">지수 배율 <NumberBox value={config.indexScale} step="0.1" onCommit={value => patchConfig({ indexScale: value })} /></label>
                        <p className="text-sm text-slate-400">우수 지수와 노력 지수에 같은 배율을 곱한 뒤 높은 쪽에 개인 평가 구간을 적용합니다. 랭킹 보드 산식과 표시는 그대로입니다.</p>
                        <BandEditor
                            title="팀 순위 점수"
                            rows={config.rankPoints.map(item => ({ minInclusive: item.rank, score: item.score }))}
                            minLabel="위"
                            bars={rankBars}
                            onChange={rows => patchConfig({ rankPoints: rows.map(row => ({ rank: row.minInclusive, score: row.score })) })}
                            onAdd={() => {
                                const nextRank = Math.max(0, ...config.rankPoints.map(item => item.rank)) + 1;
                                patchConfig({ rankPoints: [...config.rankPoints, { rank: nextRank, score: Math.max(0, 30 - (nextRank - 1) * 2) }] });
                            }}
                        />
                        <BandEditor
                            title="개인 평가 구간 (이상)"
                            rows={config.individualBands}
                            minLabel="점 이상"
                            bars={distribution.map(item => ({ label: String(item.score), count: item.count }))}
                            onChange={rows => patchConfig({ individualBands: rows })}
                            onAdd={() => patchConfig({ individualBands: [...config.individualBands, { minInclusive: 0, score: config.individualFallbackScore }] })}
                        />
                        <p className="text-sm text-slate-400">개인 분포는 계산값입니다. 교사가 잠근 점수는 막대에 세지 않습니다. 구간을 바꾸면 바로 다시 셉니다.</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <label className="inline-flex items-center">구간 밖 참여자 <NumberBox value={config.individualFallbackScore} onCommit={value => patchConfig({ individualFallbackScore: value })} /></label>
                            <label className="inline-flex items-center">개인 미참여 <NumberBox value={config.individualAbsentScore} onCommit={value => patchConfig({ individualAbsentScore: value })} /></label>
                        </div>
                        <BandEditor
                            title="역할 횟수 구간 (이상)"
                            rows={config.roleBands}
                            minLabel="회 이상"
                            bars={roleBars}
                            onChange={rows => patchConfig({ roleBands: rows })}
                            onAdd={() => patchConfig({ roleBands: [...config.roleBands, { minInclusive: 0, score: 4 }] })}
                        />
                    </div>
                )}
            </section>
            <section id="section-matches" className="scroll-mt-28 rounded-lg border border-slate-700 bg-slate-900/60">
                <button type="button" onClick={() => toggleSection('matches')} aria-expanded={sections.matches} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <span className="text-slate-400" aria-hidden>{sections.matches ? '▾' : '▸'}</span>
                    <span className="font-semibold text-base text-slate-100 shrink-0">채점 경기</span>
                    {!sections.matches && <span className="text-sm text-slate-400 truncate">포함 {includedCount}경기{differedCount > 0 ? ` · 결과 달라짐 ${differedCount}` : ''}</span>}
                </button>
                {sections.matches && (
                    <div className="px-4 pb-4 space-y-3">
                        <p className="text-sm text-slate-400">수행평가 경기는 처음부터 포함되고, 일반 경기는 빠져 있습니다. 일반 경기를 체크해도 경기 유형은 바뀌지 않습니다.</p>
                        <div className="rounded-lg border border-slate-700 overflow-hidden">
                            <table className="w-full table-fixed text-sm text-slate-200">
                                <thead className="bg-slate-800 text-slate-300">
                                    <tr>
                                        <th className="p-2 w-14 text-left font-semibold">포함</th>
                                        <th className="p-2 w-36 text-left font-semibold">날짜</th>
                                        <th className="p-2 text-left font-semibold">경기</th>
                                        <th className="p-2 w-24 text-right font-semibold">유형</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listedMatches.map(match => {
                                        const outcome = match.totals.outcome === 'draw' ? '무승부' : match.totals.outcome === 'A' ? match.raw.teamA.name : match.raw.teamB.name;
                                        const recorded = match.raw.winner === 'A' ? match.raw.teamA.name : match.raw.winner === 'B' ? match.raw.teamB.name : '없음';
                                        return (
                                            <tr key={match.storageId} id={`match-${match.storageId}`} className="border-t border-slate-800 scroll-mt-28">
                                                <td className="p-2 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={match.included}
                                                        aria-label={`${match.raw.teamA.name} 대 ${match.raw.teamB.name} 채점 포함`}
                                                        onChange={event => toggleMatch(match.key, match.isAssessment, event.target.checked)}
                                                        className="h-4 w-4"
                                                    />
                                                </td>
                                                <td className="p-2 align-top break-words">{match.dateLabel}</td>
                                                <td className="p-2 align-top min-w-0">
                                                    <p className="break-words">{match.raw.teamA.name} {match.totals.sumA} : {match.totals.sumB} {match.raw.teamB.name}</p>
                                                    <p className="text-slate-400 mt-1">
                                                        게임 {match.totals.rallyA}:{match.totals.rallyB}
                                                        {' · '}3단 {match.raw.teamA.threeHitPlays ?? 0}:{match.raw.teamB.threeHitPlays ?? 0}
                                                        {' · '}페어 {match.raw.teamA.fairPlay ?? 0}:{match.raw.teamB.fairPlay ?? 0}
                                                    </p>
                                                    <p className="text-slate-400 mt-1">합계 승자 {outcome} · 기록 승자 {recorded}</p>
                                                    {match.included && match.totals.differs && <p className="text-rose-300 font-semibold mt-1">결과 달라짐</p>}
                                                </td>
                                                <td className="p-2 align-top text-right">
                                                    <span className="text-slate-300">{match.isAssessment ? '수행평가' : '일반'}</span>
                                                    <button
                                                        type="button"
                                                        className="mt-2 block ml-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold px-2 py-1.5 rounded-md"
                                                        onClick={() => requestPassword(() => setEditMatch({ storageId: match.storageId, match: match.raw }))}
                                                    >
                                                        유형 변경
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {listedMatches.length === 0 && (
                                        <tr><td colSpan={4} className="p-4 text-center text-slate-400">이 팀 세트의 끝난 경기가 없습니다.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <section id="section-standings" className="scroll-mt-28 rounded-lg border border-slate-700 bg-slate-900/60">
                <button type="button" onClick={() => toggleSection('standings')} aria-expanded={sections.standings} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <span className="text-slate-400" aria-hidden>{sections.standings ? '▾' : '▸'}</span>
                    <span className="font-semibold text-base text-slate-100 shrink-0">팀 순위</span>
                    {!sections.standings && <span className="text-sm text-slate-400 truncate">{standings.length}팀</span>}
                </button>
                {sections.standings && (
                    <div className="px-4 pb-4 space-y-2">
                        <p className="text-sm text-slate-400">승점은 합계(게임 포인트+3단 플레이+페어플레이) 승패로 줍니다. 동률이면 {config.ratioBasis === 'rally' ? '랠리 점수' : '합계'} 득실율 → 세트 득실 → 승자승입니다.</p>
                        <table className="w-full table-fixed text-sm text-slate-200">
                            <thead className="text-slate-300">
                                <tr>
                                    <th className="p-2 w-14 text-right font-semibold">순위</th>
                                    <th className="p-2 text-left font-semibold">팀</th>
                                    <th className="p-2 w-16 text-right font-semibold">경기</th>
                                    <th className="p-2 w-16 text-right font-semibold">승점</th>
                                    <th className="p-2 w-24 text-right font-semibold">승무패</th>
                                    <th className="p-2 w-20 text-right font-semibold">득실율</th>
                                    <th className="p-2 w-20 text-right font-semibold">세트</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map(row => (
                                    <tr key={row.key} id={`standing-${row.key}`} className="border-t border-slate-800 scroll-mt-28">
                                        <td className="p-2 text-right tabular-nums">{row.rank ?? '—'}</td>
                                        <td className="p-2">
                                            <span className="inline-flex items-center gap-2 min-w-0">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: teamColor(row.name) }} aria-hidden />
                                                <span className="truncate">{row.name}</span>
                                            </span>
                                            {row.played !== expectedPerTeam && <span className="block text-amber-200 font-semibold">경기 수 불일치</span>}
                                        </td>
                                        <td className="p-2 text-right tabular-nums">{row.played}</td>
                                        <td className="p-2 text-right tabular-nums">{row.points}</td>
                                        <td className="p-2 text-right tabular-nums">{row.win}-{row.draw}-{row.loss}</td>
                                        <td className="p-2 text-right tabular-nums">{formatRatio(row.pointRatio)}</td>
                                        <td className="p-2 text-right tabular-nums">{row.setsFor - row.setsAgainst}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section id="section-students" className="scroll-mt-28 rounded-lg border border-slate-700 bg-slate-900/60">
                <button type="button" onClick={() => toggleSection('students')} aria-expanded={sections.students} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <span className="text-slate-400" aria-hidden>{sections.students ? '▾' : '▸'}</span>
                    <span className="font-semibold text-base text-slate-100 shrink-0">학생 점수</span>
                    {!sections.students && <span className="text-sm text-slate-400 truncate">{visibleStudents.length}명</span>}
                </button>
                {sections.students && (
                    <div className="px-4 pb-4 space-y-3">
                        {noGradingMatches && (
                            <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-slate-200">
                                채점할 경기가 없습니다. 수행평가 경기를 완료하면 계산됩니다
                            </p>
                        )}
                        <div className="rounded-lg border border-slate-500 bg-slate-800/80 px-3 py-3 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-100">포트폴리오</span>
                            <span className="text-slate-400">교사가 넣는 유일한 점수입니다. 10점을 넣은 뒤 칸을 눌러 고칩니다.</span>
                            <select value={bulkTeam} onChange={event => setBulkTeam(event.target.value)} aria-label="포트폴리오 일괄 대상" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                                <option value="ALL">전체</option>
                                {(selectedSet?.teams ?? []).map(team => (
                                    <option key={team.teamName} value={team.teamName}>{team.teamName}</option>
                                ))}
                            </select>
                            <button type="button" onClick={applyPortfolioBulk} className="bg-slate-100 text-slate-900 font-semibold px-3 py-2 rounded-lg">10점 일괄 입력</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select value={teamFilter} onChange={event => setTeamFilter(event.target.value)} aria-label="팀 필터" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                                <option value="ALL">전체 팀</option>
                                {(selectedSet?.teams ?? []).map(team => (
                                    <option key={team.teamName} value={team.teamName}>{team.teamName}</option>
                                ))}
                            </select>
                            <input
                                value={nameQuery}
                                onChange={event => setNameQuery(event.target.value)}
                                placeholder="이름 검색"
                                aria-label="이름 검색"
                                className="min-w-0 w-40 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                            />
                            <label className="inline-flex items-center gap-2 px-2 py-2">
                                <input type="checkbox" checked={editedOnly} onChange={event => setEditedOnly(event.target.checked)} />
                                수정된 학생만
                            </label>
                            <label className="inline-flex items-center gap-2 px-2 py-2">
                                <input type="checkbox" checked={warningOnly} onChange={event => setWarningOnly(event.target.checked)} />
                                경고 있는 학생만
                            </label>
                            <select value={sortBy} onChange={event => setSortBy(event.target.value as 'number' | 'total')} aria-label="정렬" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                                <option value="number">학번순</option>
                                <option value="total">총점순</option>
                            </select>
                        </div>
                        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-700">
                            <table className="w-full table-fixed text-sm text-slate-200">
                                <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300">
                                    <tr>
                                        <th className="p-2 w-10" aria-label="근거" />
                                        <th className="p-2 w-[4.5rem] text-right font-semibold">학번</th>
                                        <th className="p-2 text-left font-semibold">이름</th>
                                        <th className="p-2 text-left font-semibold">팀</th>
                                        <th className="p-2 w-[6.5rem] text-right font-semibold">포트폴리오</th>
                                        <th className="p-2 w-[5.5rem] text-right font-semibold">팀 평가</th>
                                        <th className="p-2 w-[5.5rem] text-right font-semibold">개인 평가</th>
                                        <th className="p-2 w-[4.5rem] text-right font-semibold">역할</th>
                                        <th className="p-2 w-16 text-right font-semibold">총점</th>
                                        <th className="p-2 w-[7.5rem] text-left font-semibold">상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleStudents.map(student => {
                                        const edited = Object.values(student.displayed.locked).some(Boolean);
                                        const warned = student.resultDiffers || student.duplicateRoles.length > 0;
                                        const open = expandedKey === student.key;
                                        const roleComputed = applyGradeLocks({ team: null, individual: 0, roleCount: student.displayed.roleCount }, {}, config).role;
                                        const portfolioOptions = student.displayed.portfolio != null && !config.portfolioOptions.includes(student.displayed.portfolio)
                                            ? [...config.portfolioOptions, student.displayed.portfolio].sort((left, right) => right - left)
                                            : config.portfolioOptions;
                                        return (
                                            <React.Fragment key={student.key}>
                                                <tr id={`student-${student.key}`} className="border-t border-slate-800 scroll-mt-28">
                                                    <td className="px-2 py-3 align-middle">
                                                        <button type="button" onClick={() => { setExpandedKey(open ? null : student.key); setExplainField(null); }} aria-expanded={open} aria-label={`${student.player.originalName} 근거`} className="text-slate-300">
                                                            {open ? '▾' : '▸'}
                                                        </button>
                                                    </td>
                                                    <td className="px-2 py-3 text-right tabular-nums align-middle">{student.player.studentNumber}</td>
                                                    <td className="px-2 py-3 align-middle truncate">{student.player.originalName}</td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <span className="inline-flex items-center gap-2 min-w-0">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: teamColor(student.teamName) }} aria-hidden />
                                                            <span className="truncate">{student.teamName || '—'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <ScoreCell
                                                            active={editingCell === `${student.key}:portfolio`}
                                                            value={student.displayed.portfolio}
                                                            locked={student.displayed.locked.portfolio}
                                                            emphasize
                                                            options={portfolioOptions}
                                                            optionLabels={Object.fromEntries(PORTFOLIO_RUBRIC.map(row => [row.score, row.label]))}
                                                            onOpen={() => setEditingCell(`${student.key}:portfolio`)}
                                                            onExplain={() => openExplain(student.key, 'portfolio')}
                                                            onClose={() => setEditingCell(null)}
                                                            onCommit={value => commit(student.key, 'portfolio', student.displayed.portfolio, value)}
                                                            onUnlock={() => unlock(student.key, 'portfolio', student.displayed.portfolio)}
                                                            onHistory={() => { setExpandedKey(student.key); setHistoryKey(student.key); }}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <ScoreCell
                                                            active={editingCell === `${student.key}:team`}
                                                            value={noGradingMatches && !student.displayed.locked.team ? null : student.displayed.team}
                                                            dash={noGradingMatches && !student.displayed.locked.team}
                                                            locked={student.displayed.locked.team}
                                                            onOpen={() => setEditingCell(`${student.key}:team`)}
                                                            onExplain={() => openExplain(student.key, 'team')}
                                                            onClose={() => setEditingCell(null)}
                                                            onCommit={value => { if (value != null) commit(student.key, 'team', student.displayed.team, value); }}
                                                            onUnlock={() => unlock(student.key, 'team', student.displayed.team)}
                                                            onHistory={() => { setExpandedKey(student.key); setHistoryKey(student.key); }}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <ScoreCell
                                                            active={editingCell === `${student.key}:individual`}
                                                            value={noGradingMatches && !student.displayed.locked.individual ? null : student.displayed.individual}
                                                            dash={noGradingMatches && !student.displayed.locked.individual}
                                                            locked={student.displayed.locked.individual}
                                                            onOpen={() => setEditingCell(`${student.key}:individual`)}
                                                            onExplain={() => openExplain(student.key, 'individual')}
                                                            onClose={() => setEditingCell(null)}
                                                            onCommit={value => { if (value != null) commit(student.key, 'individual', student.displayed.individual, value); }}
                                                            onUnlock={() => unlock(student.key, 'individual', student.displayed.individual)}
                                                            onHistory={() => { setExpandedKey(student.key); setHistoryKey(student.key); }}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <ScoreCell
                                                            active={editingCell === `${student.key}:role`}
                                                            value={noGradingMatches && !student.displayed.locked.role ? null : student.displayed.role}
                                                            dash={noGradingMatches && !student.displayed.locked.role}
                                                            locked={student.displayed.locked.role}
                                                            onOpen={() => setEditingCell(`${student.key}:role`)}
                                                            onExplain={() => openExplain(student.key, 'role')}
                                                            onClose={() => setEditingCell(null)}
                                                            onCommit={value => { if (value != null) commit(student.key, 'role', student.displayed.role, value); }}
                                                            onUnlock={() => unlock(student.key, 'role', student.displayed.role)}
                                                            onHistory={() => { setExpandedKey(student.key); setHistoryKey(student.key); }}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 text-right font-semibold tabular-nums align-middle">{noGradingMatches ? '—' : (student.total ?? '—')}</td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <div className="flex flex-col items-start gap-1">
                                                            {student.resultDiffers && <span className="font-semibold text-rose-300">경고 · 결과</span>}
                                                            {student.duplicateRoles.length > 0 && <span className="font-semibold text-rose-300">경고 · 역할</span>}
                                                            {edited && <span className="font-semibold text-amber-300">수정됨</span>}
                                                            {student.edits.history.length > 0 && (
                                                                <button type="button" className="text-amber-200 underline" onClick={() => { setExpandedKey(student.key); setHistoryKey(historyKey === student.key ? null : student.key); }}>
                                                                    이력 보기
                                                                </button>
                                                            )}
                                                            {!warned && !edited && student.edits.history.length === 0 && <span className="text-slate-500">—</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {open && (
                                                    <tr className="bg-slate-950/70">
                                                        <td colSpan={10} className="px-4 py-3 text-sm text-slate-300">
                                                            <ScoreReason
                                                                student={student}
                                                                field={explainField}
                                                                config={config}
                                                                noGradingMatches={noGradingMatches}
                                                                roleComputed={roleComputed}
                                                                onEdit={field => setEditingCell(`${student.key}:${field}`)}
                                                            />
                                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                                <span>역할 횟수 수정</span>
                                                                <ScoreCell
                                                                    active={editingCell === `${student.key}:roleCount`}
                                                                    value={student.displayed.roleCount}
                                                                    locked={student.displayed.locked.roleCount}
                                                                    onOpen={() => setEditingCell(`${student.key}:roleCount`)}
                                                                    onClose={() => setEditingCell(null)}
                                                                    onCommit={value => { if (value != null) commit(student.key, 'roleCount', student.displayed.roleCount, value); }}
                                                                    onUnlock={() => unlock(student.key, 'roleCount', student.displayed.roleCount)}
                                                                    onHistory={() => setHistoryKey(student.key)}
                                                                />
                                                                {student.duplicateRoles.length > 0 && <span className="font-semibold text-rose-300">같은 날짜·대진 {student.duplicateRoles.length}묶음</span>}
                                                            </div>
                                                            {student.otherTeams.length > 0 && <p className="mt-2 text-slate-400">다른 팀 {student.otherTeams.join(', ')}</p>}
                                                            {historyKey === student.key && (
                                                                <div className="mt-3 space-y-1 border-t border-slate-700 pt-2">
                                                                    {student.edits.history.length === 0 && <p>수정 이력이 없습니다.</p>}
                                                                    {student.edits.history.map((item, index) => (
                                                                        <p key={`${item.at}-${index}`}>{FIELD_LABEL[item.field]} {item.from ?? '없음'} → {item.to ?? '잠금 해제'} · {new Date(item.at).toLocaleString('ko-KR')}</p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {visibleStudents.length === 0 && (
                                        <tr><td colSpan={10} className="p-4 text-center text-slate-400">표시할 학생이 없습니다.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
            <RetroactiveHustleModal
                isOpen={editMatch != null}
                match={editMatch?.match ?? null}
                onClose={() => setEditMatch(null)}
                onSave={saveTypeChange}
            />
        </div>
    );
}

function RubricCard({ title, rows, note }: { title: string; rows: { score: number; label: string }[]; note?: string }) {
    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-2">
            <h3 className="font-semibold text-slate-100">{title}</h3>
            {note && <p className="text-sm text-slate-400">{note}</p>}
            <ul className="space-y-1.5">
                {rows.map(row => (
                    <li key={row.score} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 text-sm">
                        <span className="tabular-nums text-right font-semibold text-slate-100">{row.score}</span>
                        <span className="text-slate-300">{row.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function setLabel(set: TeamSet) {
    const count = set.teamCount ?? set.teams.length;
    const date = set.savedAt ? new Date(set.savedAt).toLocaleDateString('ko-KR') : '';
    return `${set.className} · ${count}팀${date ? ` · ${date}` : ''}`;
}

function NumberBox({ value, onCommit, step }: { value: number; onCommit: (value: number) => void; step?: string }) {
    const [text, setText] = useState(String(value));
    useEffect(() => { setText(String(value)); }, [value]);
    return (
        <input
            type="number"
            step={step}
            value={text}
            onChange={event => setText(event.target.value)}
            onBlur={() => {
                if (text.trim() === '') {
                    setText(String(value));
                    return;
                }
                const next = Number(text);
                if (Number.isFinite(next) && next !== value) onCommit(next);
                else setText(String(value));
            }}
            className="ml-2 w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
        />
    );
}

function BandEditor({ title, rows, minLabel, bars, onChange, onAdd }: {
    title: string;
    rows: ScoreBand[];
    minLabel: string;
    bars?: { label: string; count: number }[];
    onChange: (rows: ScoreBand[]) => void;
    onAdd: () => void;
}) {
    const max = Math.max(1, ...(bars ?? []).map(bar => bar.count));
    return (
        <div className="rounded-lg border border-slate-700 p-3">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold text-slate-100">{title}</h3>
                <button type="button" onClick={onAdd} className="text-sm text-slate-200 underline">구간 추가</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_11rem] gap-4">
                <div className="space-y-2">
                    {rows.map((row, index) => (
                        <div key={`${title}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
                            <NumberBox value={row.minInclusive} onCommit={value => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, minInclusive: value } : item))} />
                            <span>{minLabel}</span>
                            <NumberBox value={row.score} onCommit={value => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, score: value } : item))} />
                            <span>점</span>
                            <button type="button" className="text-slate-300 underline" onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}>삭제</button>
                        </div>
                    ))}
                </div>
                {bars && (
                    <div className="space-y-1.5" aria-label={`${title} 인원 분포`}>
                        {bars.length === 0 && <p className="text-sm text-slate-500">분포 없음</p>}
                        {bars.map(bar => (
                            <div key={bar.label} className="flex items-center gap-2 text-sm">
                                <span className="w-8 text-right tabular-nums text-slate-300">{bar.label}</span>
                                <span className="h-2.5 rounded bg-slate-500" style={{ width: `${Math.max(4, (bar.count / max) * 72)}px` }} />
                                <span className="tabular-nums text-slate-400">{bar.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatIndex(value: number): string {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
}

function ScoreReason({ student, field, config, noGradingMatches, roleComputed, onEdit }: {
    student: {
        displayed: { portfolio: number | null; team: number | null; individual: number; role: number; roleCount: number };
        personal: { excellence: number; effort: number; chosen: number; source: string; score: number };
        stats: IndexStats;
        played: number;
        teamMatches: number;
        rank: number | null;
        teamName: string;
        roleDuties: number;
        gamesPlayed: number;
        roleEntries: { role: string; date: string; matchInfo: string }[];
    };
    field: GradeField | null;
    config: AssessmentGradingConfig;
    noGradingMatches: boolean;
    roleComputed: number;
    onEdit: (field: GradeField) => void;
}) {
    const scale = config.indexScale;
    const half = meetsHalfParticipation(student.played, student.teamMatches);
    const show = (key: GradeField) => field == null || field === key;
    return (
        <div className="space-y-3">
            {show('portfolio') && (
                <div className={`rounded-lg border px-3 py-2 ${field === 'portfolio' ? 'border-amber-500/60 bg-amber-950/30' : 'border-slate-700'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">포트폴리오 {student.displayed.portfolio ?? '미입력'}</p>
                        <button type="button" onClick={() => onEdit('portfolio')} className="text-amber-200 underline">수정</button>
                    </div>
                    <p className="mt-1">{rubricLabel(PORTFOLIO_RUBRIC, student.displayed.portfolio) ?? '교사가 입력하는 칸입니다.'}</p>
                </div>
            )}
            {show('team') && (
                <div className={`rounded-lg border px-3 py-2 ${field === 'team' ? 'border-amber-500/60 bg-amber-950/30' : 'border-slate-700'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">팀 평가 {noGradingMatches ? '—' : (student.displayed.team ?? '—')}</p>
                        <button type="button" onClick={() => onEdit('team')} className="text-amber-200 underline">수정</button>
                    </div>
                    <p className="mt-1">{student.teamName || '팀 없음'} · 순위 {student.rank ?? '—'}위 · 참여 {student.played}/{student.teamMatches}{half ? ' · 1/2 참여 충족' : ' · 1/2 참여 미달'}</p>
                    <p className="mt-1 text-slate-400">{rubricLabel(TEAM_RUBRIC, student.displayed.team) ?? '—'}</p>
                </div>
            )}
            {show('individual') && (
                <div className={`rounded-lg border px-3 py-2 ${field === 'individual' ? 'border-amber-500/60 bg-amber-950/30' : 'border-slate-700'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">개인 평가 {noGradingMatches ? '—' : student.displayed.individual}</p>
                        <button type="button" onClick={() => onEdit('individual')} className="text-amber-200 underline">수정</button>
                    </div>
                    <p className="mt-1">우수 {formatIndex(student.personal.excellence)} = (득점 {student.stats.points} + 에이스 {student.stats.serviceAces} + 스파이크 {student.stats.spikeSuccesses} + 블로킹 {student.stats.blockingPoints}) × {scale}</p>
                    <p className="mt-1">노력 {formatIndex(student.personal.effort)} = (노력상 {student.stats.hustles}×2 + 디그 {student.stats.digs} + 서브 In {student.stats.serveIn}×0.5 + 어시스트 {student.stats.assists}×0.5) × {scale}</p>
                    <p className="mt-1">반영 {sourceLabel(student.personal.source)} {formatIndex(student.personal.chosen)}{student.personal.source !== 'absent' ? ` · ${describeIndividualBand(student.personal.chosen, config)}` : ' · 미참여'}</p>
                    <p className="mt-1 text-slate-400">{rubricLabel(INDIVIDUAL_RUBRIC, noGradingMatches ? null : student.displayed.individual) ?? '—'}</p>
                </div>
            )}
            {show('role') && (
                <div className={`rounded-lg border px-3 py-2 ${field === 'role' ? 'border-amber-500/60 bg-amber-950/30' : 'border-slate-700'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">역할 {noGradingMatches ? '—' : student.displayed.role}</p>
                        <button type="button" onClick={() => onEdit('role')} className="text-amber-200 underline">수정</button>
                    </div>
                    <p className="mt-1">선수 경기 {student.gamesPlayed} + 역할 수행 {student.roleDuties} = {student.displayed.roleCount}회 → 계산 {roleComputed}점</p>
                    {student.roleEntries.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-slate-400">
                            {student.roleEntries.map((entry, index) => (
                                <li key={`${entry.date}-${index}`}>{entry.role} · {entry.date} · {entry.matchInfo}</li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-1 text-slate-400">{rubricLabel(ROLE_RUBRIC, noGradingMatches ? null : student.displayed.role) ?? '—'}</p>
                </div>
            )}
        </div>
    );
}

function ScoreCell({
    active,
    value,
    locked,
    dash,
    emphasize,
    options,
    optionLabels,
    onOpen,
    onExplain,
    onClose,
    onCommit,
    onUnlock,
    onHistory,
}: {
    active: boolean;
    value: number | null;
    locked: boolean;
    dash?: boolean;
    emphasize?: boolean;
    options?: number[];
    optionLabels?: Record<number, string>;
    onOpen: () => void;
    onExplain?: () => void;
    onClose: () => void;
    onCommit: (value: number | null) => void;
    onUnlock: () => void;
    onHistory: () => void;
}) {
    const [text, setText] = useState(value == null ? '' : String(value));
    useEffect(() => { setText(value == null ? '' : String(value)); }, [value, active]);
    const shown = dash || value == null ? (emphasize && !dash ? '입력' : '—') : String(value);

    if (active && options) {
        return (
            <select
                autoFocus
                value={value ?? ''}
                onChange={event => {
                    onCommit(event.target.value === '' ? null : Number(event.target.value));
                    onClose();
                }}
                onBlur={onClose}
                className="w-full bg-slate-900 border border-slate-500 rounded px-2 py-1 text-sm text-right text-slate-100"
            >
                <option value="">미입력</option>
                {options.map(option => <option key={option} value={option}>{option}{optionLabels?.[option] ? ` · ${optionLabels[option]}` : ''}</option>)}
            </select>
        );
    }

    if (active) {
        return (
            <input
                autoFocus
                type="number"
                value={text}
                onChange={event => setText(event.target.value)}
                onBlur={() => {
                    if (text.trim() === '') {
                        onClose();
                        return;
                    }
                    const next = Number(text);
                    if (Number.isFinite(next) && next !== value) onCommit(next);
                    onClose();
                }}
                onKeyDown={event => {
                    if (event.key === 'Escape') onClose();
                    if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                }}
                className="w-full bg-slate-900 border border-slate-500 rounded px-2 py-1 text-sm text-right text-slate-100"
            />
        );
    }

    return (
        <div className={emphasize ? 'rounded-md bg-slate-800 ring-1 ring-slate-400 px-2 py-1' : ''}>
            <button type="button" onClick={onExplain ?? onOpen} className="block w-full text-right text-sm tabular-nums font-medium text-slate-100 min-h-7">
                {shown}
            </button>
            {locked && (
                <div className="mt-1 flex flex-wrap justify-end gap-x-2 gap-y-1">
                    <span className="font-semibold text-amber-300">수정됨</span>
                    <button type="button" onClick={onHistory} className="text-amber-200 underline">이력 보기</button>
                    <button type="button" onClick={onUnlock} className="text-amber-200 underline">잠금 해제</button>
                </div>
            )}
        </div>
    );
}
