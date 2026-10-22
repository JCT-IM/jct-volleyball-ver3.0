import React, { useEffect, useMemo, useState } from 'react';
import TeamEmblem from './TeamEmblem';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { useData } from '../contexts/DataContext';
import {
    AnalysisMatchInput,
    CATEGORY_LABEL,
    CATEGORY_ORDER,
    CATEGORY_SHORT,
    ClassifiedTeamMatch,
    MIN_SAMPLE_ATTEMPTS,
    MatchCategory,
    MetricReading,
    PooledRate,
    TREND_METRICS,
    TeamBucket,
    TeamRates,
    TeamSetRef,
    TrendMetric,
    bucketFrom,
    buildTeamAiSummary,
    buildTrendPoints,
    categorizeTeamMatches,
    formatPercent,
    formatRatio,
    peerClassRates,
    ratesFromBucket,
    readServeReceive,
} from '../utils/teamDetailStats';

interface TeamDetailModalProps {
    teamName: string;
    className: string;
    teamCount: number;
    emblem?: string;
    color?: string;
    matches: AnalysisMatchInput[];
    teamSets: TeamSetRef[];
    onClose: () => void;
}

const comparisonRows: { label: string; read: (bucket: TeamBucket, rates: TeamRates) => string }[] = [
    { label: '경기수', read: (bucket) => String(bucket.games) },
    { label: '승', read: (bucket) => String(bucket.wins) },
    { label: '패', read: (bucket) => String(bucket.losses) },
    { label: '승률', read: (_bucket, rates) => formatPercent(rates.winRate) },
    { label: '서브 성공률', read: (_bucket, rates) => formatPercent(rates.serveSuccessRate) },
    {
        label: '리시브 성공률(나이스 기준)',
        read: (_bucket, rates) => rates.receiveAttempts > 0
            ? `${formatPercent(rates.receiveSuccessRate)} (${rates.receiveSuccesses}/${rates.receiveAttempts})`
            : formatPercent(rates.receiveSuccessRate),
    },
    { label: '득점률', read: (_bucket, rates) => formatRatio(rates.scoringRate) },
    { label: '총득점', read: (bucket) => String(bucket.pointsFor) },
    { label: '총실점', read: (bucket) => String(bucket.pointsAgainst) },
    { label: '서브 범실', read: (bucket) => String(bucket.serviceFaults) },
    { label: '리시브(나이스 수비)', read: (bucket) => String(bucket.digs) },
];

const SummaryCard = ({ label, value, count, hint, note }: { label: string; value: string; count?: string | null; hint?: string; note?: string }) => (
    <div className="bg-slate-800 p-3 rounded-lg text-center border border-transparent">
        <p className="text-slate-400 text-sm leading-snug">{label}</p>
        <div className="flex items-baseline justify-center gap-2 mt-1">
            <p className="text-3xl font-bold text-sky-400">{value}</p>
            {count ? <p className="text-sm font-mono text-slate-300">{count}</p> : null}
        </div>
        {hint ? <p className="text-[11px] text-slate-500 mt-1">{hint}</p> : null}
        {note ? <p className="text-[11px] text-slate-400 mt-0.5">{note}</p> : null}
    </div>
);

const averageHint = (pooled: PooledRate) => (
    pooled.rate == null ? '반 평균 기록 없음' : `반 평균 ${formatPercent(pooled.rate)}`
);

const ReadingGroup = ({ title, items }: { title: string; items: MetricReading[] }) => (
    <div>
        <h4 className="text-xs font-semibold text-slate-400 mb-1">{title}</h4>
        {items.length === 0 ? (
            <p className="text-sm text-slate-500">해당하는 지표가 없습니다.</p>
        ) : (
            <ul className="space-y-1">
                {items.map(item => (
                    <li key={item.key} className="text-sm text-slate-200">
                        {item.label} {item.rateText}{item.countText ? ` (${item.countText})` : ''} · {item.averageText} · {item.changeText}
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
    teamName,
    className,
    teamCount,
    emblem,
    color,
    matches,
    teamSets,
    onClose,
}) => {
    const { showToast } = useData();
    const [trendCategory, setTrendCategory] = useState<'all' | MatchCategory>('all');
    const [compareA, setCompareA] = useState<MatchCategory>('assessment1');
    const [compareB, setCompareB] = useState<MatchCategory>('assessment2');
    const [metric, setMetric] = useState<TrendMetric>('points');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        setTrendCategory('all');
        setCompareA('assessment1');
        setCompareB('assessment2');
        setMetric('points');
    }, [teamName]);

    const classified = useMemo(
        () => categorizeTeamMatches(teamName, className, teamCount, matches, teamSets),
        [teamName, className, teamCount, matches, teamSets],
    );

    const buckets = useMemo(() => {
        const of = (category: MatchCategory | 'all'): TeamBucket => bucketFrom(
            classified.filter((row: ClassifiedTeamMatch) => category === 'all' || row.category === category).map(row => row.snapshot),
        );
        return {
            all: of('all'),
            practice: of('practice'),
            assessment1: of('assessment1'),
            assessment2: of('assessment2'),
        };
    }, [classified]);

    const overallRates = useMemo(() => ratesFromBucket(buckets.all), [buckets]);
    const ratesByCategory = useMemo(() => ({
        practice: ratesFromBucket(buckets.practice),
        assessment1: ratesFromBucket(buckets.assessment1),
        assessment2: ratesFromBucket(buckets.assessment2),
    }), [buckets]);
    const peers = useMemo(
        () => peerClassRates(className, teamName, matches, teamSets),
        [className, teamName, matches, teamSets],
    );
    const reading = useMemo(() => readServeReceive({
        overall: overallRates,
        sideA: ratesByCategory[compareA],
        sideB: ratesByCategory[compareB],
        labelA: CATEGORY_SHORT[compareA],
        labelB: CATEGORY_SHORT[compareB],
        classServeAverage: peers.serve.rate,
        classReceiveAverage: peers.receive.rate,
        classServeAttempts: peers.serve.attempts,
        classReceiveAttempts: peers.receive.attempts,
    }), [overallRates, ratesByCategory, compareA, compareB, peers]);
    const trend = useMemo(
        () => buildTrendPoints(classified, trendCategory, metric, teamName),
        [classified, trendCategory, metric, teamName],
    );
    const aiText = useMemo(
        () => buildTeamAiSummary({
            round1: ratesByCategory.assessment1,
            round2: ratesByCategory.assessment2,
            classServeAverage: peers.serve.rate,
            classReceiveAverage: peers.receive.rate,
        }),
        [ratesByCategory, peers],
    );

    const copyForAi = async () => {
        try {
            await navigator.clipboard.writeText(aiText);
            showToast?.('팀 요약을 복사했습니다.', 'success');
            return;
        } catch {
            try {
                const area = document.createElement('textarea');
                area.value = aiText;
                document.body.appendChild(area);
                area.select();
                const copied = document.execCommand('copy');
                document.body.removeChild(area);
                if (copied) {
                    showToast?.('팀 요약을 복사했습니다.', 'success');
                    return;
                }
            } catch {
                /* 아래 실패 토스트 */
            }
            showToast?.('복사에 실패했습니다.', 'error');
        }
    };

    const sideBucket = (category: MatchCategory) => buckets[category];
    const sideRates = (category: MatchCategory) => ratesByCategory[category];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-white border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#3b82f6' }} />
                        <TeamEmblem emblem={emblem} color={color} className="w-10 h-10 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-2xl font-bold text-[#00A3FF] truncate">{teamName}</h2>
                            <p className="text-sm text-slate-400">{className} · {buckets.all.games}경기</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={copyForAi}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 px-3 rounded"
                        >
                            AI에게 복사
                        </button>
                        <button type="button" onClick={onClose} className="text-3xl font-bold text-slate-500 hover:text-white leading-none">&times;</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <SummaryCard
                        label="서브 성공률"
                        value={formatPercent(overallRates.serveSuccessRate)}
                        hint={averageHint(peers.serve)}
                        note={overallRates.serveAttempts < MIN_SAMPLE_ATTEMPTS ? '표본 적음' : undefined}
                    />
                    <SummaryCard
                        label="리시브 성공률(나이스 기준)"
                        value={formatPercent(overallRates.receiveSuccessRate)}
                        count={overallRates.receiveAttempts > 0 ? `${overallRates.receiveSuccesses}/${overallRates.receiveAttempts}` : null}
                        hint={averageHint(peers.receive)}
                        note={overallRates.receiveAttempts < MIN_SAMPLE_ATTEMPTS ? '표본 적음' : undefined}
                    />
                    <SummaryCard
                        label="득점률"
                        value={formatRatio(overallRates.scoringRate)}
                    />
                    <SummaryCard
                        label="승률"
                        value={formatPercent(overallRates.winRate)}
                    />
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-200">지표 읽기</h3>
                    <ReadingGroup title="반 평균보다 높은 지표" items={reading.higher} />
                    <ReadingGroup title="반 평균보다 낮은 지표" items={reading.lower} />
                    {reading.same.length > 0 ? <ReadingGroup title="반 평균과 같은 지표" items={reading.same} /> : null}
                    {reading.noBaseline.length > 0 ? (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-400 mb-1">반 평균 시도가 적어 비교하지 않은 지표</h4>
                            <ul className="space-y-1">
                                {reading.noBaseline.map(item => (
                                    <li key={item.key} className="text-sm text-slate-200">
                                        {item.label} {item.rateText}{item.countText ? ` (${item.countText})` : ''} · {item.averageText}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {reading.smallSample.length > 0 ? (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-400 mb-1">표본 적음</h4>
                            <ul className="space-y-1">
                                {reading.smallSample.map(item => (
                                    <li key={item.key} className="text-sm text-slate-300">
                                        {item.label} {item.rateText}{item.countText ? ` (${item.countText})` : ''} · 표본 적음 (시도 {item.attempts}회)
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center gap-2 mb-3 flex-wrap">
                        <div>
                            <h3 className="font-semibold text-slate-300">경기별 추이</h3>
                            {trend.total > 10 ? <p className="text-[11px] text-slate-500">최근 10경기</p> : null}
                        </div>
                        <select
                            value={metric}
                            onChange={e => setMetric(e.target.value as TrendMetric)}
                            className="bg-slate-700 text-xs p-1 rounded text-white"
                        >
                            {TREND_METRICS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>
                    {trend.points.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">이 구분의 경기가 없습니다.</p>
                    ) : (
                        <PerformanceTrendChart data={trend.points} dataKey={trend.dataKey} barWhenAtMost={5} />
                    )}
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-slate-300 mb-1">구분 보기</h3>
                    <p className="text-[11px] text-slate-500 mb-3">경기 유형을 고르면 위 추이 차트에 반영됩니다.</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setTrendCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${trendCategory === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                        >
                            전체
                        </button>
                        {CATEGORY_ORDER.map(category => (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setTrendCategory(category)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${trendCategory === category ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                            >
                                {CATEGORY_LABEL[category]}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <select
                            value={compareA}
                            onChange={e => setCompareA(e.target.value as MatchCategory)}
                            className="bg-slate-700 border border-slate-600 rounded-md py-1.5 px-3 text-sm text-white"
                        >
                            {CATEGORY_ORDER.map(category => <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>)}
                        </select>
                        <span className="text-slate-400 text-sm">나란히 비교</span>
                        <select
                            value={compareB}
                            onChange={e => setCompareB(e.target.value as MatchCategory)}
                            className="bg-slate-700 border border-slate-600 rounded-md py-1.5 px-3 text-sm text-white"
                        >
                            {CATEGORY_ORDER.map(category => <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-sm">
                            <thead className="text-slate-400">
                                <tr className="border-b border-slate-700">
                                    <th className="p-2 text-left">지표</th>
                                    <th className="p-2">{CATEGORY_LABEL[compareA]}</th>
                                    <th className="p-2">{CATEGORY_LABEL[compareB]}</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-200">
                                {comparisonRows.map(row => (
                                    <tr key={row.label} className="border-b border-slate-800 last:border-0">
                                        <td className="p-2 text-left text-slate-300">{row.label}</td>
                                        <td className="p-2 font-mono">{row.read(sideBucket(compareA), sideRates(compareA))}</td>
                                        <td className="p-2 font-mono">{row.read(sideBucket(compareB), sideRates(compareB))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-800/40 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-slate-300">AI 요약</h3>
                        <button type="button" onClick={copyForAi} className="text-xs font-bold text-emerald-300 hover:text-emerald-200">AI에게 복사</button>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{aiText}</p>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                    득점률 = 총득점 ÷ 총실점. 승률 = 승수 ÷ 경기수. 서브 성공률 = (서브 득점 + 서브 In) ÷ (서브 득점 + 서브 In + 서브 범실).
                    리시브 성공률(나이스 기준) = 나이스 수비 ÷ (나이스 수비 + 상대 서브 득점). 옆의 개수는 나이스 수비/그 분모입니다.
                    반 평균은 같은 반에서 이 팀을 뺀 다른 팀의 시도를 합쳐 계산합니다. 시도가 5회 미만이면 표본 적음으로 두고 반 평균과 비교하지 않습니다.
                    수행평가 1·2회전은 같은 반 수행평가 경기일을 날짜순으로 앞뒤로 나눕니다. 경기일이 하루뿐이면 앞에서 (팀 수−1)경기를 1회전으로 둡니다.
                </p>
            </div>
        </div>
    );
};
