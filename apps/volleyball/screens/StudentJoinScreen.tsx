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
    /** @deprecated 연결 성공 후에도 URL(code/liveView)을 유지해 새로고침 시 자동 재접속되도록 더 이상 호출하지 않음 */
    clearPendingJoinCode?: () => void;
}

/** 여러 기기의 재시도가 동시에 몰리지 않도록 3~5초 사이 랜덤 지연(jitter) */
const nextPollDelayMs = () => 3000 + Math.floor(Math.random() * 2000);

const StudentJoinScreen: React.FC<StudentJoinScreenProps> = ({ onBackToLock, appMode = 'CLASS', pendingJoinCode }) => {
    const { joinSession, p2p, matchState } = useData();
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
            // URL의 code/liveView는 그대로 유지 → 새로고침 시 자동 재접속 가능
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
                });
            }
        }
        return () => clearPoll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingJoinCode, joinSession, isBroadcastWaitMode]);

    useEffect(() => {
        if (!isWaitingForHost || p2p.isConnected) return;
        if (p2p.status === 'error' || (p2p.status === 'disconnected' && !isJoining)) {
            setIsJoining(false);
            clearPoll();
            pollTimerRef.current = setTimeout(() => {
                if (joinId.trim()) tryJoinSilent(joinId.trim().toUpperCase());
            }, nextPollDelayMs());
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

    // 경기 종료 후 호스트가 방송을 닫아도(연결 해제) 결과 화면을 계속 표시
    const keepShowingEndedBroadcast = !!matchState?.gameOver && (appMode === 'CLUB' || liveView === 'broadcast');

    if (p2p.isConnected || keepShowingEndedBroadcast) {
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
        // 매치업("A팀 VS B팀") 문자열을 팀별로 분리해 강조 표시 (형식이 다르면 원문 그대로)
        const vsParts = meta.desc ? meta.desc.split(/\s+VS\s+/i) : [];
        const hasVsLayout = vsParts.length === 2;

        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center px-4 py-8">
                <div className="w-full max-w-md flex flex-col items-center text-center">
                    {/* 1. 상단 라벨 */}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold tracking-widest text-sky-300">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
                        </span>
                        LIVE 대기
                    </span>

                    {/* 2. 매치업 히어로 카드 — 시청자가 가장 궁금한 정보 */}
                    <div className="mt-4 w-full rounded-2xl border border-sky-500/30 bg-slate-900/80 shadow-2xl px-5 py-6 backdrop-blur-sm">
                        {meta.title && (
                            <p className="text-xs sm:text-sm font-semibold text-slate-400 mb-3 break-words">{meta.title}</p>
                        )}
                        {hasVsLayout ? (
                            <div className="flex items-center justify-center gap-3">
                                <p className="flex-1 min-w-0 text-right text-xl sm:text-2xl font-extrabold text-sky-300 break-words">{vsParts[0]}</p>
                                <span className="shrink-0 rounded-lg bg-slate-800 border border-slate-600 px-2 py-1 text-xs font-black text-slate-400">VS</span>
                                <p className="flex-1 min-w-0 text-left text-xl sm:text-2xl font-extrabold text-rose-300 break-words">{vsParts[1]}</p>
                            </div>
                        ) : meta.desc ? (
                            <p className="text-xl sm:text-2xl font-extrabold text-slate-100 break-words">{meta.desc}</p>
                        ) : (
                            <p className="text-xl sm:text-2xl font-extrabold text-slate-100">🏐 라이브 경기</p>
                        )}
                    </div>

                    {/* 3. 상태 표시 */}
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-[3px] border-sky-400 border-t-transparent animate-spin" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">경기 시작 대기 중</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                {isJoining ? '연결을 시도하고 있어요…' : '관리자가 경기를 시작하면 자동으로 연결됩니다.'}
                            </p>
                        </div>
                    </div>

                    {/* 4. 하단 보조 정보 */}
                    <div className="mt-10 flex flex-col items-center gap-3">
                        <p className="text-[11px] text-slate-600 font-mono tracking-[0.3em]">CODE {joinId}</p>
                        <button
                            type="button"
                            onClick={onBackToLock}
                            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
                        >
                            돌아가기
                        </button>
                    </div>
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
