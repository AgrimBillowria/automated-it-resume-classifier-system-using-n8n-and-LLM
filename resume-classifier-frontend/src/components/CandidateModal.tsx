import React from 'react';

interface CandidateModalProps {
    result: {
        class_label: string;
        confidence_score: number;
        verdict: string;
        filename?: string;
        parsed_data: {
            skills: string;
            experience_years: number;
            education: string;
            email: string;
            name?: string;
        };
        error?: string;
    } | null;
    onClose: () => void;
}

const CandidateModal: React.FC<CandidateModalProps> = ({ result, onClose }) => {
    if (!result) return null;

    const isIT = result.class_label === 'IT Resume';
    const confidencePercent = Math.round(result.confidence_score * 100);
    const displayName = result.parsed_data?.name || (result.filename ? result.filename.replace(/\.pdf$/i, '') : 'Candidate Details');

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
                <div className="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-950 z-10">
                    <div>
                        <h2 className="text-xl font-['Outfit'] font-bold text-white/90 tracking-wide flex items-center gap-2">
                            {displayName}
                            {result.error && <span className="text-red-400 text-sm">(Error)</span>}
                        </h2>
                        <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mt-1">
                            {result.class_label} • {confidencePercent}% Match
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                    {result.error ? (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 text-red-400">
                            <strong>Error:</strong> {result.error}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-zinc-900 border border-zinc-800 p-4">
                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Verdict</h4>
                                    <p className={`text-lg font-['Outfit'] font-bold ${isIT ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {result.verdict}
                                    </p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-4">
                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Experience</h4>
                                    <p className="text-lg font-['Outfit'] font-bold text-white/90">
                                        {result.parsed_data.experience_years} Years
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Education</h4>
                                <div className="bg-zinc-900 border border-zinc-800 p-4 text-white/70 text-sm">
                                    {result.parsed_data.education}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Contact</h4>
                                <div className="flex items-center gap-2 text-white/70 bg-zinc-900 border border-zinc-800 p-3 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                    <span>📧</span> {result.parsed_data.email}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Skills Detected</h4>
                                <div className="bg-zinc-900 border border-zinc-800 p-4 text-sm leading-relaxed text-white/60 font-mono text-justify break-words">
                                    {result.parsed_data.skills}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 md:p-6 border-t border-zinc-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-black font-bold tracking-[0.15em] uppercase text-xs hover:bg-zinc-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CandidateModal;
