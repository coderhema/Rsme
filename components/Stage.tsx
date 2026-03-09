import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { Sparks as Sparkles, Xmark as X, Check, ArrowRight, EditPencil as PenLine, Plus } from 'iconoir-react';
import { ResumeData, AISuggestion, AppMode, ResumeTheme, LetterTheme, ExperienceItem, EducationItem } from '../types';
import { parseResume } from '../services/geminiService';

interface StageProps {
  resume: ResumeData;
  coverLetter: string;
  mode: AppMode;
  theme: ResumeTheme | LetterTheme;
  activeSuggestion: AISuggestion | null;
  suggestions?: AISuggestion[];
  selectedSuggestionIds?: string[];
  onDeselectSuggestion?: (id: string) => void;
  onCloseSuggestion: () => void;
  onApplySuggestion: (s: AISuggestion) => void;
  onUpdateResume: (field: keyof ResumeData, value: any) => void;
  onUpdateExperience: (id: string, field: keyof ExperienceItem, value: string) => void;
  onUpdateEducation: (id: string, field: keyof EducationItem, value: string) => void;
  onUpdateCoverLetter: (v: string) => void;
  onRoast: (data?: ResumeData | string) => void;
  onUploadResume: (data: ResumeData) => void;
  roast: string | null;
  onCloseRoast: () => void;
  isAiLoading: boolean;
  setIsAiLoading: (v: boolean) => void;
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
  isActiveSuggestion?: boolean;
}

const EditableText: React.FC<EditableTextProps> = ({
  fieldKey,
  value,
  onChange,
  className,
  multiline = false,
  isEditing,
  animatingField,
  displayedValues,
  isActiveSuggestion = false
}) => {
  const isThisAnimating = animatingField === fieldKey;
  const valToDisplay = isThisAnimating ? (displayedValues[fieldKey] || value) : value;

  const highlightClass = isActiveSuggestion ? 'ring-2 ring-violet-400 ring-offset-4 ring-offset-white bg-violet-50 rounded-sm transition-all duration-500' : '';

  if (!isEditing && !isThisAnimating) {
    return <div id={fieldKey} className={`${className} min-h-[1.2em] break-words whitespace-pre-wrap ${highlightClass}`}>{valToDisplay}</div>;
  }

  if (isThisAnimating) {
    return (
      <div id={fieldKey} className={`${className} min-h-[1.2em] break-words whitespace-pre-wrap relative text-violet-600 font-medium bg-violet-400/5 px-2 -mx-2 rounded transition-all duration-300`}>
        {valToDisplay}
        <span className="inline-block w-[3px] h-[1.2em] bg-violet-500 ml-1 translate-y-1 animate-pulse"></span>
        <div className="absolute -top-5 right-0 flex items-center gap-1.5 px-2 py-1 bg-black rounded-full border border-violet-500/30 shadow-[0_0_15px_rgba(0,68,221,0.2)]">
          <PenLine width={10} height={10} className="text-violet-400 animate-bounce" />
          <div className="text-[8px] font-black uppercase tracking-[0.15em] bg-gradient-to-r from-violet-400 via-white to-violet-400 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">Processing...</div>
        </div>
      </div>
    );
  }

  const sharedClasses = `${className} w-full bg-transparent focus:outline-none focus:bg-violet-50/50 hover:bg-black/5 cursor-text transition-colors px-1 -mx-1 rounded border-b border-transparent focus:border-violet-400/30 overflow-hidden no-scrollbar ${highlightClass}`;

  return multiline ? (
    <textarea
      id={fieldKey}
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
      id={fieldKey}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={sharedClasses}
    />
  );
};

const PaperPage: React.FC<React.PropsWithChildren<{ className?: string, themeClass: string, isMinimal?: boolean, isShimmering?: boolean }>> = ({ children, className = "", themeClass, isMinimal, isShimmering }) => (
  <div
    className={`w-[${PAGE_WIDTH}px] min-w-[${PAGE_WIDTH}px] h-[${PAGE_HEIGHT}px] bg-white text-black overflow-hidden relative ${isMinimal ? 'shadow-sm border border-gray-50' : 'resume-shadow shadow-2xl border border-gray-100'} ${themeClass} ${className} ${isShimmering ? 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent after:animate-shimmer after:bg-[length:200%_100%]' : ''}`}
    style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
  >
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
    <div className={`w-24 h-12 italic font-serif text-2xl select-none px-2 flex items-end ${theme === LetterTheme.CLASSIC ? 'border-b border-gray-300 text-gray-400 opacity-60' : 'border-b-2 border-black/10 text-gray-200 opacity-40'}`}>
      {resume.name.split(' ')[0]}
    </div>
  </div>
);

const Stage: React.FC<StageProps> = ({
  resume, coverLetter, mode, theme, activeSuggestion, suggestions = [], selectedSuggestionIds = [], onDeselectSuggestion, onCloseSuggestion, onApplySuggestion, onUpdateResume, onUpdateExperience, onUpdateEducation, onUpdateCoverLetter,
  onRoast, onUploadResume, roast, onCloseRoast, isAiLoading, setIsAiLoading
}) => {
  const [zoom, setZoom] = useState<number>(0.85);
  const zoomValue = useMotionValue(zoom);
  useEffect(() => {
    zoomValue.set(zoom);
  }, [zoom]);
  const smoothZoom = useSpring(zoomValue, { stiffness: 300, damping: 30 });
  const suggestionScale = useTransform(smoothZoom as any, [0.5, 1, 2], [1.2, 1, 0.9]);

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [animatingField, setAnimatingField] = useState<string | null>(null);
  const [displayedValues, setDisplayedValues] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const suggestionsToShow = useMemo(() => {
    if (activeSuggestion) return [activeSuggestion];
    if (selectedSuggestionIds.length > 0) {
      return suggestions.filter(s => selectedSuggestionIds.includes(s.id));
    }
    return [];
  }, [activeSuggestion, selectedSuggestionIds, suggestions]);

  const [suggestionBoxPos, setSuggestionBoxPos] = useState({ x: 0, y: 0 });
  const suggestionRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setIsUploading(true);
    setIsAiLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);

      // Send the file to our custom backend parsing API
      const response = await fetch('http://localhost:3001/api/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse document on server');
      }

      const data = await response.json();
      const extractedText = data.text;

      if (!extractedText) {
        throw new Error('No text could be extracted from this document');
      }

      // Structure the extracted text using AI
      const parsed = await parseResume(extractedText);
      if (parsed) onUploadResume(parsed);
      
      setIsAiLoading(false);
      setIsUploading(false);
    } catch (error) {
      console.error("File processing error:", error);
      alert("Failed to process document. Please try again.");
      setIsAiLoading(false);
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const updatePos = () => {
      if (suggestionsToShow.length > 0 && suggestionRef.current) {
        const rect = suggestionRef.current.getBoundingClientRect();
        setSuggestionBoxPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    };

    updatePos();
    const interval = setInterval(updatePos, 50); // Poll for scale/position changes
    return () => clearInterval(interval);
  }, [suggestionsToShow, zoom]);

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

  useEffect(() => {
    smoothZoom.set(zoom);
  }, [zoom, smoothZoom]);

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

  const isFieldActiveSuggestion = useCallback((fieldKey: string) => {
    return suggestionsToShow.some(s => {
      let targetId = s.field;
      if (targetId.startsWith('experience:')) {
        targetId = `exp-desc-${targetId.split(':')[1]}`;
      }
      return targetId === fieldKey;
    });
  }, [suggestionsToShow]);

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
        case ResumeTheme.MODERN: return 'font-serif';
        case ResumeTheme.PROFESSIONAL: return 'font-sans tracking-wide';
        case ResumeTheme.EXECUTIVE: return 'font-sans font-medium';
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

  const resumePages = useMemo(() => {
    if (mode !== 'RESUME') return [];

    const experiences = resume.experience;
    const pages: ExperienceItem[][] = [];

    // Adjust limits based on theme density
    let firstPageLimit = 3;
    let subsequentPageLimit = 6;

    if (theme === ResumeTheme.MINIMAL) {
      firstPageLimit = 4;
      subsequentPageLimit = 7;
    } else if (theme === ResumeTheme.MODERN || theme === ResumeTheme.CREATIVE) {
      firstPageLimit = 2; // Larger headers
      subsequentPageLimit = 5;
    }

    if (experiences.length <= firstPageLimit) {
      return [experiences];
    }

    pages.push(experiences.slice(0, firstPageLimit));

    let remaining = experiences.slice(firstPageLimit);
    while (remaining.length > 0) {
      pages.push(remaining.slice(0, subsequentPageLimit));
      remaining = remaining.slice(subsequentPageLimit);
    }

    return pages;
  }, [mode, resume.experience, theme]);

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out my professional document created with rsme!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('My Professional Document');
    const body = encodeURIComponent(`Hi, please find my document generated via rsme.`);
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
    <div
      className={`flex-1 relative dot-grid bg-[#0D0D0D] flex flex-col items-center py-12 overflow-y-auto no-scrollbar scroll-smooth transition-colors duration-300 ${isOver ? 'bg-violet-400/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* Drop Zone Indicator */}
      <AnimatePresence>
        {isOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-12 z-50 rounded-[40px] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none overflow-hidden"
          >
            {/* Animated glowing border */}
            <div className="absolute inset-0 border-[3px] border-transparent rounded-[40px] bg-[conic-gradient(from_0deg,var(--color-violet-400),white,var(--color-violet-400))] animate-[spin_4s_linear_infinite] [mask-image:linear-gradient(white,white)] [mask-clip:content-box,border-box] p-[3px] opacity-70">
                <div className="w-full h-full bg-black/40 rounded-[37px] backdrop-blur-3xl" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-24 h-24 bg-gradient-to-br from-violet-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-[0_0_80px_rgba(0,68,221,0.5)] mb-8 rotate-12 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 blur-xl mix-blend-overlay"></div>
                <Plus width={48} height={48} className="text-white drop-shadow-lg" />
              </motion.div>
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-white font-black text-4xl uppercase tracking-[0.3em] drop-shadow-lg mb-3">
                Drop to Import
              </div>
              <div className="flex gap-3">
                {['PDF', 'DOCX', 'TXT'].map((ext) => (
                    <div key={ext} className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-sm">
                        {ext}
                    </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploading Status Indicator */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-black/80 backdrop-blur-xl border border-violet-400/30 rounded-2xl p-4 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(0,68,221,0.2)]"
          >
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 border-[3px] border-violet-400/20 rounded-full"></div>
              <div className="absolute inset-0 border-[3px] border-violet-400 rounded-full border-t-transparent animate-[spin_1s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite]"></div>
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse blur-[1px]"></div>
            </div>
            <div className="flex flex-col pr-2">
              <div className="text-white font-black text-[11px] uppercase tracking-[0.15em] mb-0.5 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Uploading & Magic...</div>
              <div className="text-violet-400/80 text-[8px] font-mono uppercase tracking-widest flex items-center gap-1.5">
                Processing Content
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-violet-400/80 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-violet-400/80 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-violet-400/80 rounded-full animate-bounce"></span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Control */}
      <div className="fixed right-12 top-1/2 -translate-y-1/2 flex items-center gap-6 h-[400px] z-40 group/zoom">
        <div className="flex flex-col justify-between h-full text-[10px] font-mono font-black select-none pr-2 text-right transition-colors">
          <span className={`transition-all duration-300 ${zoom >= 1.75 ? 'text-violet-400 scale-110' : 'text-gray-600'}`}>200%</span>
          <span className={`transition-all duration-300 ${zoom > 0.85 && zoom < 1.15 ? 'text-violet-400 scale-110' : 'text-gray-600'}`}>100%</span>
          <span className={`transition-all duration-300 ${zoom <= 0.75 ? 'text-violet-400 scale-110' : 'text-gray-600'}`}>50%</span>
        </div>

        <div
          ref={trackRef}
          className="relative h-full w-6 flex justify-center cursor-ns-resize group/track"
          onMouseDown={(e) => {
            const rect = trackRef.current!.getBoundingClientRect();
            const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            const pct = 1 - (y / rect.height);
            setZoom(0.5 + pct * 1.5);
            setIsDragging(true);
          }}
        >
          {/* Track Line */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-white/10 rounded-full group-hover/zoom:bg-white/20 transition-colors" />

          {/* Ticks */}
          <div className="absolute left-0 right-0 top-0 h-[1px] bg-white/20"></div>
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/20"></div>
          <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-white/20"></div>

          <motion.div
            className={`absolute left-0 w-6 h-12 bg-violet-400 rounded-lg shadow-[0_0_30px_rgba(0,68,221,0.4)] flex flex-col items-center justify-center pointer-events-auto cursor-ns-resize z-10`}
            style={{
              bottom: `${((zoom - 0.5) / 1.5) * 100}%`,
              y: '50%'
            }}
            whileHover={{ scale: 1.1, shadow: '0_0_40px_rgba(0,68,221,0.6)' }}
            whileTap={{ scale: 0.95 }}
            animate={{
              shadow: isDragging ? '0_0_45px_rgba(0,68,221,0.6)' : '0_0_30px_rgba(0,68,221,0.4)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDragging(true);
            }}
          >
            <div className="w-3 h-[2px] bg-black/30 mb-[3px] rounded-full"></div>
            <div className="w-3 h-[2px] bg-black/30 mb-[3px] rounded-full"></div>
            <div className="w-3 h-[2px] bg-black/30 rounded-full"></div>
          </motion.div>
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
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs font-bold">LinkedIn</div>
                    <div className="text-gray-500 text-[10px]">Post to your profile</div>
                  </div>
                </button>
                <button onClick={shareToWhatsApp} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-[#25D366] flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884 0 2.225.569 3.808 1.693 5.75l-.998 3.645 3.794-.994zm11.366-7.4c-.312-.156-1.848-.912-2.134-1.017-.286-.104-.494-.156-.701.156-.207.312-.803 1.017-.984 1.225-.181.208-.363.234-.675.078-.312-.156-1.317-.484-2.508-1.548-.926-.826-1.551-1.846-1.733-2.158-.181-.312-.019-.481.137-.635.141-.139.312-.364.467-.546.156-.182.208-.312.312-.52.104-.208.052-.39-.026-.546-.078-.156-.701-1.691-.96-2.313-.252-.603-.51-.52-.701-.531-.182-.011-.39-.011-.597-.011-.208 0-.546.078-.831.39-.286.312-1.091 1.067-1.091 2.6 0 1.533 1.117 3.014 1.272 3.221.156.208 2.197 3.355 5.323 4.704.743.321 1.324.512 1.777.655.748.237 1.43.203 1.969.123.6-.089 1.848-.755 2.108-1.485.26-.73.26-1.353.182-1.485-.077-.13-.285-.208-.597-.364z" /></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white text-xs font-bold">WhatsApp</div>
                    <div className="text-gray-500 text-[10px]">Send to contacts</div>
                  </div>
                </button>
                <button onClick={shareViaEmail} className="flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-[#EA4335] flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l-12-9.725v15.438h24v-15.438l-12 9.725z" /></svg>
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
      <AnimatePresence>
        {suggestionsToShow.length > 0 && (
          <>
            {suggestionsToShow.map(s => (
              <SuggestionLine key={s.id} activeSuggestion={s} boxPos={suggestionBoxPos} />
            ))}
            <motion.div
              ref={suggestionRef}
              drag
              dragMomentum={false}
              onDrag={(e, info) => {
                if (suggestionRef.current) {
                  const rect = suggestionRef.current.getBoundingClientRect();
                  setSuggestionBoxPos({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                  });
                }
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ scale: suggestionScale }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-[20%] left-[50%] -ml-[300px] w-[600px] max-w-[90vw] bg-[#1A1A1A] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[70] overflow-visible cursor-grab active:cursor-grabbing origin-center"
            >
              <div className="bg-gradient-to-r from-violet-400 via-white to-violet-400 bg-[length:200%_auto] animate-shimmer text-black px-4 py-2.5 font-black text-[9px] tracking-[0.2em] flex justify-between items-center rounded-t-xl">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="rsme logo" className="h-6 w-auto brightness-0 invert opacity-90" />
                </div>
                <button
                  onClick={() => {
                    onCloseSuggestion();
                    if (onDeselectSuggestion) {
                      suggestionsToShow.forEach(s => onDeselectSuggestion(s.id));
                    }
                  }}
                  className="hover:rotate-90 transition-transform p-1"
                >
                  <X width={14} height={14} />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                {suggestionsToShow.map(s => (
                  <div key={s.id} className="flex flex-col gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                          CURRENT
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium leading-relaxed italic border-l-2 border-white/5 pl-3 py-1 bg-white/[0.02] rounded-r">
                          "{s.original.length > 200 ? s.original.substring(0, 200) + '...' : s.original}"
                        </div>
                      </div>

                      <div className="flex-1 p-3 bg-violet-400/5 rounded-lg border border-violet-400/20 relative group">
                        <div className="text-[8px] font-black text-violet-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
                          SUGGESTION
                        </div>
                        <div className="text-xs text-white font-semibold leading-relaxed">
                          {s.suggestion}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          if (activeSuggestion && activeSuggestion.id === s.id) {
                            onCloseSuggestion();
                          }
                          if (onDeselectSuggestion) {
                            onDeselectSuggestion(s.id);
                          }
                        }}
                        className="px-4 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-[9px] font-bold rounded-lg uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
                      >
                        DISCARD
                      </button>
                      <button
                        onClick={() => handleApplySuggestion(s)}
                        className="px-4 py-1.5 bg-violet-400 text-black text-[9px] font-black rounded-lg uppercase tracking-widest hover:bg-violet-300 shadow-[0_5px_15px_rgba(0,68,221,0.2)] hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center gap-2"
                      >
                        APPLY <ArrowRight width={12} height={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        ref={containerRef}
        style={{ scale: smoothZoom, transformOrigin: 'top center' }}
        className="flex flex-col gap-10 items-center"
      >
        {mode === 'RESUME' ? (
          <>
            {resumePages.map((pageExperiences, index) => (
              <PaperPage key={index} themeClass={themeClass} isMinimal={theme === ResumeTheme.MINIMAL} isShimmering={isAiLoading} className={index > 0 ? "animate-in fade-in slide-in-from-top-4 duration-700" : ""}>
                <div className={`h-full flex flex-col ${theme === ResumeTheme.MINIMAL ? 'p-16' : 'p-12'}`}>
                  {index === 0 ? (
                    <>
                      <div className={`mb-8 ${theme === ResumeTheme.CREATIVE || theme === ResumeTheme.EXECUTIVE ? 'bg-[#2c3e50] text-white -m-12 p-12 mb-8' : ''} ${theme === ResumeTheme.MINIMAL ? 'text-center border-b border-gray-100 pb-8' : ''}`}>
                        <EditableText
                          fieldKey="name"
                          value={resume.name}
                          onChange={(v) => onUpdateResume('name', v)}
                          className={`text-4xl font-extrabold uppercase tracking-tight ${theme === ResumeTheme.MODERN ? 'font-["Playfair_Display"] text-5xl normal-case' : ''} ${theme === ResumeTheme.MINIMAL ? 'text-3xl font-light tracking-[0.3em] text-gray-900' : ''}`}
                          isEditing={isEditing}
                          animatingField={animatingField}
                          displayedValues={displayedValues}
                        />
                        <EditableText
                          fieldKey="role"
                          value={resume.role}
                          onChange={(v) => onUpdateResume('role', v)}
                          className={`text-sm font-medium uppercase tracking-[0.2em] mt-2 ${theme === ResumeTheme.MINIMAL ? 'text-gray-400 font-light' : 'text-gray-500'}`}
                          isEditing={isEditing}
                          animatingField={animatingField}
                          displayedValues={displayedValues}
                        />
                      </div>

                      <div className="grid grid-cols-12 gap-8 flex-1 overflow-visible">
                        <div className={`col-span-4 ${(theme === ResumeTheme.CREATIVE || theme === ResumeTheme.EXECUTIVE) ? 'border-r pr-4' : ''}`}>
                          <SectionTitle title="Contact" minimal={theme === ResumeTheme.MINIMAL} />
                          <div className={`text-[11px] text-gray-600 leading-relaxed space-y-1 mb-8 font-medium ${theme === ResumeTheme.MINIMAL ? 'text-gray-400' : ''}`}>
                            <EditableText fieldKey="email" value={resume.email} onChange={(v) => onUpdateResume('email', v)} isEditing={isEditing} animatingField={animatingField} displayedValues={displayedValues} />
                            <EditableText fieldKey="phone" value={resume.phone} onChange={(v) => onUpdateResume('phone', v)} isEditing={isEditing} animatingField={animatingField} displayedValues={displayedValues} />
                            <EditableText fieldKey="location" value={resume.location} onChange={(v) => onUpdateResume('location', v)} isEditing={isEditing} animatingField={animatingField} displayedValues={displayedValues} />
                          </div>
                          <SectionTitle title="Skills" minimal={theme === ResumeTheme.MINIMAL} />
                          <div className="flex flex-wrap gap-1 mb-8">
                            <EditableText
                              fieldKey="skills"
                              value={resume.skills.join(', ')}
                              onChange={(v) => onUpdateResume('skills', v.split(',').map(s => s.trim()).filter(s => s !== ''))}
                              className={`text-[10px] font-bold tracking-tight w-full ${theme === ResumeTheme.MINIMAL ? 'text-gray-400 font-normal' : 'text-gray-700'}`}
                              isEditing={isEditing}
                              animatingField={animatingField}
                              displayedValues={displayedValues}
                            />
                          </div>
                          <SectionTitle title="Education" minimal={theme === ResumeTheme.MINIMAL} />
                          {resume.education.map(ed => (
                            <div key={ed.id} className="mb-4">
                              <EditableText
                                fieldKey={`ed-degree-${ed.id}`}
                                value={ed.degree}
                                onChange={(v) => onUpdateEducation(ed.id, 'degree', v)}
                                className={`text-[11px] font-bold tracking-tight ${theme === ResumeTheme.MINIMAL ? 'font-normal' : ''}`}
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
                          <SectionTitle title="Executive Summary" minimal={theme === ResumeTheme.MINIMAL} />
                          <div className="mb-8">
                            <EditableText
                              fieldKey="summary"
                              value={resume.summary}
                              onChange={(v) => onUpdateResume('summary', v)}
                              className={`text-[11px] leading-relaxed font-medium ${theme === ResumeTheme.MINIMAL ? 'text-gray-500 font-normal' : 'text-gray-700'}`}
                              multiline
                              isEditing={isEditing}
                              animatingField={animatingField}
                              displayedValues={displayedValues}
                              isActiveSuggestion={isFieldActiveSuggestion('summary')}
                            />
                          </div>
                          <SectionTitle title="Experience" minimal={theme === ResumeTheme.MINIMAL} />
                          <div className="space-y-6">
                            {pageExperiences.map(exp => (
                              <div key={exp.id} className="group">
                                <div className="flex justify-between items-baseline mb-1">
                                  <EditableText
                                    fieldKey={`exp-title-${exp.id}`}
                                    value={exp.title}
                                    onChange={(v) => onUpdateExperience(exp.id, 'title', v)}
                                    className={`font-bold text-sm tracking-tight flex-1 mr-2 ${theme === ResumeTheme.MINIMAL ? 'font-medium' : ''}`}
                                    isEditing={isEditing}
                                    animatingField={animatingField}
                                    displayedValues={displayedValues}
                                    isActiveSuggestion={isFieldActiveSuggestion(`exp-title-${exp.id}`)}
                                  />
                                  <EditableText
                                    fieldKey={`exp-period-${exp.id}`}
                                    value={exp.period}
                                    onChange={(v) => onUpdateExperience(exp.id, 'period', v)}
                                    className="text-[10px] text-gray-400 font-mono whitespace-nowrap text-right"
                                    isEditing={isEditing}
                                    animatingField={animatingField}
                                    displayedValues={displayedValues}
                                    isActiveSuggestion={isFieldActiveSuggestion(`exp-period-${exp.id}`)}
                                  />
                                </div>
                                <EditableText
                                  fieldKey={`exp-company-${exp.id}`}
                                  value={exp.company}
                                  onChange={(v) => onUpdateExperience(exp.id, 'company', v)}
                                  className={`text-[11px] font-bold mb-2 uppercase tracking-widest ${theme === ResumeTheme.MINIMAL ? 'text-gray-400 font-medium' : 'text-violet-600/80'}`}
                                  isEditing={isEditing}
                                  animatingField={animatingField}
                                  displayedValues={displayedValues}
                                  isActiveSuggestion={isFieldActiveSuggestion(`exp-company-${exp.id}`)}
                                />
                                <EditableText
                                  fieldKey={`exp-desc-${exp.id}`}
                                  value={exp.description}
                                  onChange={(v) => onUpdateExperience(exp.id, 'description', v)}
                                  className={`text-[11px] leading-relaxed ${theme === ResumeTheme.MINIMAL ? 'text-gray-500' : 'text-gray-700'}`}
                                  multiline
                                  isEditing={isEditing}
                                  animatingField={animatingField}
                                  displayedValues={displayedValues}
                                  isActiveSuggestion={isFieldActiveSuggestion(`exp-desc-${exp.id}`)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-8 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        <span>{resume.name} • Experience Continued</span>
                        <span>Page {index + 1}</span>
                      </div>
                      <div className="space-y-8">
                        {pageExperiences.map(exp => (
                          <div key={exp.id} className="group">
                            <div className="flex justify-between items-baseline mb-1">
                              <EditableText
                                fieldKey={`exp-title-${exp.id}`}
                                value={exp.title}
                                onChange={(v) => onUpdateExperience(exp.id, 'title', v)}
                                className={`font-bold text-sm tracking-tight flex-1 mr-2 ${theme === ResumeTheme.MINIMAL ? 'font-medium' : ''}`}
                                isEditing={isEditing}
                                animatingField={animatingField}
                                displayedValues={displayedValues}
                                isActiveSuggestion={isFieldActiveSuggestion(`exp-title-${exp.id}`)}
                              />
                              <EditableText
                                fieldKey={`exp-period-${exp.id}`}
                                value={exp.period}
                                onChange={(v) => onUpdateExperience(exp.id, 'period', v)}
                                className="text-[10px] text-gray-400 font-mono whitespace-nowrap text-right"
                                isEditing={isEditing}
                                animatingField={animatingField}
                                displayedValues={displayedValues}
                                isActiveSuggestion={isFieldActiveSuggestion(`exp-period-${exp.id}`)}
                              />
                            </div>
                            <EditableText
                              fieldKey={`exp-company-${exp.id}`}
                              value={exp.company}
                              onChange={(v) => onUpdateExperience(exp.id, 'company', v)}
                              className={`text-[11px] font-bold mb-2 uppercase tracking-widest ${theme === ResumeTheme.MINIMAL ? 'text-gray-400 font-medium' : 'text-violet-600/80'}`}
                              isEditing={isEditing}
                              animatingField={animatingField}
                              displayedValues={displayedValues}
                              isActiveSuggestion={isFieldActiveSuggestion(`exp-company-${exp.id}`)}
                            />
                            <EditableText
                              fieldKey={`exp-desc-${exp.id}`}
                              value={exp.description}
                              onChange={(v) => onUpdateExperience(exp.id, 'description', v)}
                              className={`text-[11px] leading-relaxed ${theme === ResumeTheme.MINIMAL ? 'text-gray-500' : 'text-gray-700'}`}
                              multiline
                              isEditing={isEditing}
                              animatingField={animatingField}
                              displayedValues={displayedValues}
                              isActiveSuggestion={isFieldActiveSuggestion(`exp-desc-${exp.id}`)}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </PaperPage>
            ))}
          </>
        ) : (
          <>
            {letterPages.map((pageContent, index) => (
              <PaperPage key={index} themeClass={themeClass} isShimmering={isAiLoading} className={index > 0 ? "animate-in fade-in slide-in-from-top-4 duration-700" : ""}>
                <div className={`h-full flex flex-col p-12`}>
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
                    {index === 0 && <div className="text-sm font-black text-black uppercase tracking-widest py-1">Dear Hiring Manager,</div>}

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
      </motion.div>

      {/* Reimagined Action Pill */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A] px-3 py-3 rounded-full flex gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] items-center z-30 border border-white/5">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold rounded-full transition-all tracking-wide ${isEditing ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-[#0044DD] text-white shadow-[0_0_20px_rgba(0,68,221,0.3)] hover:bg-[#0033aa]'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {isEditing ? 'Finish' : 'Edit'}
        </button>

        <button
          className="flex items-center gap-2 px-6 py-3 text-[11px] font-bold rounded-full transition-all border tracking-wide bg-transparent text-white border-white/20 hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>

        <button
          onClick={() => setShowShareDialog(!showShareDialog)}
          className={`flex items-center gap-2 px-6 py-3 text-[11px] font-bold rounded-full transition-all border tracking-wide ${showShareDialog ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:bg-white/5'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ title: string, minimal?: boolean }> = ({ title, minimal }) => (
  <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${minimal ? 'text-gray-400 border-none pb-0 mb-2' : 'border-b-2 border-black/10 pb-1 text-black/80'}`}>
    {title}
  </div>
);

const SuggestionLine: React.FC<{ activeSuggestion: AISuggestion, boxPos: { x: number, y: number } }> = ({ activeSuggestion, boxPos }) => {
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateTarget = () => {
      let targetId = activeSuggestion.field;
      if (targetId.startsWith('experience:')) {
        targetId = `exp-desc-${targetId.split(':')[1]}`;
      }
      const el = document.getElementById(targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
    };
    updateTarget();
    window.addEventListener('scroll', updateTarget);
    window.addEventListener('resize', updateTarget);
    const interval = setInterval(updateTarget, 100); // Poll for position changes during zoom/drag
    return () => {
      window.removeEventListener('scroll', updateTarget);
      window.removeEventListener('resize', updateTarget);
      clearInterval(interval);
    };
  }, [activeSuggestion]);

  if (!targetPos.x || !boxPos.x) return null;

  return (
    <svg className="fixed inset-0 pointer-events-none z-[65] w-full h-full">
      <defs>
        <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
          <circle cx="5" cy="5" r="4" fill="#8b5cf6" />
        </marker>
      </defs>
      <motion.path
        d={`M ${boxPos.x} ${boxPos.y} L ${targetPos.x} ${targetPos.y}`}
        stroke="#8b5cf6"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        markerEnd="url(#dot)"
      />
    </svg>
  );
};

export default Stage;