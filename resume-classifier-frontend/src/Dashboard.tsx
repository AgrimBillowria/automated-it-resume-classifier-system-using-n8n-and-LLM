import React, { useState, useEffect, useRef } from 'react';
import { Upload, Instagram, Linkedin, FolderInput } from 'lucide-react';
import BlackThemeCanvas from './components/BlackThemeCanvas';
import WhiteThemeCanvas from './components/WhiteThemeCanvas';
import ParticleText from './components/ParticleText';
import ResultCard from './components/ResultCard';
import CandidateModal from './components/CandidateModal';

interface FormData {
    skills: string;
    experience: string;
    education: string;
}

interface PredictionResult {
    verdict: string;
    confidence_score: number;
    class_id: number;
    class_label: string;
    parsed_data: {
        skills: string;
        experience_years: number;
        education: string;
        email: string;
    };
    filename?: string;
    error?: string;
}

interface Stats {
    total_analyzed: number;
    it_candidates: number;
    avg_confidence_percent: number;
}

const Dashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'manual' | 'upload' | 'folder'>('manual');
    const [currentTheme, setCurrentTheme] = useState<'black' | 'white'>('black');

    // Design State
    const bgRef = useRef<HTMLDivElement>(null);

    // Theme Configuration
    const themes = {
        name: 'Black Edition',
        bg: 'bg-black',
        text: 'text-white',
        textSecondary: 'text-zinc-400', // Lighter for better contrast
        border: 'border-zinc-800',
        inputBg: 'bg-transparent',
        cardBg: 'bg-black/20 backdrop-blur-sm',
        button: 'bg-white text-black hover:bg-zinc-200',
        accent: 'bg-white',
        success: 'text-white',
        failure: 'text-zinc-400',
        highlight: 'bg-red-600'
    },
        white: {
            name: 'White Edition',
            bg: 'bg-white',
            text: 'text-black',
            textSecondary: 'text-zinc-400',
            border: 'border-zinc-200',
            inputBg: 'bg-transparent',
            cardBg: 'bg-white/10 backdrop-blur-sm',
            button: 'bg-black text-white hover:bg-zinc-800',
            accent: 'bg-black',
            success: 'text-black',
            failure: 'text-zinc-400',
            highlight: 'bg-green-600'
        },
};

const theme = themes[currentTheme];

// Optimized Parallax Logic using useRef (No Re-renders)
useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!bgRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 30;

        // Direct DOM manipulation for performance
        bgRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.1)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
}, []);

// Manual Form State
const [formData, setFormData] = useState<FormData>({
    skills: '',
    experience: '',
    education: ''
});

// Upload State
const [file, setFile] = useState<File | null>(null);
const [folderFiles, setFolderFiles] = useState<FileList | null>(null);

// Common State
const [result, setResult] = useState<PredictionResult | null>(null);
const [batchResults, setBatchResults] = useState<PredictionResult[]>([]);
const [selectedCandidate, setSelectedCandidate] = useState<PredictionResult | null>(null);

const [loading, setLoading] = useState(false);
const [error, setError] = useState<string>('');
const [stats, setStats] = useState<Stats>({
    total_analyzed: 0,
    it_candidates: 0,
    avg_confidence_percent: 0
});

const fetchStats = async () => {
    try {
        const res = await fetch('http://localhost:5003/stats');
        if (res.ok) {
            const data = await res.json();
            setStats(data);
        }
    } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3f4a49a6-6637-4ac7-8d83-4712f4ccc879', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Dashboard.tsx', message: 'fetchStats failed', data: { err: String(err), name: err instanceof Error ? err.name : '' }, timestamp: Date.now(), hypothesisId: 'H3', runId: 'run1' }) }).catch(() => { });
        // #endregion
        console.error("Failed to fetch stats", err);
    }
};

useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3f4a49a6-6637-4ac7-8d83-4712f4ccc879', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Dashboard.tsx', message: 'Dashboard mounted', data: {}, timestamp: Date.now(), hypothesisId: 'H3', runId: 'run1' }) }).catch(() => { });
    // #endregion
    fetchStats();
}, []);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
        ...formData,
        [e.target.name]: e.target.value
    });
};

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
        setError('');
    }
};

const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setFolderFiles(e.target.files);
        setError('');
    }
};

const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setBatchResults([]);

    try {
        let url = 'http://localhost:5003/predict';
        let options: RequestInit = {};

        if (activeTab === 'manual') {
            if (!formData.skills || !formData.experience || !formData.education) {
                setError('Please fill in all fields');
                setLoading(false);
                return;
            }

            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    skills: formData.skills,
                    experience_years: parseFloat(formData.experience),
                    education: formData.education
                })
            };
        } else if (activeTab === 'upload') {
            // Single File Upload
            if (!file) {
                setError('Please select a PDF file');
                setLoading(false);
                return;
            }
            const data = new FormData();
            data.append('file', file);

            url = 'http://localhost:5003/predict_pdf';
            options = {
                method: 'POST',
                body: data
            };
        } else if (activeTab === 'folder') {
            // Batch Upload
            if (!folderFiles || folderFiles.length === 0) {
                setError('Please select a folder with PDF files');
                setLoading(false);
                return;
            }

            const data = new FormData();
            // Filter only PDFs if possible or verify on backend
            let pdfCount = 0;
            for (let i = 0; i < folderFiles.length; i++) {
                if (folderFiles[i].type === 'application/pdf' || folderFiles[i].name.endsWith('.pdf')) {
                    data.append('files[]', folderFiles[i]);
                    pdfCount++;
                }
            }

            if (pdfCount === 0) {
                setError('No PDF files found in the selected folder');
                setLoading(false);
                return;
            }

            url = 'http://localhost:5003/predict_batch_pdf';
            options = {
                method: 'POST',
                body: data
            };
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Network response was not ok');
        }

        const data = await response.json();

        if (activeTab === 'folder') {
            if (data.results) {
                setBatchResults(data.results);
            }
        } else {
            setResult(data);
        }

        fetchStats();
    } catch (err: any) {
        setError(err.message || 'Error connecting to API.');
        console.error(err);
    } finally {
        setLoading(false);
    }
};

return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-colors duration-700 ${theme.bg} ${theme.text} font-['Inter'] selection:${theme.accent} selection:text-white`}>

        {/* --- TOP RIGHT THEME SWITCHER --- */}
        <div className="absolute top-6 right-6 z-50 flex gap-2">
            {(Object.keys(themes) as Array<keyof typeof themes>).map((key) => (
                <button
                    key={key}
                    onClick={() => setCurrentTheme(key)}
                    className={`w-6 h-6 rounded-full border transition-all duration-300 hover:scale-110 ${currentTheme === key ? `border-[${theme.text}] scale-110 shadow-lg` : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                    style={{
                        backgroundColor: key === 'white' ? '#fff' : '#000',
                    }}
                    title={`${key.charAt(0).toUpperCase() + key.slice(1)} Edition`}
                />
            ))}
        </div>

        {/* --- DYNAMIC BACKGROUND --- */}
        <div
            ref={bgRef}
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
                background: currentTheme === 'white' ? '#fff' : '#000'
            }}
        >
            {/* Granular Noise (Black/White) */}
            <div className="absolute inset-0 opacity-[0.05]"
                style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}>
            </div>
        </div>

        {/* --- MAGNETIC HEMISPHERE CANVAS (White Edition) --- */}
        {currentTheme === 'white' && <WhiteThemeCanvas />}

        {/* --- AERODYNAMIC FLOW CANVAS (Black Edition) --- */}
        {currentTheme === 'black' && <BlackThemeCanvas />}

        {/* --- MAIN CONTENT --- */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">

            {/* Header */}
            <div className="flex flex-col items-center mb-4 space-y-1 animate-fade-in">

                {/* Social Icons */}
                <div className="flex gap-6 mb-1">
                    <a
                        href="https://www.instagram.com/agrimbillowria/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-all duration-300 hover:scale-110 hover:opacity-80 ${currentTheme === 'white' ? 'text-black' : 'text-white'}`}
                    >
                        <Instagram size={18} strokeWidth={1.5} />
                    </a>
                    <a
                        href="https://www.linkedin.com/in/agrimbillowria01/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-all duration-300 hover:scale-110 hover:opacity-80 ${currentTheme === 'white' ? 'text-black' : 'text-white'}`}
                    >
                        <Linkedin size={18} strokeWidth={1.5} />
                    </a>
                </div>

                <div className={`h-[1px] w-24 ${currentTheme === 'white' ? 'bg-black/20' : 'bg-white/20'} mb-1`}></div>
                <div className="text-4xl md:text-6xl font-bold font-['Outfit'] tracking-[0.2em] uppercase text-center transition-colors duration-500 min-h-[60px] flex items-center justify-center">
                    {currentTheme === 'black' ? (
                        <ParticleText
                            segments={[
                                { text: "RESUME", fontWeight: "bold", color: "white" },
                                { text: "CLASSIFIER", fontWeight: "300", color: "rgba(255, 255, 255, 0.8)" }
                            ]}
                            fontSize={60}
                            letterSpacing={0.2}
                        />
                    ) : (
                        <>
                            Resume<span className={`font-light opacity-50 ${theme.text}`}>Classifier</span>
                        </>
                    )}
                </div>
                <div className={`flex items-center gap-4 text-xs font-medium tracking-[0.3em] ${theme.textSecondary} uppercase transition-colors duration-500`}>
                    <span>{theme.name}</span>
                    <span className={`w-1 h-1 rounded-full ${theme.bg === 'bg-white' ? 'bg-black' : 'bg-white/50'}`}></span>
                    <span>Model I</span>
                </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 border-t ${theme.border} pt-3 transition-colors duration-500`}>

                {/* LEFT COLUMN: Controls */}
                <div className="lg:col-span-4 space-y-6">

                    <div className="space-y-4">
                        <div className={`flex items-baseline justify-between border-b ${theme.border} pb-2 transition-colors duration-500`}>
                            <h2 className="text-xl font-['Outfit'] tracking-widest uppercase">
                                01. Configuration
                            </h2>
                        </div>

                        <div className="flex gap-4">
                            {[
                                { id: 'manual', label: 'Manual' },
                                { id: 'upload', label: 'Single' },
                                { id: 'folder', label: 'Folder' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`text-xs tracking-[0.2em] uppercase transition-all duration-300 ${activeTab === tab.id
                                        ? `font-bold border-b-2 ${theme.text} pb-1`
                                        : `${theme.textSecondary} hover:opacity-70`
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'manual' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="group">
                                        <label className={`block text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase mb-2`}>Candidate Skills</label>
                                        <input
                                            type="text"
                                            name="skills"
                                            value={formData.skills}
                                            onChange={handleInputChange}
                                            placeholder="ENTER SKILLS..."
                                            className={`w-full ${theme.inputBg} border-b ${theme.border} py-2 text-base font-['Outfit'] tracking-wide ${theme.text} focus:outline-none focus:border-current transition-colors placeholder-opacity-30 rounded-none`}
                                            style={{ caretColor: currentTheme === 'white' ? '#000' : '#fff' }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="group">
                                            <label className={`block text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase mb-2`}>Experience</label>
                                            <input
                                                type="number"
                                                name="experience"
                                                value={formData.experience}
                                                onChange={handleInputChange}
                                                placeholder="00"
                                                step="0.5"
                                                className={`w-full ${theme.inputBg} border-b ${theme.border} py-2 text-base font-['Outfit'] tracking-wide ${theme.text} focus:outline-none focus:border-current transition-colors placeholder-opacity-30 rounded-none`}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className={`block text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase mb-2`}>Education</label>
                                            <input
                                                type="text"
                                                name="education"
                                                value={formData.education}
                                                onChange={handleInputChange}
                                                placeholder="DEGREE..."
                                                className={`w-full ${theme.inputBg} border-b ${theme.border} py-2 text-base font-['Outfit'] tracking-wide ${theme.text} focus:outline-none focus:border-current transition-colors placeholder-opacity-30 rounded-none`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'upload' && (
                                <div className={`border ${theme.border} hover:opacity-70 transition-all p-6 flex flex-col items-center justify-center text-center cursor-pointer group animate-fade-in relative min-h-[180px]`}>
                                    <input
                                        type="file"
                                        id="resume-upload"
                                        className="hidden"
                                        accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.bmp,.webp"
                                        onChange={handleFileChange}
                                    />
                                    <label htmlFor="resume-upload" className="cursor-pointer inset-0 w-full h-full flex flex-col items-center justify-center">
                                        <Upload strokeWidth={0.5} size={32} className={`${theme.textSecondary} group-hover:${theme.text} transition-colors mb-4`} />
                                        <span className={`text-base font-['Outfit'] tracking-widest uppercase group-hover:scale-105 transition-transform`}>
                                            {file ? file.name : "Select PDF or Image"}
                                        </span>
                                        <span className={`text-[10px] tracking-[0.2em] ${theme.textSecondary} uppercase mt-4`}>
                                            Maximum File Size: 5MB
                                        </span>
                                    </label>
                                </div>
                            )}

                            {activeTab === 'folder' && (
                                <div className={`border ${theme.border} hover:opacity-70 transition-all p-6 flex flex-col items-center justify-center text-center cursor-pointer group animate-fade-in relative min-h-[180px]`}>
                                    <input
                                        type="file"
                                        id="folder-upload"
                                        className="hidden"
                                        // @ts-ignore
                                        webkitdirectory=""
                                        directory=""
                                        multiple
                                        onChange={handleFolderChange}
                                    />
                                    <label htmlFor="folder-upload" className="cursor-pointer inset-0 w-full h-full flex flex-col items-center justify-center">
                                        <FolderInput strokeWidth={0.5} size={32} className={`${theme.textSecondary} group-hover:${theme.text} transition-colors mb-4`} />
                                        <span className={`text-base font-['Outfit'] tracking-widest uppercase group-hover:scale-105 transition-transform`}>
                                            {folderFiles ? `${folderFiles.length} files selected` : "Select Folder"}
                                        </span>
                                        <span className={`text-[10px] tracking-[0.2em] ${theme.textSecondary} uppercase mt-4`}>
                                            Analyze Batch Resumes
                                        </span>
                                    </label>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`w-full ${theme.button} py-5 px-8 uppercase font-bold tracking-[0.2em] text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group shadow-lg`}
                            >
                                {loading ? 'Processing Data...' : 'Initiate Analysis'}
                                {!loading && <div className={`w-2 h-2 ${theme.bg === 'bg-white' ? 'bg-white' : 'bg-current'} group-hover:scale-150 transition-transform`}></div>}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className={`border border-red-500/30 p-4 text-xs tracking-widest text-red-500 uppercase bg-red-500/5`}>
                            Error: {error}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Results */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className={`flex-1 border ${theme.border} ${theme.cardBg} p-4 relative min-h-[500px] flex flex-col transition-colors duration-500`}>
                        <h2 className={`text-lg font-['Outfit'] tracking-widest uppercase border-b ${theme.border} pb-2 mb-4`}>
                            02. Report
                        </h2>

                        {!result && batchResults.length === 0 && !loading && (
                            <div className={`flex-1 flex flex-col items-center justify-center opacity-30 ${theme.textSecondary}`}>
                                <div className={`w-24 h-[1px] ${currentTheme === 'white' ? 'bg-black' : 'bg-white'} mb-4`}></div>
                                <p className="font-['Outfit'] tracking-[0.3em] text-xs uppercase">Awaiting Input</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                                <div className={`w-16 h-1 ${theme.border.replace('border-', 'bg-')} overflow-hidden`}>
                                    <div className={`h-full ${theme.accent} animate-progress`}></div>
                                </div>
                                <p className={`font-['Outfit'] tracking-[0.2em] text-xs uppercase ${theme.textSecondary}`}>Computing...</p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-12 animate-fade-in flex-1">

                                <div className="space-y-2">
                                    <span className={`text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase`}>Analysis Outcome</span>
                                    <h2 className={`text-4xl md:text-5xl font-['Outfit'] tracking-widest uppercase ${result.class_id === 1 ? theme.success : theme.failure}`}>
                                        {result.verdict}
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div className={`flex justify-between items-end border-b ${theme.border} pb-2`}>
                                        <span className={`text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase`}>Confidence</span>
                                        <span className="text-2xl font-['Outfit'] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{(result.confidence_score * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className={`w-full ${currentTheme === 'white' ? 'bg-zinc-200' : 'bg-zinc-800'} h-0.5`}>
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${result.class_id === 1 ? theme.highlight : 'bg-red-500'}`}
                                            style={{ width: `${result.confidence_score * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <span className={`block text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase mb-2`}>Exp</span>
                                            <p className="font-['Outfit'] text-lg">{result.parsed_data?.experience_years ?? (formData.experience || 0)} Yrs</p>
                                        </div>
                                        <div>
                                            <span className={`block text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase mb-2`}>Edu</span>
                                            <p className="font-['Outfit'] text-lg break-words leading-relaxed">{result.parsed_data?.education || formData.education}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className={`block text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase mb-2`}>Technical Profile</span>
                                        <p className={`text-sm leading-relaxed ${theme.textSecondary} opacity-80 line-clamp-2`}>
                                            {result.parsed_data?.skills || formData.skills}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {batchResults.length > 0 && (
                            <div className="space-y-6 animate-fade-in flex-1 overflow-y-auto pr-2">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase`}>Batch Results</span>
                                    <span className={`${theme.text} text-xs`}>{batchResults.length} Files Analyzed</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {batchResults.map((res, idx) => (
                                        <ResultCard
                                            key={idx}
                                            result={res}
                                            onClick={() => setSelectedCandidate(res)}
                                            theme={currentTheme}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Footer Stats - Spec Sheet Style */}
            <div className={`grid grid-cols-1 md:grid-cols-3 border-t ${theme.border} mt-4 pt-2 gap-2 transition-colors duration-500`}>
                <div className="space-y-1">
                    <span className={`text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase block`}>Database Size</span>
                    <span className="text-xl font-['Outfit'] block">{stats.total_analyzed}</span>
                </div>
                <div className="space-y-1">
                    <span className={`text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase block`}>IT Classification</span>
                    <span className="text-xl font-['Outfit'] block">{stats.it_candidates}</span>
                </div>
                <div className="space-y-1">
                    <span className={`text-[10px] font-bold tracking-[0.2em] ${theme.textSecondary} uppercase block`}>Accuracy</span>
                    <span className="text-xl font-['Outfit'] block">{stats.avg_confidence_percent}%</span>
                </div>
            </div>

        </div>

        <CandidateModal
            result={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
        />
    </div>
);
};

export default Dashboard;
