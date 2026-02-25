import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ResumeData, AISuggestion, AppMode, ResumeTheme, LetterTheme, ExperienceItem, EducationItem } from '../types';

interface StageProps {
  resume: ResumeData;
  coverLetter: string;
  mode: AppMode;
  theme: ResumeTheme | LetterTheme;
  activeSuggestion: AISuggestion | null;
  onCloseSuggestion: () => void;
  onApplySuggestion: (s: AISuggestion) => void;
  onUpdateResume: (field: keyof ResumeData, value: any) => void;
  onUpdateExperience: (id: string, field: keyof ExperienceItem, value: string) => void;
  onUpdateEducation: (id: string, field: keyof EducationItem, value: string) => void;
  onUpdateCoverLetter: (v: string) => void;
  onRoast: (data?: ResumeData | string) => void;
  roast: string | null;
  onCloseRoast: () => void;
}

const PAGE_HEIGHT = 842;
const PAGE_WIDTH = 595;

const CHARS_PAGE_ONE = 1100;
const CHARS_PAGE_TWO = 1800;

interface EditableTextProps {
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  isEditing: boolean;
  animatingField: string | null;
  displayedValues: Record<string, string>;
}

const EditableText: React.FC<EditableTextProps> = ({ 
  fieldKey,
  value, 
  onChange, 
  className, 
  multiline = false,
  isEditing,
  animatingField,
  displayedValues
}) => {
  const isThisAnimating = animatingField === fieldKey;
  const valToDisplay = isThisAnimating ? (displayedValues[fieldKey] || value) : value;

  if (!isEditing && !isThisAnimating) {
    return <div className={`${className} min-h-[1.2em] break-words whitespace-pre-wrap`}>{valToDisplay}</div>;
  }
  
  if (isThisAnimating) {
    return (
      <div className={`${className} min-h-[1.2em] break-words whitespace-pre-wrap relative text-yellow-600 font-medium bg-yellow-400/5 px-2 -mx-2 rounded transition-all duration-300`}>
        {valToDisplay}
        <span className="inline-block w-[3px] h-[1.2em] bg-yellow-500 ml-1 translate-y-1 animate-pulse"></span>
        <div className="absolute -top-4 right-0 text-[8px] font-black text-yellow-500 uppercase tracking-widest bg-black px-1 py-0.5 rounded border border-yellow-500/30 shadow-lg">AI WRITING...</div>
      </div>
    );
  }
  
  const sharedClasses = `${className} w-full bg-transparent focus:outline-none focus:bg-yellow-50/50 hover:bg-black/5 cursor-text transition-colors px-1 -mx-1 rounded border-b border-transparent focus:border-yellow-400/30 overflow-hidden no-scrollbar`;
  
  return multiline ? (
    <textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={`${sharedClasses} resize-none`}
      style={{ height: 'auto' }}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
      }}
      ref={(el) => {
        if (el) {
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }
      }}
    />
  ) : (
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={sharedClasses} 
    />
  );
};

const PaperPage: React.FC<React.PropsWithChildren<{ className?: string, themeClass: string }>> = ({ children, className = "", themeClass }) => (
  <div className={`w-[${PAGE_WIDTH}px] min-w-[${PAGE_WIDTH}px] h-[${PAGE_HEIGHT}px] bg-white text-black resume-shadow p-12 overflow-hidden relative shadow-2xl border border-gray-100 ${themeClass} ${className}`} style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
    {children}
  </div>
);

const ClosingBlock: React.FC<{ resume: ResumeData, theme: ResumeTheme | LetterTheme }> = ({ resume, theme }) => (
  <div className={`mt-8 pt-6 border-t border-gray-100 flex justify-between items-end animate-in fade-in duration-700 ${theme === LetterTheme.CLASSIC ? 'border-gray-200' : ''}`}>
    <div className={theme === LetterTheme.CLASSIC ? 'text-left' : ''}>
      <div className={`text-[11px] mb-2 tracking-tighter uppercase ${theme === LetterTheme.CLASSIC ? 'text-gray-600 font-serif italic normal-case tracking-normal' : 'text-gray-400 font-bold italic'}`}>
        {theme === LetterTheme.CLASSIC ? 'Sincerely,' : 'Respectfully,'}
      </div>
      <div className={`text-black mb-1 ${theme === LetterTheme.CLASSIC ? 'text-base font-serif' : 'text-lg font-black uppercase tracking-widest'}`}>
        {resume.name}
      </div>
    </div>
    <div className={`w-24 h-12 italic font-serif text-2xl select-none px-2 flex items-end ${theme === LetterTheme.CLASSIC ? 'border-b border-gray-300 text-gray-400 opacity-60' : 'border-b-2 border-yellow-400 text-gray-200 opacity-40'}`}>
      {resume.name.split(' ')[0]}
    </div>
  </div>
);

const Stage: React.FC<StageProps> = ({ 
  resume, coverLetter, mode, theme, activeSuggestion, onCloseSuggestion, onApplySuggestion, onUpdateResume, onUpdateExperience, onUpdateEducation, onUpdateCoverLetter,
  onRoast, roast, onCloseRoast
}) => {
  const [zoom, setZoom] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [animatingField, setAnimatingField] = useState<string | null>(null);
  const [displayedValues, setDisplayedValues] = useState<Record<string, string>>({});
  
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newValues: Record<string, string> = {
      name: resume.name,
      role: resume.role,
      email: resume.email,
      phone: resume.phone,
      location: resume.location,
      summary: resume.summary,
      coverLetter: coverLetter,
    };
    resume.experience.forEach(exp => {
      newValues[`exp-title-${exp.id}`] = exp.title;
      newValues[`exp-company-${exp.id}`] = exp.company;
      newValues[`exp-period-${exp.id}`] = exp.period;
      newValues[`exp-desc-${exp.id}`] = exp.description;
    });
    resume.education.forEach(ed => {
      newValues[`ed-degree-${ed.id}`] = ed.degree;
      newValues[`ed-school-${ed.id}`] = ed.school;
      newValues[`ed-year-${ed.id}`] = ed.year;
    });
    newValues['skills'] = resume.skills.join(', ');

    setDisplayedValues(prev => {
      const merged = { ...newValues };
      if (animatingField) {
        merged[animatingField] = prev[animatingField];
      }
      return merged;
    });
  }, [resume, coverLetter, animatingField]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const pct = 1 - (y / rect.height);
    const newZoom = 0.5 + pct * 1.5;
    setZoom(newZoom);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const animateTyping = (fieldKey: string, targetText: string) => {
    setAnimatingField(fieldKey);
    let currentText = '';
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < targetText.length) {
        const charsToAdd = Math.random() > 0.8 ? 2 : 1;
        currentText = targetText.substring(0, index + charsToAdd);
        setDisplayedValues(prev => ({ ...prev, [fieldKey]: currentText }));
        index += charsToAdd;
      } else {
        clearInterval(interval);
        setTimeout(() => setAnimatingField(null), 500);
      }
    }, 12); 
  };

  const handleApplySuggestion = (s: AISuggestion) => {
    let fieldKey = s.field;
    if (s.field.startsWith('experience')) {
      const expId = s.field.split(':')[1];
      if (expId) {
        fieldKey = `exp-desc-${expId}`;
      } else {
        const exp = resume.experience.find(e => e.description === s.original);
        if (exp) fieldKey = `exp-desc-${exp.id}`;
      }
    }
    animateTyping(fieldKey, s.suggestion);
    onApplySuggestion(s);
  };

  const getThemeClass = () => {
    if (mode === 'RESUME') {
      switch (theme) {
        case ResumeTheme.ACADEMIC: return 'font-serif text-gray-800';
        case ResumeTheme.MINIMAL: return 'font-sans tracking-tight';
        case ResumeTheme.CREATIVE: return 'font-sans';
        default: return 'font-sans';
      }
    } else {
      switch (theme) {
        case LetterTheme.BOLD: return 'font-sans font-extrabold uppercase';
        default: return 'font-serif';
      }
    }
  };

  const letterPages = useMemo(() => {
    if (mode !== 'COVER_LETTER') return [];
    
    const text = displayedValues['coverLetter'] || coverLetter;
    if (text.length <= CHARS_PAGE_ONE) return [text];
    
    const findBreak = (str: string, limit: number) => {
      let idx = str.lastIndexOf('\n', limit);
      if (idx === -1 || idx < limit * 0.7) {
        idx = str.lastIndexOf('. ', limit);
      }
      if (idx === -1 || idx < limit * 0.5) idx = limit;
      return idx;
    };

    const p1End = findBreak(text, CHARS_PAGE_ONE);
    const p1 = text.substring(0, p1End);
    const remaining = text.substring(p1End).trim();

    if (remaining.length <= CHARS_PAGE_TWO) return [p1, remaining];
    
    const p2End = findBreak(remaining, CHARS_PAGE_TWO);
    return [p1, remaining.substring(0, p2End), remaining.substring(p2End).trim()];
  }, [mode, displayedValues, coverLetter]);

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out my professional document created with Resume AI Architect!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('My Professional Document');
    const body = encodeURIComponent(`Hi, please find my document generated via Resume AI Architect.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        // If it's a text file or JSON, we can try to parse it or just send as text
        onRoast(content);
      }
    };
    
    if (file.type === 'application/json' || file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      // For other files, we'll just say we're roasting the current one for now 
      // or we could implement PDF parsing if we had a library.
      // But let's try to be helpful:
      onRoast(); 
    }
  };

  const themeClass = getThemeClass();

  return (
    <div className="flex-1 relative dot-grid bg-[#0D0D0D] flex flex-col items-center py-12 overflow-y-auto no-scrollbar scroll-smooth">
      
      {/* Zoom Control */}
      <div className="fixed right-12 top-1/2 -translate-y-1/2 flex items-center gap-6 h-[400px] z-40 group/zoom">
        <div className="flex flex-col justify-between h-full text-[10px] font-mono font-black select-none pr-2 text-right transition-colors">
           <span className={`transition-all duration-300 ${zoom >= 1.75 ? 'text-yellow-400 scale-110' : 'text-gray-600'}`}>200%</span>
           <span className={`transition-all duration-300 ${zoom > 0.85 && zoom < 1.15 ? 'text-yellow-400 scale-110' : 'text-gray-600'}`}>100%</span>
           <span className={`transition-all duration-300 ${zoom <= 0.75 ? 'text-yellow-400 scale-110' : 'text-gray-600'}`}>50%</span>
        </div>
        
        <div 
          ref={trackRef}
          className="relative h-full w-1.5 bg-white/5 rounded-full cursor-ns-resize"
          onMouseDown={(e) => {
             const rect = trackRef.current!.getBoundingClientRect();
             const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
             const pct = 1 - (y / rect.height);
             setZoom(0.5 + pct * 1.5);
             setIsDragging(true);
          }}
        >
          <div className="absolute -left-1.5 top-0 w-4 h-[1px] bg-white/20"></div>
          <div className="absolute -left-1.5 top-1/2 w-4 h-[1px] bg-white/20"></div>
          <div className="absolute -left-1.5 bottom-0 w-4 h-[1px] bg-white/20"></div>

          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-6 h-12 bg-yellow-400 rounded-lg shadow-[0_0_30px_rgba(251,191,36,0.4)] flex flex-col items-center justify-center pointer-events-auto transition-shadow duration-300 ${isDragging ? 'shadow-[0_0_45px_rgba(251,191,36,0.6)]' : 'hover:shadow-[0_0_35px_rgba(251,191,36,0.5)]'}`}
            style={{ 
                bottom: `${((zoom - 0.5) / 1.5) * 100}%`,
                transform: `translate(-50%, 50%) ${isDragging ? 'scale(0.95)' : 'scale(1)'}` 
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                setIsDragging(true);
            }}
          >
            <div className="w-3 h-[2px] bg-black/30 mb-[3px] rounded-full"></div>
            <div className="w-3 h-[2px] bg-black/30 mb-[3px] rounded-full"></div>
            <div className="w-3 h-[2px] bg-black/30 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1E1E1E] border border-[#333] w-[320px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-sm tracking-tight">SHARE DOCUMENT</h3>
                <button onClick={() => setShowShareDialog(false)} className="text-gray-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={shareToLinkedIn} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-[#0077B5] flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs font-bold">LinkedIn</div>
                    <div className="text-gray-500 text-[10px]">Post to your profile</div>
                  </div>
                </button>
                <button onClick={shareToWhatsApp} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-[#25D366] flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884 0 2.225.569 3.808 1.693 5.75l-.998 3.645 3.794-.994zm11.366-7.4c-.312-.156-1.848-.912-2.134-1.017-.286-.104-.494-.156-.701.156-.207.312-.803 1.017-.984 1.225-.181.208-.363.234-.675.078-.312-.156-1.317-.484-2.508-1.548-.926-.826-1.551-1.846-1.733-2.158-.181-.312-.019-.481.137-.635.141-.139.312-.364.467-.546.156-.182.208-.312.312-.52.104-.208.052-.39-.026-.546-.078-.156-.701-1.691-.96-2.313-.252-.603-.51-.52-.701-.531-.182-.011-.39-.011-.597-.011-.208 0-.546.078-.831.39-.286.312-1.091 1.067-1.091 2.6 0 1.533 1.117 3.014 1.272 3.221.156.208 2.197 3.355 5.323 4.704.743.321 1.324.512 1.777.655.748.237 1.43.203 1.969.123.6-.089 1.848-.755 2.108-1.485.26-.73.26-1.353.182-1.485-.077-.13-.285-.208-.597-.364z"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs font-bold">WhatsApp</div>
                    <div className="text-gray-500 text-[10px]">Send to contacts</div>
                  </div>
                </button>
                <button onClick={shareViaEmail} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-[#EA4335] flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l-12-9.725v15.438h24v-15.438l-12 9.725z"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs font-bold">Email</div>
                    <div className="text-gray-500 text-[10px]">Send as attachment</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roast Popup */}
      {roast && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1A1A1A] border-2 border-red-500/30 w-[500px] rounded-2xl shadow-[0_0_100px_rgba(239,68,68,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-red-500 text-white px-6 py-4 font-black text-xs uppercase tracking-[0.3em] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                BRUTAL AI ROAST
              </div>
              <button onClick={onCloseRoast} className="hover:scale-125 transition-transform text-xl leading-none">×</button>
            </div>
            <div className="p-8">
              <div className="text-gray-400 font-mono text-[10px] mb-6 uppercase tracking-widest border-b border-white/5 pb-4">
                ANALYSIS COMPLETE. PREPARE FOR EMOTIONAL DAMAGE.
              </div>
              <div className="text-lg text-white font-medium leading-relaxed italic mb-8 bg-red-500/5 p-6 rounded-xl border border-red-500/10">
                "{roast}"
              </div>
              <button 
                onClick={onCloseRoast}
                className="w-full py-4 bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
              >
                I DESERVED THIS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestion Popup */}
      {activeSuggestion && (
        <div className="fixed top-[15%] left-[55%] w-[420px] bg-[#1E1E1E] border border-[#333] rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 zoom-in-95">
          <div className="bg-yellow-400 text-black px-4 py-3 font-bold text-[10px] uppercase tracking-widest flex justify-between items-center rounded-t-lg">
            <span>REWRITE SUGGESTION</span>
            <button onClick={onCloseSuggestion} className="hover:scale-125 transition-transform text-lg leading-none">×</button>
          </div>
          <div className="p-6">
            <div className="mb-4">
               <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mb-1.5">CURRENT:</div>
               <div className="text-[11px] text-gray-400 font-mono italic leading-relaxed border-l-2 border-white/10 pl-3">"{activeSuggestion.original}"</div>
            </div>
            
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-yellow-400/20 shadow-inner">
               <div className="text-[9px] font-black text-yellow-500 uppercase tracking-tighter mb-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                  AI RECOMMENDATION:
               </div>
               <div className="text-sm text-white font-medium leading-relaxed">
                  {activeSuggestion.suggestion}
               </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onCloseSuggestion} className="flex-1 py-2.5 bg-[#111] border border-[#333] text-gray-400 text-[10px] font-bold rounded uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all">DISCARD</button>
              <button 
                onClick={() => handleApplySuggestion(activeSuggestion)} 
                className="flex-1 py-2.5 bg-yellow-400 text-black text-[10px] font-black rounded uppercase tracking-widest hover:bg-yellow-300 shadow-[0_5px_15px_rgba(251,191,36,0.3)] hover:-translate-y-0.5 transition-all active:translate-y-0"
              >
                APPLY CHANGE
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        className="transition-transform duration-150 will-change-transform flex flex-col gap-10 items-center"
      >
        {mode === 'RESUME' ? (
          <PaperPage themeClass={themeClass}>
            <div className="h-full flex flex-col">
              <div className={`mb-8 ${theme === ResumeTheme.CREATIVE || theme === ResumeTheme.EXECUTIVE ? 'bg-[#2c3e50] text-white -m-12 p-12 mb-8' : ''}`}>
                <EditableText 
                  fieldKey="name"
                  value={resume.name}
                  onChange={(v) => onUpdateResume('name', v)}
                  className={`text-4xl font-extrabold uppercase tracking-tight ${theme === ResumeTheme.MODERN ? 'font-["Playfair_Display"] text-5xl normal-case' : ''}`}
                  isEditing={isEditing}
                  animatingField={animatingField}
                  displayedValues={displayedValues}
                />
                <EditableText 
                  fieldKey="role"
                  value={resume.role}
                  onChange={(v) => onUpdateResume('role', v)}
                  className="text-sm font-medium text-gray-500 uppercase tracking-[0.2em] mt-2"
                  isEditing={isEditing}
                  animatingField={animatingField}
                  displayedValues={displayedValues}
                />
              </div>

              <div className="grid grid-cols-12 gap-8 flex-1 overflow-visible">
                <div className={`col-span-4 ${(theme === ResumeTheme.CREATIVE || theme === ResumeTheme.EXECUTIVE) ? 'border-r pr-4' : ''}`}>
                  <SectionTitle title="Contact" />
                  <div className="text-[11px] text-gray-600 leading-relaxed space-y-1 mb-8 font-medium">
                     <EditableText fieldKey="email" value={resume.email} onChange={(v) => onUpdateResume('email', v)} isEditing={isEditing} animatingField={animatingField} displayedValues={displayedValues} />
                     <EditableText fieldKey="phone" value={resume.phone} onChange={(v) => onUpdateResume('phone', v)} isEditing={isEditing} animatingField={animatingField} displayedValues={displayedValues} />
                     <EditableText fieldKey="location" value={resume.location} onChange={(v) => onUpdateResume('location', v)} isEditing={isEditing} animatingField={animatingField} displayedValues={displayedValues} />
                  </div>
                  <SectionTitle title="Skills" />
                  <div className="flex flex-wrap gap-1 mb-8">
                    <EditableText 
                      fieldKey="skills"
                      value={resume.skills.join(', ')}
                      onChange={(v) => onUpdateResume('skills', v.split(',').map(s => s.trim()).filter(s => s !== ''))}
                      className="text-[10px] font-bold tracking-tight text-gray-700 w-full"
                      isEditing={isEditing}
                      animatingField={animatingField}
                      displayedValues={displayedValues}
                    />
                  </div>
                  <SectionTitle title="Education" />
                  {resume.education.map(ed => (
                    <div key={ed.id} className="mb-4">
                      <EditableText 
                        fieldKey={`ed-degree-${ed.id}`}
                        value={ed.degree}
                        onChange={(v) => onUpdateEducation(ed.id, 'degree', v)}
                        className="text-[11px] font-bold tracking-tight"
                        isEditing={isEditing}
                        animatingField={animatingField}
                        displayedValues={displayedValues}
                      />
                      <div className="flex items-center gap-1">
                        <EditableText 
                          fieldKey={`ed-school-${ed.id}`}
                          value={ed.school}
                          onChange={(v) => onUpdateEducation(ed.id, 'school', v)}
                          className="text-[10px] text-gray-500 italic"
                          isEditing={isEditing}
                          animatingField={animatingField}
                          displayedValues={displayedValues}
                        />
                        <span className="text-[10px] text-gray-500">•</span>
                        <EditableText 
                          fieldKey={`ed-year-${ed.id}`}
                          value={ed.year}
                          onChange={(v) => onUpdateEducation(ed.id, 'year', v)}
                          className="text-[10px] text-gray-500 italic"
                          isEditing={isEditing}
                          animatingField={animatingField}
                          displayedValues={displayedValues}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-span-8 overflow-visible">
                  <SectionTitle title="Executive Summary" />
                  <div className="mb-8">
                    <EditableText 
                      fieldKey="summary"
                      value={resume.summary} 
                      onChange={(v) => onUpdateResume('summary', v)} 
                      className="text-[11px] leading-relaxed text-gray-700 font-medium" 
                      multiline 
                      isEditing={isEditing}
                      animatingField={animatingField}
                      displayedValues={displayedValues}
                    />
                  </div>
                  <SectionTitle title="Experience" />
                  <div className="space-y-6">
                    {resume.experience.map(exp => (
                      <div key={exp.id} className="group">
                        <div className="flex justify-between items-baseline mb-1">
                          <EditableText 
                            fieldKey={`exp-title-${exp.id}`}
                            value={exp.title} 
                            onChange={(v) => onUpdateExperience(exp.id, 'title', v)} 
                            className="font-bold text-sm tracking-tight flex-1 mr-2" 
                            isEditing={isEditing}
                            animatingField={animatingField}
                            displayedValues={displayedValues}
                          />
                          <EditableText 
                            fieldKey={`exp-period-${exp.id}`}
                            value={exp.period} 
                            onChange={(v) => onUpdateExperience(exp.id, 'period', v)} 
                            className="text-[10px] text-gray-400 font-mono whitespace-nowrap text-right" 
                            isEditing={isEditing}
                            animatingField={animatingField}
                            displayedValues={displayedValues}
                          />
                        </div>
                        <EditableText 
                          fieldKey={`exp-company-${exp.id}`}
                          value={exp.company} 
                          onChange={(v) => onUpdateExperience(exp.id, 'company', v)} 
                          className="text-[11px] font-bold text-yellow-600/80 mb-2 uppercase tracking-widest" 
                          isEditing={isEditing}
                          animatingField={animatingField}
                          displayedValues={displayedValues}
                        />
                        <EditableText 
                          fieldKey={`exp-desc-${exp.id}`}
                          value={exp.description} 
                          onChange={(v) => onUpdateExperience(exp.id, 'description', v)} 
                          className="text-[11px] leading-relaxed text-gray-700" 
                          multiline 
                          isEditing={isEditing}
                          animatingField={animatingField}
                          displayedValues={displayedValues}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PaperPage>
        ) : (
          <>
            {letterPages.map((pageContent, index) => (
              <PaperPage key={index} themeClass={themeClass} className={index > 0 ? "animate-in fade-in slide-in-from-top-4 duration-700" : ""}>
                <div className="h-full flex flex-col">
                   {index === 0 ? (
                     <div className={`flex flex-col mb-12 ${theme === LetterTheme.BOLD ? 'bg-[#1a1a1a] text-white p-12 -mx-12 -mt-12 mb-16 shadow-2xl relative border-b-2 border-black/10 pb-8' : theme === LetterTheme.CLASSIC ? 'items-center text-center border-b border-gray-200 pb-10' : 'border-b-2 border-black/10 pb-8'}`}>
                        <div className={`${theme === LetterTheme.CLASSIC ? 'text-3xl font-serif mb-2' : 'font-black uppercase tracking-tighter text-4xl mb-1'}`}>{resume.name}</div>
                        <div className={`${theme === LetterTheme.CLASSIC ? 'text-[10px] text-gray-400 italic mb-4' : 'text-[11px] text-gray-500 font-bold uppercase tracking-[0.4em] mb-6'}`}>{resume.role}</div>
                        <div className={`flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 w-full ${theme === LetterTheme.CLASSIC ? 'flex-col gap-1 italic font-serif' : ''}`}>
                          <div className={`flex gap-4 ${theme === LetterTheme.CLASSIC ? 'justify-center' : ''}`}>
                            <span>{resume.location}</span>
                            {theme === LetterTheme.CLASSIC && <span>•</span>}
                            <span>{resume.email}</span>
                            {theme === LetterTheme.CLASSIC && <span>•</span>}
                            {theme === LetterTheme.CLASSIC && <span>{resume.phone}</span>}
                          </div>
                          <div className={theme === LetterTheme.CLASSIC ? 'mt-4 text-gray-900 not-italic font-sans font-bold uppercase tracking-widest' : ''}>
                            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                     </div>
                   ) : (
                     <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-10 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        <span>{resume.name} • Cover Letter</span>
                        <span>Page {index + 1}</span>
                     </div>
                   )}
                   
                   <div className="space-y-8 flex-1 overflow-hidden">
                    {index === 0 && <div className="text-sm font-black text-black uppercase tracking-widest border-l-4 border-yellow-400 pl-4 py-1">Dear Hiring Manager,</div>}
                    
                    {index === 0 ? (
                      <EditableText 
                        fieldKey="coverLetter"
                        value={coverLetter} 
                        onChange={(v) => onUpdateCoverLetter(v)} 
                        className="text-sm leading-[1.9] text-gray-800 text-justify font-medium" 
                        multiline 
                        isEditing={isEditing}
                        animatingField={animatingField}
                        displayedValues={displayedValues}
                      />
                    ) : (
                      <div className="text-sm leading-[1.9] text-gray-800 text-justify font-medium whitespace-pre-wrap">
                        {pageContent}
                      </div>
                    )}
                   </div>

                   {index === letterPages.length - 1 && <ClosingBlock resume={resume} theme={theme} />}
                </div>
              </PaperPage>
            ))}
          </>
        )}
      </div>

      {/* Reimagined Action Pill */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A] px-3 py-3 rounded-full flex gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] items-center z-30 border border-white/5">
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black rounded-full transition-all uppercase tracking-widest ${isEditing ? 'bg-[#FAFF00] text-black shadow-[0_0_20px_rgba(250,255,0,0.3)]' : 'bg-[#FAFF00]/10 text-[#FAFF00] hover:bg-[#FAFF00]/20'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {isEditing ? 'FINISH' : 'EDIT'}
        </button>
        
        <button 
          className="flex items-center gap-2 px-6 py-3 text-[10px] font-black bg-[#5EF3FF] text-black hover:bg-[#4DD0E1] rounded-full transition-all shadow-[0_0_20px_rgba(94,243,255,0.2)] active:scale-95 transform uppercase tracking-widest"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          DOWNLOAD
        </button>
        
        <button 
          onClick={() => setShowShareDialog(!showShareDialog)}
          className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black rounded-full transition-all border uppercase tracking-widest ${showShareDialog ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:bg-white/5'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          EXPORT
        </button>
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-[10px] font-black uppercase tracking-[0.2em] border-b-2 border-black/10 pb-1 mb-4 text-black/80">
    {title}
  </div>
);

export default Stage;