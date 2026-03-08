
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppMode, AISuggestion, ResumeTheme, LetterTheme } from '../types';
import { 
  Link as LinkIcon, 
  Plus, 
  CheckCircle, 
  Circle, 
  NavArrowDown, 
  NavArrowUp, 
  SidebarCollapse, 
  SidebarExpand, 
  Archery as Target, 
  Sparks as Sparkles, 
  Page, 
  ViewGrid, 
  Settings 
} from 'iconoir-react';

interface SidebarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  atsScore: number;
  isAtsLoading: boolean;
  suggestions: AISuggestion[];
  completedSuggestions: AISuggestion[];
  selectedSuggestionIds: string[];
  onToggleSuggestionSelection: (id: string) => void;
  onApplySelected: () => void;
  isAiLoading: boolean;
  theme: ResumeTheme | LetterTheme;
  setTheme: (t: any) => void;
  onSelectSuggestion: (s: AISuggestion) => void;
  onGenerateCoverLetter: () => void;
  coverLetterContext?: string;
  onUpdateLetterContext?: (v: string) => void;
  jobLinks: string[];
  onAddJobLink: (url: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  mode, setMode, atsScore, isAtsLoading, suggestions, completedSuggestions, selectedSuggestionIds, onToggleSuggestionSelection, onApplySelected, isAiLoading, theme, setTheme, onSelectSuggestion, onGenerateCoverLetter, coverLetterContext, onUpdateLetterContext, jobLinks, onAddJobLink, isCollapsed, onToggleCollapse
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [newJobLink, setNewJobLink] = useState("");
  const [isStylesCollapsed, setIsStylesCollapsed] = useState(false);

  const resumeThemes = [
    ResumeTheme.MODERN, ResumeTheme.MINIMAL,
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
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 360 }}
      className="bg-[#1E1E1E] border-r border-[#333] flex flex-col z-10 shadow-2xl overflow-hidden relative"
    >
      {/* Toggle Button */}
      <button 
        onClick={onToggleCollapse}
        className="absolute bottom-8 -right-5 z-50 w-10 h-10 bg-[#181818] border border-[#333] hover:border-violet-400 rounded-full flex items-center justify-center text-gray-400 hover:text-violet-400 transition-all shadow-[0_0_20px_rgba(0,0,0,0.6)] group title-tooltip"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <SidebarExpand className="group-hover:scale-110 transition-transform" strokeWidth={2} width={20} height={20} /> : <SidebarCollapse className="group-hover:scale-110 transition-transform" strokeWidth={2} width={20} height={20} />}
      </button>

      <div className={`flex flex-col h-full ${isCollapsed ? 'items-center py-6 gap-8' : 'p-6 gap-6'} overflow-y-auto no-scrollbar`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-2`}>
          <div className="flex items-center gap-2.5 font-black text-sm tracking-[0.2em] text-white">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src="/logo.svg" alt="rsme logo" className="w-full h-full object-contain" />
            </div>
          </div>
          {!isCollapsed && (
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
          )}
        </div>

        {isCollapsed && (
          <div className="flex flex-col gap-6 items-center w-full">
            <button 
              onClick={() => setMode(mode === 'RESUME' ? 'COVER_LETTER' : 'RESUME')}
              className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-violet-400 hover:bg-violet-400/10 transition-all"
              title={mode === 'RESUME' ? 'Switch to Cover Letter' : 'Switch to Resume'}
            >
              {mode === 'RESUME' ? <Page width={20} height={20} /> : <ViewGrid width={20} height={20} />}
            </button>
            <div className="w-8 h-[1px] bg-[#333]" />
            <div className="flex flex-col gap-4 items-center">
              <div className="relative group">
                <div className="w-10 h-10 flex items-center justify-center relative bg-[#111] rounded-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] border border-[#333]">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const isActive = atsScore >= (i + 1) * 5; 
                      return (
                        <line 
                          key={i} 
                          x1="50" y1="8" x2="50" y2="20" 
                          stroke={isActive ? "#a78bfa" : "#2a2a2a"} 
                          strokeWidth="4" 
                          strokeLinecap="round" 
                          transform={`rotate(${i * 18} 50 50)`} 
                          className="transition-colors duration-500"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 w-full h-full rounded-full">
                    <span className="text-[12px] font-black text-white leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(167,139,250,0.8)] z-10">{atsScore}</span>
                  </div>
                </div>
                <div className="absolute left-full ml-4 px-2 py-1 bg-black text-[8px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  ATS SCORE: {atsScore}
                </div>
              </div>
              <button className="p-3 text-gray-500 hover:text-violet-400 transition-colors" title="AI Suggestions">
                <Sparkles width={20} height={20} />
              </button>
              <button className="p-3 text-gray-500 hover:text-violet-400 transition-colors" title="Job Links">
                <Target width={20} height={20} />
              </button>
              <button className="p-3 text-gray-500 hover:text-violet-400 transition-colors" title="Settings">
                <Settings width={20} height={20} />
              </button>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <>
            {mode === 'RESUME' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 group">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3 font-semibold group-hover:text-violet-400 transition-colors">Realtime ATS Score</div>
                <div className="bg-gradient-to-br from-[#181818] to-[#111] border border-[#333] hover:border-violet-400/50 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(167,139,250,0.1)]">
                  {isAtsLoading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center shrink-0 w-[76px] h-[76px] relative bg-[#111] rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border border-[#333]">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        {Array.from({ length: 40 }).map((_, i) => {
                          const isActive = atsScore >= (i + 1) * 2.5; 
                          const isMajor = i % 5 === 0;
                          return (
                            <line 
                              key={i} 
                              x1="50" 
                              y1={isMajor ? "6" : "10"} 
                              x2="50" 
                              y2={isMajor ? "22" : "18"} 
                              stroke={isActive ? "#a78bfa" : "#2a2a2a"} 
                              strokeWidth={isMajor ? "3" : "2"} 
                              strokeLinecap="round" 
                              transform={`rotate(${i * 9} 50 50)`} 
                              className="transition-colors duration-500"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 w-full h-full rounded-full">
                        <span className="text-[28px] font-black text-white leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(167,139,250,0.8)] z-10">{atsScore}</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="text-xs font-black text-white mb-1 uppercase tracking-widest flex items-center gap-2">
                        Profile Health
                        {atsScore > 80 && <CheckCircle width={14} height={14} className="text-green-400" />}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-relaxed font-medium">
                        {atsScore > 80 ? 'Exceptional profile. Ready to apply.' : atsScore > 60 ? 'Strong competitive profile.' : 'Optimization required.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-3 font-semibold">Target Job Links</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Paste job URL..."
                        value={newJobLink}
                        onChange={(e) => setNewJobLink(e.target.value)}
                        className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[11px] text-gray-300 focus:outline-none focus:border-violet-400"
                      />
                      <button 
                        onClick={() => {
                          onAddJobLink(newJobLink);
                          setNewJobLink("");
                        }}
                        className="p-2 bg-violet-400 text-black rounded-lg hover:bg-violet-300 transition-colors"
                      >
                        <Plus width={16} height={16} />
                      </button>
                    </div>
                    {jobLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {jobLinks.map((link, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] text-gray-400 max-w-[120px]">
                            <LinkIcon width={10} height={10} />
                            <span className="truncate">{link.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  {mode === 'RESUME' ? 'AI Checklist' : 'Generation Context'}
                </div>
                {isAiLoading && <div className="text-[10px] text-violet-400 animate-pulse uppercase">AI Processing...</div>}
              </div>
              
              {mode === 'RESUME' ? (
                <div className="flex flex-col gap-6 overflow-y-auto pr-1 scrollbar-hide animate-in fade-in duration-300">
                  {suggestions.length === 0 && !isAiLoading && (
                    <div className="p-4 bg-white/5 border border-dashed border-[#333] rounded-lg text-center">
                        <p className="text-[11px] text-gray-500 italic">Resume is optimally architected.</p>
                    </div>
                  )}
                  
                  {/* Pending Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-[8px] font-black text-violet-400/50 uppercase tracking-[0.2em]">Pending Improvements</div>
                        {selectedSuggestionIds.length > 0 && (
                          <button 
                            onClick={onApplySelected}
                            className="px-2 py-1 bg-violet-400 text-black text-[8px] font-black uppercase tracking-widest rounded hover:bg-violet-300 transition-colors shadow-lg shadow-violet-400/20"
                          >
                            Apply Selected ({selectedSuggestionIds.length})
                          </button>
                        )}
                      </div>
                      {suggestions.map(s => (
                        <div 
                          key={s.id}
                          className={`group text-left flex items-start gap-3 p-3 bg-white/5 border rounded-lg transition-all cursor-pointer ${selectedSuggestionIds.includes(s.id) ? 'border-violet-400 bg-violet-400/5' : 'border-transparent hover:border-white/20 hover:bg-white/10'}`}
                          onClick={() => onToggleSuggestionSelection(s.id)}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedSuggestionIds.includes(s.id) ? 'border-violet-400 bg-violet-400' : 'border-[#444] group-hover:border-gray-500'}`}>
                            {selectedSuggestionIds.includes(s.id) && <CheckCircle width={10} height={10} className="text-black" />}
                          </div>
                          <div className="flex-1 min-w-0" onClick={(e) => {
                            e.stopPropagation();
                            onSelectSuggestion(s);
                          }}>
                            <div className="flex justify-between text-[9px] font-black mb-1 tracking-widest uppercase text-violet-400">
                              {s.type}
                            </div>
                            <div className={`text-xs leading-relaxed font-medium transition-colors ${selectedSuggestionIds.includes(s.id) ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                              {s.suggestion}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Completed Suggestions */}
                  {completedSuggestions.length > 0 && (
                    <div className="flex flex-col gap-2 opacity-60">
                      <div className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Completed</div>
                      {completedSuggestions.map(s => (
                        <div 
                          key={s.id}
                          className="text-left flex items-start gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg transition-all"
                        >
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center shrink-0">
                            <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-[9px] font-black mb-1 tracking-widest uppercase text-gray-500 line-through">
                              {s.type}
                            </div>
                            <div className="text-xs leading-relaxed font-medium text-gray-600 line-through">
                              {s.suggestion}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col flex-1 gap-4 animate-in fade-in duration-300">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Context & Requirements</label>
                    <textarea
                      className="flex-1 w-full bg-[#111] border border-[#333] rounded-xl p-4 text-xs text-gray-300 focus:outline-none focus:border-violet-400 transition-colors resize-none placeholder:text-gray-700 leading-relaxed"
                      placeholder="Paste the job description here or specify what to highlight (e.g. 'Focus on my leadership skills and fintech background')..."
                      value={coverLetterContext}
                      onChange={(e) => onUpdateLetterContext?.(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={onGenerateCoverLetter}
                    disabled={isAiLoading}
                    className={`w-full py-4 bg-violet-400 text-black font-black text-[10px] rounded-xl transition-all shadow-xl active:scale-[0.98] transform uppercase tracking-[0.2em] ${isAiLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-violet-300 hover:shadow-violet-400/20'}`}
                  >
                    {isAiLoading ? 'ENGINEERING CONTENT...' : 'GENERATE BODY CONTENT'}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-[#333] pt-4">
              <div 
                onClick={() => setIsStylesCollapsed(!isStylesCollapsed)}
                className="w-full flex justify-between items-center mb-3 group cursor-pointer"
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold group-hover:text-gray-300 transition-colors">
                  {mode === 'RESUME' ? 'Resume Styles' : 'Letter Styles'}
                </div>
                <div className="flex items-center gap-2">
                  {!isStylesCollapsed && totalPages > 1 && (
                    <div className="flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToIndex(Math.max(0, currentPage - 1));
                        }}
                        className={`p-1 hover:bg-white/10 rounded transition-colors ${currentPage === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <NavArrowDown width={12} height={12} className="rotate-90 text-white" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToIndex(Math.min(totalPages - 1, currentPage + 1));
                        }}
                        className={`p-1 hover:bg-white/10 rounded transition-colors ${currentPage === totalPages - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <NavArrowDown width={12} height={12} className="-rotate-90 text-white" />
                      </button>
                    </div>
                  )}
                  {isStylesCollapsed ? <NavArrowUp width={14} height={14} className="text-gray-500" /> : <NavArrowDown width={14} height={14} className="text-gray-500" />}
                </div>
              </div>
              
              <AnimatePresence initial={false}>
                {!isStylesCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div 
                      ref={scrollContainerRef}
                      className="flex overflow-x-hidden scroll-smooth snap-x snap-mandatory no-scrollbar"
                    >
                      {Array.from({ length: totalPages }).map((_, pageIdx) => (
                        <div key={pageIdx} className="min-w-full grid grid-cols-3 gap-2 snap-start pb-2">
                          {currentThemes.slice(pageIdx * 3, pageIdx * 3 + 3).map(t => (
                            <button 
                              key={t}
                              onClick={() => setTheme(t)}
                              className={`aspect-[3/4] border-2 rounded-lg overflow-hidden transition-all flex flex-col group ${theme === t ? 'border-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.2)]' : 'border-[#333] hover:border-gray-500'}`}
                            >
                              <div className={`flex-1 m-1.5 rounded-sm shadow-sm ${
                                mode === 'RESUME' 
                                  ? (t === ResumeTheme.MODERN ? 'theme-preview-modern' : t === ResumeTheme.MINIMAL ? 'theme-preview-minimal' : 'theme-preview-creative')
                                  : (t === LetterTheme.BOLD ? 'theme-preview-creative' : t === LetterTheme.MODERN ? 'theme-preview-modern' : 'theme-preview-minimal')
                              } bg-white opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                              <div className={`text-[8px] pb-1.5 text-center font-bold tracking-tighter truncate px-1 uppercase ${theme === t ? 'text-violet-400' : 'text-gray-500 group-hover:text-gray-300'}`}>{t}</div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Sidebar;
