import React, { useEffect, useState } from 'react';

export type PracticeMatchOptions = {
    unlimitedSets: boolean;
    courtChange: boolean;
    decidingSetTo15: boolean;
};

export const DEFAULT_PRACTICE_OPTIONS: PracticeMatchOptions = {
    unlimitedSets: true,
    courtChange: true,
    decidingSetTo15: false,
};

interface PracticeOptionsModalProps {
    isOpen: boolean;
    onConfirm: (options: PracticeMatchOptions) => void;
    onCancel: () => void;
}

const ToggleRow: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    disabledHint?: string;
    onChange: (next: boolean) => void;
}> = ({ label, description, checked, disabled, disabledHint, onChange }) => (
    <div className={`rounded-xl border p-4 transition-colors ${disabled ? 'border-slate-700/60 bg-slate-800/30 opacity-60' : 'border-slate-600 bg-slate-800/70'}`}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-100">{label}</p>
                <p className="mt-1 text-sm text-slate-400">{description}</p>
                {disabled && disabledHint && (
                    <p className="mt-2 text-xs text-amber-400/90">{disabledHint}</p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed ${checked ? 'bg-amber-500' : 'bg-slate-600'}`}
            >
                <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
    </div>
);

const PracticeOptionsModal: React.FC<PracticeOptionsModalProps> = ({ isOpen, onConfirm, onCancel }) => {
    const [options, setOptions] = useState<PracticeMatchOptions>(DEFAULT_PRACTICE_OPTIONS);

    useEffect(() => {
        if (isOpen) setOptions(DEFAULT_PRACTICE_OPTIONS);
    }, [isOpen]);

    if (!isOpen) return null;

    const setUnlimited = (next: boolean) => {
        setOptions(prev => ({
            ...prev,
            unlimitedSets: next,
            // 무제한을 다시 켜면 3세트 규칙은 끔 (상호배타)
            decidingSetTo15: next ? false : prev.decidingSetTo15,
        }));
    };

    const setDecidingSetTo15 = (next: boolean) => {
        setOptions(prev => ({
            ...prev,
            decidingSetTo15: next,
            // D ON → U 자동 OFF
            unlimitedSets: next ? false : prev.unlimitedSets,
        }));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="practice-options-title">
            <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="border-b border-slate-700 px-5 py-4">
                    <h2 id="practice-options-title" className="text-xl font-bold text-amber-400">연습 경기 옵션</h2>
                    <p className="mt-1 text-sm text-slate-400">경기를 시작하기 전에 규칙을 선택하세요.</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                    <ToggleRow
                        label="무제한 세트 진행"
                        description="켜면 세트가 끝나도 계속 다음 세트로 진행할 수 있습니다. 끄면 정해진 세트 수에서 승자가 결정됩니다."
                        checked={options.unlimitedSets}
                        disabled={options.decidingSetTo15}
                        disabledHint="3세트 15점 규칙이 켜져 있어 무제한 세트를 사용할 수 없습니다."
                        onChange={setUnlimited}
                    />
                    <ToggleRow
                        label="코트 체인지"
                        description="켜면 세트 종료 시 좌우 코트를 바꾸고, 결승 세트에서는 8점 도달 시 추가 스왑합니다."
                        checked={options.courtChange}
                        onChange={next => setOptions(prev => ({ ...prev, courtChange: next }))}
                    />
                    <ToggleRow
                        label="3세트 15점 규칙"
                        description="켜면 3판 2선승(1·2세트는 설정 목표점, 3세트는 15점+2점차)으로 진행합니다. 끄면 단판입니다."
                        checked={options.decidingSetTo15}
                        onChange={setDecidingSetTo15}
                    />
                </div>
                <div className="flex gap-2 border-t border-slate-700 px-5 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-600"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(options)}
                        className="flex-1 rounded-xl bg-amber-600 py-3 font-bold text-white hover:bg-amber-500"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PracticeOptionsModal;
