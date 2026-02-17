
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, AISuggestion, ResumeTheme, LetterTheme } from '../types';

interface SidebarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  atsScore: number;
  suggestions: AISuggestion[];
  isAiLoading: boolean;
  theme: ResumeTheme | LetterTheme;
  setTheme: (t: any) => void;
  onSelectSuggestion: (s: AISuggestion) => void;
  onGenerateCoverLetter: () => void;
  coverLetterContext?: string;
  onUpdateLetterContext?: (v: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  mode, setMode, atsScore, suggestions, isAiLoading, theme, setTheme, onSelectSuggestion, onGenerateCoverLetter, coverLetterContext, onUpdateLetterContext
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const resumeThemes = [
    ResumeTheme.MODERN, ResumeTheme.MINIMAL, ResumeTheme.CREATIVE,
    ResumeTheme.PROFESSIONAL, ResumeTheme.EXECUTIVE, ResumeTheme.ACADEMIC
  ];

  const letterThemes = [
    LetterTheme.CLASSIC, LetterTheme.MODERN, LetterTheme.BOLD
  ];

  const currentThemes = mode === 'RESUME' ? resumeThemes : letterThemes;
  const totalPages = Math.ceil(currentThemes.length / 3);

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = index * container.clientWidth;
      container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      setCurrentPage(index);
    }
  };

  useEffect(() => {
    scrollToIndex(0);
  }, [mode]);

  return (
    <div className="w-[360px] bg-[#1E1E1E] border-r border-[#333] flex flex-col p-6 gap-6 z-10 shadow-2xl overflow-y-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-widest text-white">
          <div className="w-4 h-4 rounded-full bg-yellow-400 relative shadow-[0_0_10px_rgba(251,191,36,0.3)]">
            <div className="absolute inset-1 rounded-full bg-[#1E1E1E]"></div>
          </div>
          RESUME.AI
        </div>
        <div className="flex bg-[#111] p-1 rounded-md">
          <button 
            onClick={() => setMode('RESUME')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded transition-all ${mode === 'RESUME' ? 'bg-[#1E1E1E] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            RESUME
          </button>
          <button 
            onClick={() => setMode('COVER_LETTER')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded transition-all ${mode === 'COVER_LETTER' ? 'bg-[#1E1E1E] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            LETTER
          </button>
        </div>
      </div>

      {mode === 'RESUME' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3 font-semibold">Realtime ATS Score</div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5 flex items-center gap-5">
            <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 bg-[#181818] border border-yellow-400/20 rounded-lg">
               <span className="text-2xl font-black text-yellow-400 leading-none tracking-tight">{atsScore}</span>
               <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-1">SCORE</span>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white mb-0.5 truncate uppercase tracking-tight">Optimization</div>
              <div className="text-[11px] text-gray-400 leading-tight">
                {atsScore > 80 ? 'Exceptional candidate profile' : atsScore > 60 ? 'Strong competitive profile' : 'Optimization required'}
              </div>
              <div className="mt-2.5 h-1 w-full bg-[#222] rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(251,191,36,0.2)]" style={{ width: `${atsScore}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            {mode === 'RESUME' ? 'AI Checklist' : 'Generation Context'}
          </div>
          {isAiLoading && <div className="text-[10px] text-yellow-400 animate-pulse uppercase">AI Processing...</div>}
        </div>
        
        {mode === 'RESUME' ? (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-hide animate-in fade-in duration-300">
            {suggestions.length === 0 && !isAiLoading && (
              <div className="p-4 bg-white/5 border border-dashed border-[#333] rounded-lg text-center">
                  <p className="text-[11px] text-gray-500 italic">Resume is optimally architected.</p>
              </div>
            )}
            
            {suggestions.map(s => (
              <button 
                key={s.id}
                disabled={s.isApplied}
                onClick={() => onSelectSuggestion(s)}
                className={`group text-left flex items-start gap-3 p-3 bg-white/5 border border-transparent rounded-lg transition-all ${s.isApplied ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'hover:border-yellow-400 cursor-pointer hover:bg-yellow-400/5'}`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${s.isApplied ? 'bg-yellow-400 border-yellow-400' : 'border-[#444] group-hover:border-yellow-400'}`}>
                  {s.isApplied && (
                    <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`flex justify-between text-[9px] font-black mb-1 tracking-widest uppercase transition-colors ${s.isApplied ? 'text-gray-500 line-through' : 'text-yellow-400'}`}>
                    {s.type}
                  </div>
                  <div className={`text-xs leading-relaxed font-medium transition-all ${s.isApplied ? 'text-gray-600 line-through' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {s.suggestion}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col flex-1 gap-4 animate-in fade-in duration-300">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Context & Requirements</label>
              <textarea
                className="flex-1 w-full bg-[#111] border border-[#333] rounded-xl p-4 text-xs text-gray-300 focus:outline-none focus:border-yellow-400 transition-colors resize-none placeholder:text-gray-700 leading-relaxed"
                placeholder="Paste the job description here or specify what to highlight (e.g. 'Focus on my leadership skills and fintech background')..."
                value={coverLetterContext}
                onChange={(e) => onUpdateLetterContext?.(e.target.value)}
              />
            </div>
            <button 
              onClick={onGenerateCoverLetter}
              disabled={isAiLoading}
              className={`w-full py-4 bg-yellow-400 text-black font-black text-[10px] rounded-xl transition-all shadow-xl active:scale-[0.98] transform uppercase tracking-[0.2em] ${isAiLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-300 hover:shadow-yellow-400/20'}`}
            >
              {isAiLoading ? 'ENGINEERING CONTENT...' : 'GENERATE BODY CONTENT'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            {mode === 'RESUME' ? 'Resume Styles' : 'Letter Styles'}
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button 
                onClick={() => scrollToIndex(Math.max(0, currentPage - 1))}
                className={`p-1 hover:bg-white/10 rounded transition-colors ${currentPage === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={() => scrollToIndex(Math.min(totalPages - 1, currentPage + 1))}
                className={`p-1 hover:bg-white/10 rounded transition-colors ${currentPage === totalPages - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-hidden scroll-smooth snap-x snap-mandatory no-scrollbar"
        >
          {Array.from({ length: totalPages }).map((_, pageIdx) => (
            <div key={pageIdx} className="min-w-full grid grid-cols-3 gap-2 snap-start">
              {currentThemes.slice(pageIdx * 3, pageIdx * 3 + 3).map(t => (
                <button 
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`aspect-[3/4] border-2 rounded-lg overflow-hidden transition-all flex flex-col group ${theme === t ? 'border-yellow-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-[#333] hover:border-gray-500'}`}
                >
                  <div className={`flex-1 m-1.5 rounded-sm shadow-sm ${
                    mode === 'RESUME' 
                      ? (t === ResumeTheme.MODERN ? 'theme-preview-modern' : t === ResumeTheme.MINIMAL ? 'theme-preview-minimal' : 'theme-preview-creative')
                      : (t === LetterTheme.BOLD ? 'theme-preview-creative' : t === LetterTheme.MODERN ? 'theme-preview-modern' : 'theme-preview-minimal')
                  } bg-white opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                  <div className={`text-[8px] pb-1.5 text-center font-bold tracking-tighter truncate px-1 uppercase ${theme === t ? 'text-yellow-400' : 'text-gray-500 group-hover:text-gray-300'}`}>{t}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
