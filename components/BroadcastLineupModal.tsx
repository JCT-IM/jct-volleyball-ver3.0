import React, { useEffect, useState } from 'react';
import { Player, TeamMatchState } from '../types';
import { createPlayerFromRosterEntry, emptyPlayerStats } from '../utils/scheduledBroadcastRoster';

interface BroadcastLineupModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamKey: 'A' | 'B';
    team: TeamMatchState;
    onSave: (next: TeamMatchState) => void;
}

/** 예약 방송 전광판용: 경기 중 팀 명단 추가/삭제/이름·등번호 수정 */
const BroadcastLineupModal: React.FC<BroadcastLineupModalProps> = ({ isOpen, onClose, teamKey, team, onSave }) => {
    const [teamName, setTeamName] = useState(team.name);
    const [rows, setRows] = useState<{ id: string; name: string; number: string }[]>([]);
    const [bulkText, setBulkText] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setTeamName(team.name);
        setRows(
            Object.values(team.players ?? {}).map(p => ({
                id: p.id,
                name: p.originalName,
                number: p.studentNumber || '',
            }))
        );
        setBulkText('');
    }, [isOpen, team]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const addEmptyRow = () => {
        setRows(prev => [...prev, { id: `new-${Date.now()}-${prev.length}`, name: '', number: String(prev.length + 1) }]);
    };

    const applyBulk = () => {
        const names = bulkText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        if (!names.length) return;
        setRows(names.map((name, i) => ({ id: `bulk-${Date.now()}-${i}`, name, number: String(i + 1) })));
        setBulkText('');
    };

    const handleSave = () => {
        const cleaned = rows.filter(r => r.name.trim());
        const players: Record<string, Player> = {};
        const playerStats: TeamMatchState['playerStats'] = {};
        const onCourt: string[] = [];
        cleaned.forEach((r, i) => {
            const p = createPlayerFromRosterEntry({ id: r.id, name: r.name.trim(), number: r.number }, i, `live-${teamKey}`);
            // 기존 선수면 스탯/메모 유지
            const prev = team.players?.[r.id];
            if (prev) {
                p.stats = prev.stats;
                p.memo = prev.memo;
                p.isLibero = prev.isLibero;
                p.isCaptain = prev.isCaptain;
            }
            players[p.id] = p;
            playerStats[p.id] = team.playerStats?.[r.id] ?? emptyPlayerStats();
            onCourt.push(p.id);
        });
        onSave({
            ...team,
            name: teamName.trim() || team.name || (teamKey === 'A' ? '우리 팀' : '상대 팀'),
            players,
            playerStats,
            onCourtPlayerIds: onCourt,
            benchPlayerIds: [],
            currentServerIndex: onCourt.length ? Math.min(team.currentServerIndex ?? 0, onCourt.length - 1) : 0,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-sky-500/40 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="border-b border-slate-700 px-5 py-4">
                    <h2 className="text-xl font-bold text-sky-400">
                        {teamKey === 'A' ? '우리 팀' : '상대 팀'} 라인업 편집
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">경기 중에도 선수 추가·삭제·이름 수정이 가능합니다.</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                    <label className="block">
                        <span className="mb-1 block text-sm font-semibold text-slate-300">팀 이름</span>
                        <input
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </label>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-300">선수 목록 ({rows.length})</span>
                            <button type="button" onClick={addEmptyRow} className="text-sm font-semibold text-sky-400 hover:text-sky-300">+ 선수 추가</button>
                        </div>
                        {rows.length === 0 && (
                            <p className="rounded-lg border border-dashed border-slate-600 p-3 text-center text-sm text-slate-500">선수가 없습니다. 아래에서 추가하세요.</p>
                        )}
                        {rows.map((row, idx) => (
                            <div key={row.id} className="flex gap-2">
                                <input
                                    value={row.number}
                                    onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, number: e.target.value } : r))}
                                    placeholder="No"
                                    className="w-14 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-center text-white"
                                />
                                <input
                                    value={row.name}
                                    onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                                    placeholder="이름"
                                    className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}
                                    className="rounded-lg bg-red-800/80 px-3 py-2 text-sm text-white hover:bg-red-700"
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                    <div>
                        <span className="mb-1 block text-sm font-semibold text-slate-300">일괄 입력 (줄바꿈/쉼표)</span>
                        <textarea
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            rows={3}
                            placeholder={"김민수\n이서연\n박지훈"}
                            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                        />
                        <button type="button" onClick={applyBulk} className="mt-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600">
                            목록으로 적용 (기존 덮어쓰기)
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 border-t border-slate-700 px-5 py-4">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-600">취소</button>
                    <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-500">저장</button>
                </div>
            </div>
        </div>
    );
};

export default BroadcastLineupModal;
