import React from 'react';

interface ResultCardProps {
    result: {
        class_label: string;
        confidence_score: number;
        verdict: string;
        class_id: number;
        filename?: string;
        parsed_data: {
            skills: string;
            experience_years: number;
            education: string;
            email: string;
            name?: string;
        };
        error?: string;
    };
    onClick: () => void;
    theme?: 'black' | 'white';
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onClick, theme = 'black' }) => {
    const isIT = result.class_id === 1; // Use class_id for reliable check
    const confidencePercent = Math.round(result.confidence_score * 100);
    const displayName = result.parsed_data?.name || (result.filename ? result.filename.replace(/\.pdf$/i, '') : 'Unknown');
    const isDark = theme === 'black';

    // Determine card border color based on verdict/confidence
    let borderColor = 'border-l-4 border-zinc-700';
    if (result.error) borderColor = 'border-l-4 border-red-500';
    else if (isIT && confidencePercent > 70) borderColor = 'border-l-4 border-emerald-500';
    else if (isIT) borderColor = 'border-l-4 border-blue-500';
    else borderColor = 'border-l-4 border-orange-500';

    // Dynamic Base Styles
    const cardBase = isDark
        ? 'bg-zinc-900/95 backdrop-blur-md hover:bg-zinc-800 border-white/5 shadow-lg hover:shadow-xl'
        : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-md hover:shadow-lg';

    // Use slightly different colors for light mode text to ensure readability
    const textPrimary = isDark ? 'text-white group-hover:text-white' : 'text-zinc-900';
    const textSecondary = isDark ? 'text-zinc-400' : 'text-zinc-500';

    return (
        <div
            className={`
                ${cardBase}
                rounded-sm p-5 cursor-pointer 
                transition-all duration-300 ease-out 
                ${borderColor} group relative overflow-hidden
                border-r border-t border-b
            `}
            onClick={onClick}
        >
            {/* Hover Glow Effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-r ${isIT ? 'from-emerald-500/30 to-transparent' : 'from-orange-500/30 to-transparent'}`} />

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="overflow-hidden pr-2 flex-1">
                    <h3 className={`font-['Outfit'] font-semibold truncate text-sm md:text-base tracking-wide transition-colors ${textPrimary}`} title={displayName}>
                        {displayName}
                    </h3>
                    <p className={`text-[9px] md:text-[10px] ${textSecondary} tracking-[0.15em] uppercase font-medium mt-0.5`}>{result.class_label}</p>
                </div>
                {!result.error && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 tracking-wider rounded-sm 
                        ${confidencePercent > 80 ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border-emerald-200') :
                            confidencePercent > 50 ? (isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-200') :
                                (isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-100 text-orange-700 border-orange-200')
                        } border shadow-sm`}>
                        {confidencePercent}%
                    </span>
                )}
            </div>

            {result.error ? (
                <div className="text-[11px] text-red-500 mt-2 tracking-widest uppercase font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    Validation Failed
                </div>
            ) : (
                <div className="mt-4 space-y-2 relative z-10">
                    <div className={`flex items-center justify-between text-xs ${textSecondary}`}>
                        <span className="tracking-wider uppercase font-medium text-[10px]">Exp</span>
                        <span className={`font-['Outfit'] font-medium ${textPrimary}`}>{result.parsed_data.experience_years} yrs</span>
                    </div>
                    <div className={`flex items-center justify-between text-xs ${textSecondary}`}>
                        <span className="tracking-wider uppercase font-medium text-[10px]">Status</span>
                        <span className={`font-bold tracking-wide uppercase text-[11px] ${isIT ? (isDark ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.3)]' : 'text-emerald-600') : (isDark ? 'text-rose-400 drop-shadow-[0_0_3px_rgba(251,113,133,0.3)]' : 'text-rose-600')}`}>
                            {result.verdict}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultCard;
