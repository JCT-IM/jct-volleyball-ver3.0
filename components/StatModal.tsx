import React, { useMemo, useEffect } from 'react';
import { Player } from '../types';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '../hooks/useTranslation';
import { getStatLabel } from '../utils/labelUtils';

interface StatModalProps {
    player: Player;
    onClose: () => void;
    showRealNames: boolean;
    allPlayers?: Player[]; // 반 전체 데이터 (스마트 축 필터링용)
}

const StatModal: React.FC<StatModalProps> = ({ player, onClose, showRealNames, allPlayers = [] }) => {
    const { t } = useTranslation();
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    // 시트 동기화: 동적 평가 항목(최대 2개)만 축에 포함
    const hasSkill1 = Boolean(player.customLabel1) || player.stats.underhand > 0 || allPlayers.some(p => p.stats.underhand > 0);
    const hasSkill2 = Boolean(player.customLabel2) || player.stats.serve > 0 || allPlayers.some(p => p.stats.serve > 0);
    const skill1Label = player.customLabel1 || getStatLabel('underhand', t);
    const skill2Label = player.customLabel2 || getStatLabel('serve', t);

    const chartData = useMemo(() => {
        const baseAxes = [
            { subject: getStatLabel('height', t), value: player.stats.height || 0, fullMark: 100 },
            { subject: getStatLabel('shuttleRun', t), value: player.stats.shuttleRun || 0, fullMark: 100 },
            { subject: getStatLabel('flexibility', t), value: player.stats.flexibility || 0, fullMark: 100 },
            { subject: getStatLabel('fiftyMeterDash', t), value: player.stats.fiftyMeterDash || 0, fullMark: 100 },
        ];
        if (hasSkill1) {
            baseAxes.push({ subject: skill1Label, value: player.stats.underhand || 0, fullMark: 100 });
        }
        if (hasSkill2) {
            baseAxes.push({ subject: skill2Label, value: player.stats.serve || 0, fullMark: 100 });
        }
        return baseAxes;
    }, [player.stats, t, skill1Label, skill2Label, hasSkill1, hasSkill2]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto text-white border border-slate-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#00A3FF]">{player.anonymousName} 능력치</h2>
                        {showRealNames && (
                            <p className="text-slate-400">정보: {player.class}반 {player.studentNumber}번 {player.originalName} ({player.gender})</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-2xl font-bold text-slate-500 hover:text-white">&times;</button>
                </div>
                
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="#475569" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                            <Radar name={player.anonymousName} dataKey="value" stroke="#00A3FF" fill="#00A3FF" fillOpacity={0.6} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(10, 15, 31, 0.9)',
                                    borderColor: '#475569',
                                    borderRadius: '0.5rem'
                                }}
                                labelStyle={{ color: '#f1f5f9' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500 text-center mt-4">
                    * 100점은 현재 입력된 학생들 중 가장 높은 수치를 기준으로 한 상대적 점수입니다.
                </p>
            </div>
        </div>
    );
};

export default StatModal;