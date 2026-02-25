
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ResumeData, AISuggestion, AppMode, ResumeTheme, LetterTheme, ExperienceItem, EducationItem } from './types';
import { calculateATSScore, getAISuggestions, generateCoverLetter, roastResume } from './services/geminiService';
import Sidebar from './components/Sidebar';
import Stage from './components/Stage';

const INITIAL_RESUME: ResumeData = {
  name: "Alex Morgan",
  role: "Senior Product Designer",
  email: "alex.morgan@design.io",
  phone: "+1 415 555 0192",
  location: "San Francisco, CA",
  summary: "Results-driven Product Designer with 6+ years of experience in fintech and SaaS. Expertise in design systems, high-fidelity prototyping, and user-centered methodologies.",
  experience: [
    {
      id: '1',
      title: "Senior Designer",
      company: "Creative Studio",
      period: "2020 - Present",
      description: "Led design system overhaul improving consistency across 4 product lines. Mentored junior designers and managed stakeholder relationships."
    },
    {
      id: '2',
      title: "UX Designer",
      company: "TechStart Inc",
      period: "2018 - 2020",
      description: "Designed mobile-first experiences for fintech application serving 1M+ users. Focused on onboarding conversion."
    }
  ],
  skills: ["UI/UX Design", "Design Systems", "Figma", "React", "Prototyping", "User Research"],
  education: [
    {
      id: 'ed1',
      degree: "B.A. Graphic Design",
      school: "Design Institute of Arts",
      year: "2018"
    }
  ]
};

const App: React.FC = () => {
  const [resume, setResume] = useState<ResumeData>(INITIAL_RESUME);
  const [coverLetter, setCoverLetter] = useState<string>("Click 'Generate' to create a custom cover letter based on your resume.");
  const [coverLetterContext, setCoverLetterContext] = useState<string>("");
  const [mode, setMode] = useState<AppMode>('RESUME');
  const [resumeTheme, setResumeTheme] = useState<ResumeTheme>(ResumeTheme.MODERN);
  const [letterTheme, setLetterTheme] = useState<LetterTheme>(LetterTheme.MODERN);
  const [atsScore, setAtsScore] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<AISuggestion | null>(null);
  const [roast, setRoast] = useState<string | null>(null);

  useEffect(() => {
    setAtsScore(calculateATSScore(resume));
  }, [resume]);

  const fetchSuggestions = useCallback(async () => {
    if (mode !== 'RESUME') return;
    setIsAiLoading(true);
    const results = await getAISuggestions(resume);
    setSuggestions(prev => {
      const appliedIds = prev.filter(s => s.isApplied).map(s => s.id);
      return results.map(res => ({
        ...res,
        isApplied: appliedIds.includes(res.id)
      }));
    });
    setIsAiLoading(false);
  }, [resume, mode]);

  useEffect(() => {
    const timer = setTimeout(fetchSuggestions, 3000);
    return () => clearTimeout(timer);
  }, [resume, fetchSuggestions]);

  const handleUpdateResume = (field: keyof ResumeData, value: any) => {
    setResume(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const handleUpdateEducation = (id: string, field: keyof EducationItem, value: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map(ed => ed.id === id ? { ...ed, [field]: value } : ed)
    }));
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    if (suggestion.field === 'summary') {
      handleUpdateResume('summary', suggestion.suggestion);
    } else if (suggestion.field.startsWith('experience')) {
      const expId = suggestion.field.split(':')[1];
      if (expId) {
        handleUpdateExperience(expId, 'description', suggestion.suggestion);
      }
    }
    
    setSuggestions(prev => prev.map(s => 
      s.id === suggestion.id ? { ...s, isApplied: true } : s
    ));
    setActiveSuggestion(null);
  };

  const handleGenerateCoverLetter = async () => {
    setIsAiLoading(true);
    const content = await generateCoverLetter(resume, coverLetterContext);
    // Basic clean up of markdown bold if present
    const cleanContent = content.replace(/\*\*/g, '').replace(/### /g, '');
    setCoverLetter(cleanContent);
    setIsAiLoading(false);
  };

  const handleRoast = async (data?: ResumeData | string) => {
    setIsAiLoading(true);
    const result = await roastResume(data || resume);
    setRoast(result);
    setIsAiLoading(false);
  };

  return (
    <div className="flex h-screen bg-[#121212] overflow-hidden select-none font-sans">
      <Sidebar 
        mode={mode}
        setMode={setMode}
        atsScore={atsScore}
        suggestions={suggestions}
        isAiLoading={isAiLoading}
        theme={mode === 'RESUME' ? resumeTheme : letterTheme}
        setTheme={mode === 'RESUME' ? setResumeTheme : setLetterTheme}
        onSelectSuggestion={setActiveSuggestion}
        onGenerateCoverLetter={handleGenerateCoverLetter}
        coverLetterContext={coverLetterContext}
        onUpdateLetterContext={setCoverLetterContext}
      />
      
      <Stage 
        resume={resume}
        coverLetter={coverLetter}
        mode={mode}
        theme={mode === 'RESUME' ? resumeTheme : letterTheme}
        activeSuggestion={activeSuggestion}
        onCloseSuggestion={() => setActiveSuggestion(null)}
        onApplySuggestion={applySuggestion}
        onUpdateResume={handleUpdateResume}
        onUpdateExperience={handleUpdateExperience}
        onUpdateEducation={handleUpdateEducation}
        onUpdateCoverLetter={setCoverLetter}
        onRoast={handleRoast}
        roast={roast}
        onCloseRoast={() => setRoast(null)}
      />
    </div>
  );
};

export default App;
