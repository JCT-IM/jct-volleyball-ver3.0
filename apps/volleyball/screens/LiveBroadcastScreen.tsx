import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { VolleyballIcon } from '../components/icons';
import { buildYoutubeEmbedUrl } from '../utils/extractYoutubeVideoId';

const EMOJI_POOL = ['👏', '🔥', '🏐'] as const;
const TOAST_DURATION_MS = 3500;
const SCORING_EVENT_TYPES = ['ACE', 'SPIKE', 'BLOCK', 'DIRECT', 'SCORE', 'MANUAL_SCORE'];

function formatTickerFromEventDescription(desc: string): string {
    const s = (desc ?? '').trim().replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ');
    return s
        .replace('의 환상적인 서브 에이스!', ' 서브 에이스!')
        .replace(', 강력한 스파이크 성공!', ' 스파이크 득점!')
        .replace('의 완벽한 블로킹 득점!', ' 블로킹 득점!')
        .replace(', 다이렉트 공격 득점!', ' 다이렉트 득점!');
}

const LiveBroadcastScreen: React.FC = () => {
    const {
        matchState,
        broadcastVideoId,
        p2p,
        receivedChatMessages,
        isChatEnabled,
        isChatWindowVisible,
        sendChat,
        receivedReactions,
        removeReceivedReaction,
        sendReaction,
    } = useData();

    const embedUrl = useMemo(() => buildYoutubeEmbedUrl(broadcastVideoId), [broadcastVideoId]);

    const [showUi, setShowUi] = useState(true);
    const [chatMinimized, setChatMinimized] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatCooldown, setChatCooldown] = useState(0);
    const [toastText, setToastText] = useState<string | null>(null);
    const lastEventLenRef = useRef(0);

    useEffect(() => {
        if (chatCooldown <= 0) return;
        const id = setInterval(() => setChatCooldown((v) => Math.max(0, v - 1)), 1000);
        return () => clearInterval(id);
    }, [chatCooldown]);

    useEffect(() => {
        if (!matchState?.eventHistory) return;
        const len = matchState.eventHistory.length;
        if (len <= lastEventLenRef.current) return;
        const last = matchState.eventHistory[len - 1];
        if (!last) return;

        if (SCORING_EVENT_TYPES.includes(last.type)) {
            setToastText(formatTickerFromEventDescription(String(last.descriptionKey ?? last.type)));
            const timer = setTimeout(() => setToastText(null), TOAST_DURATION_MS);
            lastEventLenRef.current = len;
            return () => clearTimeout(timer);
        }
        lastEventLenRef.current = len;
    }, [matchState?.eventHistory]);

    const teamA = matchState?.teamA;
    const teamB = matchState?.teamB;

    // 코트 체인지(좌우 스왑) 동기화: 호스트가 MatchState.isSwapped로 브로드캐스트
    const swapped = !!matchState?.isSwapped;
    const leftTeam = swapped ? teamB : teamA;
    const rightTeam = swapped ? teamA : teamB;
    const leftKey: 'A' | 'B' = swapped ? 'B' : 'A';
    const rightKey: 'A' | 'B' = swapped ? 'A' : 'B';

    const gameOver = !!matchState?.gameOver;

    // 클라이언트는 호스트가 동기화해 준 p2p.chatEnabled / p2p.chatWindowVisible을 우선 사용
    const chatAllowed = !!(
        p2p.isConnected &&
        (p2p.chatEnabled ?? isChatEnabled) &&
        (p2p.chatWindowVisible ?? isChatWindowVisible)
    );

    /** 최근 득점 이벤트 (최신순 최대 3건) */
    const recentScoringEvents = useMemo(() => {
        const events = matchState?.eventHistory ?? [];
        const result: { key: number; text: string; team?: 'A' | 'B' }[] = [];
        for (let i = events.length - 1; i >= 0 && result.length < 3; i--) {
            const ev = events[i];
            if (ev && SCORING_EVENT_TYPES.includes(ev.type)) {
                result.push({
                    key: i,
                    text: formatTickerFromEventDescription(String(ev.descriptionKey ?? ev.type)),
                    team: (ev as { team?: 'A' | 'B' }).team,
                });
            }
        }
        return result;
    }, [matchState?.eventHistory]);

    /** 세트별 점수 breakdown (진행 중 세트/마지막 세트가 setScores에 없으면 현재 점수로 보충) */
    const setBreakdown = useMemo(() => {
        if (!matchState) return [];
        const completed = matchState.setScores ?? [];
        const totalCompletedSets = (teamA?.setsWon ?? 0) + (teamB?.setsWon ?? 0);
        if (completed.length >= totalCompletedSets && completed.length > 0) return completed;
        return [...completed, { teamA: teamA?.score ?? 0, teamB: teamB?.score ?? 0 }];
    }, [matchState, teamA?.setsWon, teamB?.setsWon, teamA?.score, teamB?.score]);

    const sendChatMessage = () => {
        const text = chatInput.trim();
        if (!text || chatCooldown > 0 || !chatAllowed) return;
        sendChat?.(text);
        setChatInput('');
        setChatCooldown(3);
    };

    const teamColor = (key: 'A' | 'B') =>
        (key === 'A' ? teamA?.color : teamB?.color) || (key === 'A' ? '#38bdf8' : '#f87171');

    /** 경기 종료 결과 화면 */
    const renderResultScreen = () => {
        if (!matchState) return null;
        const winnerTeam = matchState.winner === 'A' ? teamA : matchState.winner === 'B' ? teamB : null;
        return (
            <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900">
                <div className="min-h-full flex flex-col items-center justify-center gap-5 px-4 pt-16 pb-48">
                    <p className="text-sm font-semibold tracking-widest text-slate-400">🏁 경기 종료</p>
                    {winnerTeam && (
                        <h1 className="text-3xl sm:text-5xl font-black text-center" style={{ color: winnerTeam.color || '#facc15' }}>
                            🏆 {winnerTeam.name} 승리!
                        </h1>
                    )}
                    <div className="flex items-center justify-center gap-4 sm:gap-6">
                        <div className="text-center min-w-0">
                            <p className="text-sm sm:text-base font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">{teamA?.name ?? 'A팀'}</p>
                            <p className="text-5xl sm:text-7xl font-extrabold tabular-nums" style={{ color: teamColor('A') }}>{teamA?.setsWon ?? 0}</p>
                        </div>
                        <span className="text-3xl sm:text-5xl font-black text-white/70">:</span>
                        <div className="text-center min-w-0">
                            <p className="text-sm sm:text-base font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">{teamB?.name ?? 'B팀'}</p>
                            <p className="text-5xl sm:text-7xl font-extrabold tabular-nums" style={{ color: teamColor('B') }}>{teamB?.setsWon ?? 0}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 -mt-2">세트 스코어</p>

                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                        <p className="text-xs font-semibold text-slate-400 mb-2 text-center">세트별 점수</p>
                        <div className="space-y-1.5">
                            {setBreakdown.map((s, i) => {
                                const aWon = s.teamA > s.teamB;
                                const bWon = s.teamB > s.teamA;
                                return (
                                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
                                        <span className="text-xs text-slate-400 w-12 shrink-0">{i + 1}세트</span>
                                        <span className={`flex-1 text-right tabular-nums text-lg ${aWon ? 'font-extrabold text-white' : 'text-slate-400'}`}>{s.teamA}</span>
                                        <span className="px-2 text-slate-500">:</span>
                                        <span className={`flex-1 text-left tabular-nums text-lg ${bWon ? 'font-extrabold text-white' : 'text-slate-400'}`}>{s.teamB}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {!p2p.isConnected && (
                        <p className="text-xs text-slate-500">방송이 종료되었습니다. 결과는 이 화면에서 계속 확인할 수 있습니다.</p>
                    )}
                </div>
            </div>
        );
    };

    /** 유튜브 없음: 기본 스코어 화면 (모바일 세로 배치) */
    const renderDefaultScoreScreen = () => (
        <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="min-h-full flex flex-col items-center justify-center gap-6 px-4 pt-16 pb-48">
                {matchState ? (
                    <>
                        <div className="text-center">
                            <p className="text-xs font-semibold tracking-widest text-slate-500">LIVE</p>
                            <p className="mt-1 text-sm text-slate-300 font-semibold">
                                {matchState.currentSet ?? 1}세트
                                {(maxSetsOf(matchState) >= 2) && (
                                    <span className="ml-2 text-slate-400">세트 스코어 {leftTeam?.setsWon ?? 0} : {rightTeam?.setsWon ?? 0}</span>
                                )}
                            </p>
                        </div>

                        <div className="w-full max-w-md grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                            <div className="text-center min-w-0">
                                <p className="text-sm sm:text-lg font-bold text-slate-100 truncate">{leftTeam?.name ?? ''}</p>
                                <p className="text-6xl sm:text-8xl font-extrabold tabular-nums drop-shadow-lg" style={{ color: teamColor(leftKey) }}>
                                    {leftTeam?.score ?? 0}
                                </p>
                                {matchState.servingTeam === leftKey && (
                                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-sky-300"><VolleyballIcon className="w-3.5 h-3.5" /> 서빙</p>
                                )}
                            </div>
                            <span className="text-4xl sm:text-6xl font-black text-white/60">:</span>
                            <div className="text-center min-w-0">
                                <p className="text-sm sm:text-lg font-bold text-slate-100 truncate">{rightTeam?.name ?? ''}</p>
                                <p className="text-6xl sm:text-8xl font-extrabold tabular-nums drop-shadow-lg" style={{ color: teamColor(rightKey) }}>
                                    {rightTeam?.score ?? 0}
                                </p>
                                {matchState.servingTeam === rightKey && (
                                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-sky-300"><VolleyballIcon className="w-3.5 h-3.5" /> 서빙</p>
                                )}
                            </div>
                        </div>

                        <div className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4">
                            <p className="text-xs font-semibold text-slate-400 mb-2">⚡ 최근 득점</p>
                            {recentScoringEvents.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-2">아직 득점 기록이 없습니다.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {recentScoringEvents.map((ev, idx) => (
                                        <div key={ev.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${idx === 0 ? 'bg-slate-800 border border-slate-600/60' : 'bg-slate-800/50'}`}>
                                            {ev.team && (
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: teamColor(ev.team) }} />
                                            )}
                                            <span className={`min-w-0 break-words ${idx === 0 ? 'text-sm sm:text-base font-bold text-white' : 'text-xs sm:text-sm text-slate-300'}`}>
                                                {ev.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <p className="text-slate-300 font-semibold mb-2">📡 경기 데이터 수신 대기 중</p>
                        <p className="text-slate-500 text-sm">잠시만 기다려 주세요.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 overflow-hidden bg-black">
            {/* Layer 0: 결과 화면 > YouTube > 기본 스코어 화면 */}
            <div className="absolute inset-0 z-0">
                {gameOver ? (
                    renderResultScreen()
                ) : embedUrl ? (
                    <iframe
                        title="Live Broadcast Video"
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                ) : (
                    renderDefaultScoreScreen()
                )}
            </div>

            {/* Layer 1+: 오버레이 UI — 컨테이너는 클릭 통과, 버튼만 상호작용 */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {/* UI 토글 */}
                <button
                    type="button"
                    onClick={() => setShowUi((v) => !v)}
                    className="fixed right-3 top-3 z-[9999] pointer-events-auto bg-black/50 hover:bg-black/70 border border-slate-600/60 text-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold shadow-lg"
                    title="중계 UI 숨기기/표시"
                >
                    {showUi ? '🙈 UI 숨기기' : '👁 UI 표시'}
                </button>

                {/* 상단 스코어 바: 유튜브 영상 위에만 오버레이 (기본 화면·결과 화면은 자체 스코어 표시) */}
                {showUi && matchState && !gameOver && !!embedUrl && (
                    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-md border-b border-white/10 pointer-events-auto">
                            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{leftTeam?.name ?? ''}</p>
                                    <p className="text-[10px] sm:text-xs text-slate-300/90 mt-0.5 truncate">
                                        세트 {matchState.currentSet ?? 1}
                                        {maxSetsOf(matchState) >= 2 && (
                                            <span className="ml-1.5 text-slate-400">[{leftTeam?.setsWon ?? 0}:{rightTeam?.setsWon ?? 0}]</span>
                                        )}
                                        {matchState.servingTeam && (
                                            <span className="ml-1.5 inline-flex items-center gap-1 text-sky-300">
                                                <VolleyballIcon className="w-3 h-3" />
                                                {(matchState.servingTeam === leftKey ? leftTeam?.name : rightTeam?.name) ?? ''} 서빙
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 sm:gap-4 shrink-0">
                                    <span className="text-3xl sm:text-6xl font-extrabold tabular-nums drop-shadow-lg" style={{ color: teamColor(leftKey) }}>
                                        {leftTeam?.score ?? 0}
                                    </span>
                                    <span className="text-xl sm:text-4xl font-black text-white/80">:</span>
                                    <span className="text-3xl sm:text-6xl font-extrabold tabular-nums drop-shadow-lg" style={{ color: teamColor(rightKey) }}>
                                        {rightTeam?.score ?? 0}
                                    </span>
                                </div>
                                <div className="min-w-0 text-right">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{rightTeam?.name ?? ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {toastText && (
                    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+7rem)] left-1/2 z-[200] -translate-x-1/2 pointer-events-none w-[calc(100vw-2rem)] max-w-md">
                        <div className="bg-black/60 backdrop-blur-md border border-white/15 text-white rounded-2xl px-4 py-3 shadow-2xl">
                            <p className="font-bold text-sm sm:text-lg text-center break-words">{toastText}</p>
                        </div>
                    </div>
                )}

                {/* 채팅: 최소화 시 '채팅 열기' FAB */}
                {showUi && chatAllowed && chatMinimized && (
                    <button
                        type="button"
                        onClick={() => setChatMinimized(false)}
                        className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-[9999] pointer-events-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-500/70 shadow-2xl text-slate-100 font-semibold text-sm"
                        title="채팅 열기"
                    >
                        💬 채팅 열기
                    </button>
                )}

                {showUi && chatAllowed && !chatMinimized && (
                    <div className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-[9998] pointer-events-auto flex flex-col w-[min(320px,calc(100vw-1.5rem))] max-h-[min(45vh,460px)] bg-black/60 backdrop-blur-md rounded-xl border border-slate-500/50 shadow-2xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-600/60 flex items-center justify-between gap-2 shrink-0">
                            <span className="text-xs font-semibold text-slate-200">💬 실시간 채팅</span>
                            <button
                                type="button"
                                onClick={() => setChatMinimized(true)}
                                className="px-2 py-1 rounded bg-slate-700/90 hover:bg-slate-600 text-slate-200 text-xs pointer-events-auto"
                            >
                                🔽 최소화
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[80px]">
                            {receivedChatMessages.length === 0 ? (
                                <p className="text-slate-400 text-xs text-center py-2">아직 채팅이 없습니다.</p>
                            ) : (
                                receivedChatMessages.map((msg) =>
                                    msg.isSystem || msg.sender === 'SYSTEM' ? (
                                        <p key={msg.id} className="text-gray-400 text-xs text-center py-0.5">{msg.text}</p>
                                    ) : (
                                        <div key={msg.id} className="flex flex-wrap gap-1 text-xs">
                                            <span className="font-semibold shrink-0" style={{ color: msg.senderColor ?? '#eab308' }}>
                                                {msg.sender}:
                                            </span>
                                            <span className="text-slate-100 break-words">{msg.text}</span>
                                        </div>
                                    ),
                                )
                            )}
                        </div>
                        <div className="p-2 border-t border-slate-600/60 bg-black/40 shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value.slice(0, 30))}
                                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                    placeholder="메시지 입력..."
                                    disabled={chatCooldown > 0}
                                    className="flex-1 min-w-0 bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-500 pointer-events-auto"
                                />
                                <button
                                    type="button"
                                    onClick={sendChatMessage}
                                    disabled={chatCooldown > 0 || !chatInput.trim()}
                                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-xs font-medium rounded-lg pointer-events-auto shrink-0"
                                >
                                    {chatCooldown > 0 ? `${chatCooldown}초` : '전송'}
                                </button>
                            </div>
                            <div className="flex justify-center gap-2 mt-2 pointer-events-auto">
                                {EMOJI_POOL.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => sendReaction?.(emoji)}
                                        className="w-9 h-9 rounded-full bg-slate-800/90 hover:bg-slate-700 text-lg border border-slate-600 pointer-events-auto"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {receivedReactions.length > 0 && (
                    <div className="absolute inset-0 z-[50] flex items-end justify-center pb-28 pointer-events-none">
                        {receivedReactions.map((r) => (
                            <span
                                key={r.id}
                                className="text-5xl animate-float-up pointer-events-none"
                                style={{ textShadow: '0 0 20px rgba(255,255,255,0.8)' }}
                                onAnimationEnd={() => removeReceivedReaction(r.id)}
                            >
                                {r.emoji}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

function maxSetsOf(state: { maxSets?: number } | null | undefined): number {
    return state?.maxSets ?? 1;
}

export default LiveBroadcastScreen;
