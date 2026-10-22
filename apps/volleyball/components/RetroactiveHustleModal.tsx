import React, { useEffect, useMemo, useState } from 'react';
import type { MatchState } from '../types';
import { listParticipatingPlayers } from '../utils/hustleAssignment';

interface RetroactiveHustleModalProps {
    isOpen: boolean;
    match: MatchState | null;
    onClose: () => void;
    onSave: (playerId: string, markAsAssessment: boolean) => void;
}

export const RetroactiveHustleModal: React.FC<RetroactiveHustleModalProps> = ({
    isOpen,
    match,
    onClose,
    onSave,
}) => {
    const [selectedId, setSelectedId] = useState('');
    const [markAsAssessment, setMarkAsAssessment] = useState(false);

    const candidates = useMemo(
        () => (match ? listParticipatingPlayers(match) : []),
        [match],
    );

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !match) return;
        const current = match.hustlePlayerIds?.[0] ?? match.hustlePlayers?.[0]?.id ?? '';
        const allowed = new Set(candidates.map(player => player.id));
        setSelectedId(allowed.has(current) ? current : '');
        setMarkAsAssessment(false);
    }, [isOpen, match, candidates]);

    if (!isOpen || !match) return null;

    const teamA = candidates.filter(player => player.team === 'A');
    const teamB = candidates.filter(player => player.team === 'B');
    const alreadyAssessment = match.isAssessment === true;

    const renderList = (players: typeof candidates, teamName: string) => (
        <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-400">{teamName}</h4>
            {players.length === 0 ? (
                <p className="text-sm text-slate-500">이 팀의 출전 선수가 없습니다.</p>
            ) : (
                <div className="space-y-1.5">
                    {players.map(player => {
                        const checked = selectedId === player.id;
                        return (
                            <label
                                key={player.id}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border-2 ${
                                    checked ? 'bg-amber-900/40 border-amber-500' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700/80'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="retroactive-hustle-player"
                                    checked={checked}
                                    onChange={() => setSelectedId(player.id)}
                                    className="h-5 w-5 accent-amber-500"
                                />
                                <span className="font-semibold text-slate-200">{player.name}</span>
                                {player.studentNumber ? (
                                    <span className="text-slate-500 text-sm">({player.studentNumber}번)</span>
                                ) : null}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="retroactive-hustle-title">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border-2 border-amber-500/50 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col" onClick={event => event.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-700 bg-amber-900/20">
                    <h3 id="retroactive-hustle-title" className="text-xl font-bold text-amber-400">허슬 플레이어 지정/수정</h3>
                    <p className="text-sm text-slate-400 mt-1">이 경기에 출전한 학생 중에서 1명을 고릅니다. 저장하면 사후 입력으로 기록됩니다.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {candidates.length === 0 ? (
                        <p className="text-sm text-slate-300">출전 선수를 찾을 수 없어 지정할 수 없습니다.</p>
                    ) : (
                        <>
                            {renderList(teamA, match.teamA.name || '팀 A')}
                            {renderList(teamB, match.teamB.name || '팀 B')}
                        </>
                    )}
                    {alreadyAssessment ? (
                        <p className="text-sm text-amber-200">이 경기는 이미 수행평가입니다.</p>
                    ) : (
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-900/20 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={markAsAssessment}
                                onChange={event => setMarkAsAssessment(event.target.checked)}
                                className="mt-1 h-5 w-5 rounded accent-amber-500"
                            />
                            <span>
                                <span className="block font-semibold text-amber-200">이 경기를 수행평가로 변경</span>
                                <span className="block text-xs text-slate-400 mt-1">일반 경기만 수행평가로 바꿉니다. 바꾼 시각은 변경 이력에 남습니다.</span>
                            </span>
                        </label>
                    )}
                </div>
                <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold">
                        취소
                    </button>
                    <button
                        type="button"
                        disabled={!selectedId}
                        onClick={() => onSave(selectedId, markAsAssessment)}
                        className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:bg-slate-700 disabled:cursor-not-allowed"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};
