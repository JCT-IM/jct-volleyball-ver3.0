import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import AnnouncerScreen from './AnnouncerScreen';
import LiveBroadcastScreen from './LiveBroadcastScreen';
import { useTranslation } from '../hooks/useTranslation';

function getBroadcastMetaFromUrl(): { title: string; desc: string; liveView: string | null } {
    if (typeof window === 'undefined') return { title: '', desc: '', liveView: null };
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get('title') ?? '',
        desc: params.get('desc') ?? '',
        liveView: params.get('liveView'),
    };
}

interface StudentJoinScreenProps {
    onBackToLock: () => void;
    appMode?: 'CLASS' | 'CLUB';
    pendingJoinCode?: string | null;
    clearPendingJoinCode?: () => void;
}

const POLL_INTERVAL_MS = 4000;

const StudentJoinScreen: React.FC<StudentJoinScreenProps> = ({ onBackToLock, appMode = 'CLASS', pendingJoinCode, clearPendingJoinCode }) => {
    const { joinSession, p2p } = useData();
    const { t } = useTranslation();
    const meta = getBroadcastMetaFromUrl();
    const liveView = meta.liveView;
    const isBroadcastWaitMode = liveView === 'broadcast' && !!pendingJoinCode;
    const [joinId, setJoinId] = useState(pendingJoinCode ?? '');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [isWaitingForHost, setIsWaitingForHost] = useState(false);
    const hasTriedAutoJoin = useRef(false);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearPoll = () => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const tryJoinSilent = (code: string) => {
        setIsJoining(true);
        setJoinError('');
        joinSession(code, () => {
            setIsJoining(false);
            setIsWaitingForHost(false);
            clearPoll();
            clearPendingJoinCode?.();
        }, { silent: true });
    };

    useEffect(() => {
        if (pendingJoinCode && joinSession && !hasTriedAutoJoin.current) {
            hasTriedAutoJoin.current = true;
            setJoinId(pendingJoinCode);
            if (isBroadcastWaitMode) {
                setIsWaitingForHost(true);
                tryJoinSilent(pendingJoinCode);
            } else {
                setIsJoining(true);
                joinSession(pendingJoinCode, () => {
                    setIsJoining(false);
                    clearPendingJoinCode?.();
                });
            }
        }
        return () => clearPoll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingJoinCode, joinSession, clearPendingJoinCode, isBroadcastWaitMode]);

    useEffect(() => {
        if (!isWaitingForHost || p2p.isConnected) return;
        if (p2p.status === 'error' || (p2p.status === 'disconnected' && !isJoining)) {
            setIsJoining(false);
            clearPoll();
            pollTimerRef.current = setTimeout(() => {
                if (joinId.trim()) tryJoinSilent(joinId.trim().toUpperCase());
            }, POLL_INTERVAL_MS);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [p2p.status, p2p.isConnected, isWaitingForHost, isJoining, joinId]);

    useEffect(() => {
        if (isJoining && p2p.status === 'error' && !isWaitingForHost) {
            setJoinError(p2p.error || t('unknown_error'));
            setIsJoining(false);
        }
    }, [p2p.status, p2p.error, isJoining, t, isWaitingForHost]);

    const handleJoin = () => {
        if (!joinId.trim()) return;
        setJoinError('');
        setIsJoining(true);
        setIsWaitingForHost(false);
        clearPoll();
        joinSession(joinId.trim().toUpperCase(), () => {
            setIsJoining(false);
        });
    };

    if (p2p.isConnected) {
        if (appMode === 'CLUB' || liveView === 'broadcast') {
            return <LiveBroadcastScreen />;
        }
        return (
            <div className="min-h-screen flex flex-col bg-slate-900">
                <div className="flex-shrink-0 flex justify-end items-center p-3 bg-slate-800/80 border-b border-slate-700">
                    <span className="text-emerald-400 text-sm font-semibold">✓ 연결됨</span>
                </div>
                <div className="flex-grow overflow-auto">
                    <AnnouncerScreen appMode={appMode} />
                </div>
            </div>
        );
    }

    if (isWaitingForHost) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md bg-slate-800/80 rounded-2xl border border-sky-500/40 shadow-2xl p-8 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-sky-400 border-t-transparent animate-spin" />
                    <h2 className="text-xl font-bold text-sky-400 mb-2">경기 시작 대기 중</h2>
                    <p className="text-slate-400 text-sm mb-6">관리자가 경기를 시작하면 자동으로 연결됩니다.</p>
                    {(meta.title || meta.desc) && (
                        <div className="rounded-xl border border-slate-600 bg-slate-900/70 p-4 text-left space-y-2 mb-4">
                            {meta.title && <p className="font-bold text-slate-100 text-lg">{meta.title}</p>}
                            {meta.desc && <p className="text-slate-300">{meta.desc}</p>}
                        </div>
                    )}
                    <p className="text-xs text-slate-500 font-mono tracking-widest">코드 {joinId}</p>
                    <p className="mt-3 text-xs text-slate-500">약 {POLL_INTERVAL_MS / 1000}초마다 재시도 중…</p>
                    <button
                        type="button"
                        onClick={onBackToLock}
                        className="mt-6 text-sm text-slate-400 underline hover:text-slate-200"
                    >
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="bg-slate-800/80 rounded-2xl border border-slate-600 shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-emerald-400 mb-2 text-center">
                        👥 실시간 세션 참여
                    </h2>
                    <p className="text-slate-400 text-sm mb-5 text-center">
                        교사가 알려준 4자리 참여 코드를 입력하세요.
                    </p>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder={t('menu_join_session_placeholder')}
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value.toUpperCase().slice(0, 8))}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-center text-lg tracking-widest placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            aria-label="참여 코드"
                            disabled={isJoining}
                        />
                        {joinError && (
                            <p className="text-red-400 text-sm text-center" role="alert">
                                {joinError}
                            </p>
                        )}
                        <button
                            onClick={handleJoin}
                            disabled={isJoining || !joinId.trim()}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
                        >
                            {isJoining ? t('menu_connecting') : t('menu_join_session_button')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentJoinScreen;
