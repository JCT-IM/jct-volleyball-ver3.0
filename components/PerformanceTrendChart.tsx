import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/** 학생 상세 '최근 10경기 활약 추이'와 팀 상세 경기별 추이가 함께 쓰는 차트 한 점 */
export type PerformanceTrendPoint = {
    name: string;
    date?: string;
    team?: string;
    opponent?: string;
    result?: string;
    score?: string;
    categoryLabel?: string;
    [key: string]: string | number | undefined;
};

interface PerformanceTrendChartProps {
    data: PerformanceTrendPoint[];
    dataKey: string;
    /**
     * 이 개수 이하이면 막대, 그보다 많으면 선.
     * 학생 상세는 1(경기 2개부터 선 — 기존과 동일). 팀 상세는 5.
     */
    barWhenAtMost?: number;
}

const TrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; payload?: PerformanceTrendPoint }[]; label?: string }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data) return null;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-lg text-xs text-white">
                <p className="font-bold text-[#00A3FF] mb-1">{label}</p>
                <p className="text-slate-300 mb-1">{data.date}</p>
                <div className="border-t border-slate-700 my-1 pt-1 space-y-0.5">
                    {data.categoryLabel ? <p><span className="text-slate-400">구분:</span> {data.categoryLabel}</p> : null}
                    <p><span className="text-slate-400">소속:</span> {data.team}</p>
                    <p><span className="text-slate-400">상대:</span> {data.opponent}</p>
                    <p><span className="text-slate-400">결과:</span> <span className={data.result === '승' ? 'text-green-400' : 'text-red-400'}>{data.result}</span> ({data.score})</p>
                </div>
                <p className="mt-2 font-bold text-white border-t border-slate-700 pt-1">
                    {payload[0].name}: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

/** 학생 상세 활약 추이와 같은 선/막대 차트. 계산은 호출하는 쪽에서 하고, 여기에는 숫자만 넘긴다. */
export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({ data, dataKey, barWhenAtMost = 1 }) => {
    const useLine = data.length > barWhenAtMost;
    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                {useLine ? (
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis allowDecimals={false} stroke="#94a3b8" />
                        <Tooltip content={<TrendTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey={dataKey} stroke="#0ea5e9" strokeWidth={2} />
                    </LineChart>
                ) : (
                    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis allowDecimals={false} stroke="#94a3b8" />
                        <Tooltip content={<TrendTooltip />} />
                        <Legend />
                        <Bar dataKey={dataKey} fill="#0ea5e9" barSize={60} />
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};
