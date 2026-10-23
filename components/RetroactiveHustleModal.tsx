import React, { useEffect, useMemo, useState } from 'react';
import type { MatchState } from '../types';
import { HUSTLE_CLEAR_NOTICE, initialHustleSelection, listParticipatingPlayers } from '../utils/hustleAssignment';

interface RetroactiveHustleModalProps {
    isOpen: boolean;
    match: MatchState | null;
    onClose: () => void;
    onSave: (playerIds: string[], change: { markAsAssessment: boolean; revertToRegular: boolean }) => void;
}

export const RetroactiveHustleModal: React.FC<RetroactiveHustleModalProps> = ({
    isOpen,
    match,
    onClose,
    onSave,
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [markAsAssessment, setMarkAsAssessment] = useState(false);
    const [revertToRegular, setRevertToRegular] = useState(false);

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
        setSelectedIds(initialHustleSelection(match));
        setMarkAsAssessment(false);
        setRevertToRegular(false);
    }, [isOpen, match]);

    if (!isOpen || !match) return null;

    const teamA = candidates.filter(player => player.team === 'A');
    const teamB = candidates.filter(player => player.team === 'B');
    const alreadyAssessment = match.isAssessment === true;
    const selectionLocksAssessment = !alreadyAssessment && selectedIds.length > 0;

    const toggle = (playerId: string) => {
        if (revertToRegular) return;
        setSelectedIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
    };

    const handleRevert = (checked: boolean) => {
        setRevertToRegular(checked);
        if (checked) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(initialHustleSelection(match));
    };

    const handleSave = () => {
        if (revertToRegular && !window.confirm(`${HUSTLE_CLEAR_NOTICE}\n수행평가를 일반 경기로 되돌립니다.`)) return;
        const ids = revertToRegular ? [] : selectedIds;
        onSave(ids, {
            markAsAssessment: !alreadyAssessment && (ids.length > 0 || markAsAssessment),
            revertToRegular,
        });
    };

    const renderList = (players: typeof candidates, teamName: string) => (
        <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-400">{teamName}</h4>
            {players.length === 0 ? (
                <p className="text-sm text-slate-500">이 팀의 선수가 없습니다.</p>
            ) : (
                <div className="space-y-1.5">
                    {players.map(player => {
                        const checked = selectedIds.includes(player.id);
                        return (
                            <label
                                key={player.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                                    revertToRegular ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                } ${
                                    checked ? 'bg-amber-900/40 border-amber-500' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700/80'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={revertToRegular}
                                    onChange={() => toggle(player.id)}
                                    className="h-5 w-5 rounded accent-amber-500"
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
                    <p className="text-sm text-slate-400 mt-1">양 팀 명단 전체에서 고릅니다. 명단에 없는 기존 선택도 이름과 함께 체크된 채로 남고, 저장하면 사후 입력으로 기록됩니다.</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {candidates.length === 0 ? (
                        <p className="text-sm text-slate-300">명단에서 선수를 찾을 수 없어 지정할 수 없습니다.</p>
                    ) : (
                        <>
                            {renderList(teamA, match.teamA.name || '팀 A')}
                            {renderList(teamB, match.teamB.name || '팀 B')}
                        </>
                    )}
                    {alreadyAssessment ? (
                        <div className="space-y-2">
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-500/50 bg-slate-800/80 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={revertToRegular}
                                    onChange={event => handleRevert(event.target.checked)}
                                    className="mt-1 h-5 w-5 rounded accent-slate-400"
                                />
                                <span>
                                    <span className="block font-semibold text-slate-200">수행평가를 일반 경기로 되돌리기</span>
                                    <span className="block text-xs text-slate-400 mt-1">잘못 바꾼 유형을 되돌립니다. 바꾼 시각은 변경 이력에 남고, 저장된 승패는 바뀌지 않습니다.</span>
                                </span>
                            </label>
                            {revertToRegular && (
                                <p role="status" className="text-sm font-semibold text-amber-200 px-1">{HUSTLE_CLEAR_NOTICE}</p>
                            )}
                        </div>
                    ) : (
                        <label className={`flex items-start gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-900/20 ${selectionLocksAssessment ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={selectionLocksAssessment || markAsAssessment}
                                disabled={selectionLocksAssessment}
                                onChange={event => {
                                    if (selectionLocksAssessment) return;
                                    setMarkAsAssessment(event.target.checked);
                                }}
                                className="mt-1 h-5 w-5 rounded accent-amber-500"
                            />
                            <span>
                                <span className="block font-semibold text-amber-200">이 경기를 수행평가로 변경</span>
                                <span className="block text-xs text-slate-400 mt-1">
                                    {selectionLocksAssessment
                                        ? '허슬을 한 명이라도 고르면 수행평가로 바뀝니다. 체크를 해제하려면 선택을 모두 비우세요.'
                                        : '일반 경기만 수행평가로 바꿉니다. 바꾼 시각은 변경 이력에 남습니다.'}
                                </span>
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
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                    >
                        저장 ({selectedIds.length}명)
                    </button>
                </div>
            </div>
        </div>
    );
};
