import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../contexts/DataContext';
import { ScheduledBroadcast, ScheduledRosterPlayer } from '../types';
import TeamSelectionModal from '../components/TeamSelectionModal';
import { buildMatchupDescription, parseNamesToRoster } from '../utils/scheduledBroadcastRoster';

export function buildScheduledBroadcastUrl(code: string, title: string, description: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    params.set('code', code);
    params.set('liveView', 'broadcast');
    if (title) params.set('title', title);
    if (description) params.set('desc', description);
    return `${origin}/?${params.toString()}`;
}

interface CreateScheduledBroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateScheduledBroadcastModal: React.FC<CreateScheduledBroadcastModalProps> = ({ isOpen, onClose }) => {
    const { createScheduledBroadcast, teamSetsMap, showToast } = useData();
    const [title, setTitle] = useState('');
    const [homeTeamName, setHomeTeamName] = useState('');
    const [homeTeamKey, setHomeTeamKey] = useState('');
    const [homePlayers, setHomePlayers] = useState<ScheduledRosterPlayer[]>([]);
    const [homeBulk, setHomeBulk] = useState('');
    const [awayTeamName, setAwayTeamName] = useState('');
    const [awayTeamKey, setAwayTeamKey] = useState('');
    const [awayPlayers, setAwayPlayers] = useState<ScheduledRosterPlayer[]>([]);
    const [awayBulk, setAwayBulk] = useState('');
    const [teamPickerTarget, setTeamPickerTarget] = useState<'home' | 'away' | null>(null);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const matchupPreview = buildMatchupDescription(homeTeamName, awayTeamName);
    /** MatchSetupScreen과 동일: 반대편에 이미 고른 팀은 excludeKey로 비활성화 */
    const excludeKey = teamPickerTarget === 'home' ? awayTeamKey : homeTeamKey;

    const resetForm = () => {
        setTitle('');
        setHomeTeamName('');
        setHomeTeamKey('');
        setHomePlayers([]);
        setHomeBulk('');
        setAwayTeamName('');
        setAwayTeamKey('');
        setAwayPlayers([]);
        setAwayBulk('');
        setTeamPickerTarget(null);
    };

    /** 저장된 팀 키 → 이름·명단 (우리/상대 공용) */
    const resolveTeamFromKey = (teamKey: string): { teamName: string; players: ScheduledRosterPlayer[] } | null => {
        const data = teamSetsMap.get(teamKey);
        if (!data) return null;
        const { team, set } = data;
        return {
            teamName: team.teamName,
            players: team.playerIds
                .map(id => set.players[id])
                .filter(Boolean)
                .map(p => ({ id: p!.id, name: p!.originalName, number: p!.studentNumber })),
        };
    };

    const handlePickSavedTeam = (teamKey: string) => {
        const resolved = resolveTeamFromKey(teamKey);
        if (!resolved) {
            showToast('팀을 불러올 수 없습니다.', 'error');
            return;
        }
        if (teamPickerTarget === 'away') {
            setAwayTeamName(resolved.teamName);
            setAwayTeamKey(teamKey);
            setAwayPlayers(resolved.players);
            setAwayBulk('');
        } else {
            setHomeTeamName(resolved.teamName);
            setHomeTeamKey(teamKey);
            setHomePlayers(resolved.players);
            setHomeBulk('');
        }
        setTeamPickerTarget(null);
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            showToast('대회명을 입력해 주세요.', 'error');
            return;
        }
        const homeFromBulk = homeBulk.trim() ? parseNamesToRoster(homeBulk) : [];
        const awayFromBulk = awayBulk.trim() ? parseNamesToRoster(awayBulk) : [];
        const home = homePlayers.length > 0 ? homePlayers : homeFromBulk;
        const away = awayPlayers.length > 0 ? awayPlayers : awayFromBulk;
        const description = buildMatchupDescription(homeTeamName, awayTeamName);
        setSaving(true);
        try {
            await createScheduledBroadcast(title, description, {
                homeTeamName: homeTeamName.trim() || undefined,
                homePlayers: home.length ? home : undefined,
                awayTeamName: awayTeamName.trim() || undefined,
                awayPlayers: away.length ? away : undefined,
            });
            resetForm();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-sky-500/40 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="border-b border-slate-700 px-5 py-4">
                        <h2 className="text-xl font-bold text-sky-400">방송 예약 생성</h2>
                        <p className="mt-1 text-sm text-slate-400">대회 정보와 우리 팀 명단을 미리 넣으면, 시작 시 전광판으로 바로 들어갑니다.</p>
                    </div>
                    <div className="space-y-4 px-5 py-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-300">대회명 *</span>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="예: 2026학년도 북부 스포츠클럽 대회 결승전"
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                        </label>

                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-emerald-300">우리 학교 팀 명단</p>
                                <button type="button" onClick={() => setTeamPickerTarget('home')} className="rounded-lg bg-emerald-700/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
                                    저장된 팀 불러오기
                                </button>
                            </div>
                            <input
                                value={homeTeamName}
                                onChange={e => {
                                    setHomeTeamName(e.target.value);
                                    setHomeTeamKey('');
                                }}
                                placeholder="우리 팀 이름"
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500"
                            />
                            {homePlayers.length > 0 ? (
                                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-300">
                                    {homePlayers.map((p, i) => (
                                        <div key={p.id ?? `${p.name}-${i}`} className="flex justify-between gap-2 py-0.5">
                                            <span>{p.number ? `#${p.number} ` : ''}{p.name}</span>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHomePlayers([]);
                                            setHomeTeamKey('');
                                        }}
                                        className="mt-2 text-xs text-red-400 hover:underline"
                                    >
                                        명단 비우기
                                    </button>
                                </div>
                            ) : (
                                <textarea
                                    value={homeBulk}
                                    onChange={e => setHomeBulk(e.target.value)}
                                    rows={4}
                                    placeholder={"선수 이름을 줄바꿈 또는 쉼표로 입력\n예:\n김민수\n이서연"}
                                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                                />
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-600 bg-slate-800/40 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-300">
                                    상대 팀 명단 <span className="text-xs font-normal text-slate-500">(선택 — 비워도 됨)</span>
                                </p>
                                <button type="button" onClick={() => setTeamPickerTarget('away')} className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-500">
                                    저장된 팀 불러오기
                                </button>
                            </div>
                            <input
                                value={awayTeamName}
                                onChange={e => {
                                    setAwayTeamName(e.target.value);
                                    setAwayTeamKey('');
                                }}
                                placeholder="상대 팀 이름 (선택)"
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500"
                            />
                            {awayPlayers.length > 0 ? (
                                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-300">
                                    {awayPlayers.map((p, i) => (
                                        <div key={p.id ?? `away-${p.name}-${i}`} className="flex justify-between gap-2 py-0.5">
                                            <span>{p.number ? `#${p.number} ` : ''}{p.name}</span>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAwayPlayers([]);
                                            setAwayTeamKey('');
                                        }}
                                        className="mt-2 text-xs text-red-400 hover:underline"
                                    >
                                        명단 비우기
                                    </button>
                                </div>
                            ) : (
                                <textarea
                                    value={awayBulk}
                                    onChange={e => setAwayBulk(e.target.value)}
                                    rows={3}
                                    placeholder="상대 선수 이름 (선택, 줄바꿈/쉼표)"
                                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                                />
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5">
                            <p className="text-xs font-semibold text-slate-500">매치업 (자동)</p>
                            <p className="mt-0.5 text-sm font-semibold text-sky-300">{matchupPreview}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 border-t border-slate-700 px-5 py-4">
                        <button type="button" onClick={() => { resetForm(); onClose(); }} className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-600">취소</button>
                        <button
                            type="button"
                            disabled={saving || !title.trim()}
                            onClick={handleCreate}
                            className="flex-1 rounded-xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                            {saving ? '생성 중…' : '예약 생성'}
                        </button>
                    </div>
                </div>
            </div>
            <TeamSelectionModal
                isOpen={teamPickerTarget !== null}
                onClose={() => setTeamPickerTarget(null)}
                onSelect={handlePickSavedTeam}
                excludeKey={excludeKey}
                overlayZIndexClass="z-[250]"
            />
        </>
    );
};

interface ManualStartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (item: Partial<ScheduledBroadcast> & { code: string }) => void;
}

const ManualStartModal: React.FC<ManualStartModalProps> = ({ isOpen, onClose, onStart }) => {
    const [code, setCode] = useState('');
    const [title, setTitle] = useState('');
    const [homeTeamName, setHomeTeamName] = useState('');
    const [homeBulk, setHomeBulk] = useState('');
    const [awayTeamName, setAwayTeamName] = useState('');
    const [awayBulk, setAwayBulk] = useState('');

    if (!isOpen) return null;

    const matchupPreview = buildMatchupDescription(homeTeamName, awayTeamName);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="border-b border-slate-700 px-5 py-4">
                    <h2 className="text-xl font-bold text-amber-400">코드로 직접 시작</h2>
                    <p className="mt-1 text-sm text-slate-400">라인업 없이 바로 전광판으로 시작할 수 있습니다. 명단은 전광판에서 채울 수 있습니다.</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                    <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-300">4자리 코드 *</span>
                        <input
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                            placeholder="ABCD"
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-center text-lg tracking-[0.3em] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="대회명 (선택)" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
                    <input value={homeTeamName} onChange={e => setHomeTeamName(e.target.value)} placeholder="우리 팀 이름 (선택)" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
                    <textarea value={homeBulk} onChange={e => setHomeBulk(e.target.value)} rows={2} placeholder="우리 팀 선수 (선택)" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
                    <input value={awayTeamName} onChange={e => setAwayTeamName(e.target.value)} placeholder="상대 팀 이름 (선택)" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
                    <textarea value={awayBulk} onChange={e => setAwayBulk(e.target.value)} rows={2} placeholder="상대 선수 (선택)" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white" />
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-500">매치업 (자동)</p>
                        <p className="mt-0.5 text-sm font-semibold text-amber-300">{matchupPreview}</p>
                    </div>
                </div>
                <div className="flex gap-2 border-t border-slate-700 px-5 py-4">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-600">취소</button>
                    <button
                        type="button"
                        disabled={code.length !== 4}
                        onClick={() => {
                            onStart({
                                code,
                                title,
                                description: buildMatchupDescription(homeTeamName, awayTeamName),
                                homeTeamName: homeTeamName.trim() || undefined,
                                homePlayers: homeBulk.trim() ? parseNamesToRoster(homeBulk) : undefined,
                                awayTeamName: awayTeamName.trim() || undefined,
                                awayPlayers: awayBulk.trim() ? parseNamesToRoster(awayBulk) : undefined,
                            });
                            onClose();
                        }}
                        className="flex-1 rounded-xl bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                    >
                        바로 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

const STATUS_LABEL: Record<ScheduledBroadcast['status'], string> = {
    scheduled: '예약됨',
    live: '방송 중',
    ended: '종료',
    cancelled: '취소됨',
};

interface ScheduledBroadcastScreenProps {
    onStartBroadcast: (item: Partial<ScheduledBroadcast> & { code: string }) => void;
}

const ScheduledBroadcastScreen: React.FC<ScheduledBroadcastScreenProps> = ({ onStartBroadcast }) => {
    const { scheduledBroadcasts, cancelScheduledBroadcast, showToast } = useData();
    const [showCreate, setShowCreate] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const sorted = useMemo(
        () => [...scheduledBroadcasts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [scheduledBroadcasts]
    );

    const copyText = async (text: string, okMsg: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(okMsg, 'success');
        } catch {
            showToast('복사에 실패했습니다.', 'error');
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 animate-fade-in">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5">
                <h1 className="text-2xl font-bold text-sky-400">📺 방송 예약</h1>
                <p className="mt-1 text-sm text-slate-400">우리 팀 명단을 미리 넣어 두면, 경기 시작 시 전광판으로 바로 진입합니다.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => setShowCreate(true)} className="rounded-xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-500">
                        + 새 예약 생성
                    </button>
                    <button type="button" onClick={() => setShowManual(true)} className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 font-semibold text-amber-300 hover:bg-amber-500/20">
                        코드 직접 입력해서 시작
                    </button>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center text-slate-500">
                    예약된 방송이 없습니다. 「새 예약 생성」으로 시작해 보세요.
                </div>
            ) : (
                <ul className="space-y-3">
                    {sorted.map(item => {
                        const url = buildScheduledBroadcastUrl(item.code, item.title, item.description);
                        const canStart = item.status === 'scheduled' || item.status === 'live';
                        const homeCount = item.homePlayers?.length ?? 0;
                        const awayCount = item.awayPlayers?.length ?? 0;
                        return (
                            <li key={item.id} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="flex-shrink-0 rounded-lg bg-white p-2 self-center sm:self-start">
                                        <QRCodeSVG value={url} size={96} level="M" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-2xl font-black tracking-widest text-yellow-400">{item.code}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                item.status === 'scheduled' ? 'bg-emerald-500/20 text-emerald-300'
                                                : item.status === 'live' ? 'bg-sky-500/20 text-sky-300'
                                                : item.status === 'ended' ? 'bg-slate-600 text-slate-300'
                                                : 'bg-red-500/20 text-red-300'
                                            }`}>{STATUS_LABEL[item.status]}</span>
                                        </div>
                                        <p className="font-bold text-slate-100">{item.title || '(제목 없음)'}</p>
                                        {item.description && <p className="text-sm text-slate-400">{item.description}</p>}
                                        <p className="text-xs text-slate-500">
                                            우리 팀 {item.homeTeamName || '—'} ({homeCount}명) · 상대 {item.awayTeamName || '—'} ({awayCount}명)
                                        </p>
                                        <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <button type="button" onClick={() => copyText(item.code, '코드가 복사되었습니다.')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600">코드 복사</button>
                                            <button type="button" onClick={() => copyText(url, 'URL이 복사되었습니다.')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600">URL 복사</button>
                                            {canStart && (
                                                <button
                                                    type="button"
                                                    onClick={() => onStartBroadcast(item)}
                                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500"
                                                >
                                                    경기 시작
                                                </button>
                                            )}
                                            {item.status === 'scheduled' && (
                                                <button type="button" onClick={() => cancelScheduledBroadcast(item.id)} className="rounded-lg bg-red-700/80 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600">
                                                    취소
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <CreateScheduledBroadcastModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
            <ManualStartModal isOpen={showManual} onClose={() => setShowManual(false)} onStart={onStartBroadcast} />
        </div>
    );
};

export default ScheduledBroadcastScreen;
