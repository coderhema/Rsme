
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ResumeData, AISuggestion, AppMode, ResumeTheme, LetterTheme, ExperienceItem, EducationItem } from './types';
import { calculateATSScore, getAISuggestions, generateCoverLetter, analyzeJobLink, parseResume } from './services/geminiService';
import Sidebar from './components/Sidebar';
import Stage from './components/Stage';
import AccountDropdown from './components/AccountDropdown';

const INITIAL_RESUME: ResumeData = {
  name: "Fullname Here",
  role: "Your Job Title",
  email: "name@email.com",
  phone: "+1 234 555 0192",
  location: "City, State",
  summary: "A brief summary of your professional background, key skills, and career goals. Focus on your expertise and what you bring to the table.",
  experience: [
    {
      id: '1',
      title: "Role Title",
      company: "Company Name",
      period: "Year - Present",
      description: "Description of your responsibilities and achievements in this role. Highlight the impact you made and the skills you utilized."
    },
    {
      id: '2',
      title: "Previous Role Title",
      company: "Previous Company",
      period: "Year - Year",
      description: "Description of your responsibilities and achievements in your previous role."
    }
  ],
  skills: ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  education: [
    {
      id: 'ed1',
      degree: "Degree Name",
      school: "University Name",
      year: "Graduation Year"
    }
  ],
  certificates: ["Certificate Name", "Another Certification"],
  customSections: [],
};

const App: React.FC = () => {
  const [user, setUser] = useState<{ name: string; email: string; seed: string }>({
    name: "Tolulope Olugbemi",
    email: "tolulope@rsme.app",
    seed: "rsme-user-1"
  });
  const [resume, setResume] = useState<ResumeData>(INITIAL_RESUME);
  const [coverLetter, setCoverLetter] = useState<string>("Click 'Generate' to create a custom cover letter based on your resume.");
  const [coverLetterContext, setCoverLetterContext] = useState<string>("");
  const [mode, setMode] = useState<AppMode>('RESUME');
  const [resumeTheme, setResumeTheme] = useState<ResumeTheme>(ResumeTheme.MODERN);
  const [letterTheme, setLetterTheme] = useState<LetterTheme>(LetterTheme.MODERN);
  const [atsScore, setAtsScore] = useState<number>(0);
  const [isAtsLoading, setIsAtsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [completedSuggestions, setCompletedSuggestions] = useState<AISuggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<AISuggestion | null>(null);

  const [jobLinks, setJobLinks] = useState<string[]>([]);
  const [jobContext, setJobContext] = useState<string>("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const updateATSScore = useCallback(async () => {
    setIsAtsLoading(true);
    const score = await calculateATSScore(resume, jobContext);
    setAtsScore(score);
    setIsAtsLoading(false);
  }, [resume, jobContext]);

  useEffect(() => {
    updateATSScore();
  }, [resume, updateATSScore]);

  const fetchSuggestions = useCallback(async () => {
    if (mode !== 'RESUME') return;
    setIsAiLoading(true);
    const results = await getAISuggestions(resume, jobContext);
    setSuggestions(results.map(res => ({
      ...res,
      isApplied: false
    })));
    setIsAiLoading(false);
  }, [resume, mode, jobContext]);

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
    setResume(prev => {
      let nextResume = { ...prev };
      if (suggestion.field === 'summary') {
        nextResume.summary = suggestion.suggestion;
      } else if (suggestion.field.startsWith('experience')) {
        const expId = suggestion.field.split(':')[1];
        if (expId) {
          nextResume.experience = nextResume.experience.map(exp => 
            exp.id === expId ? { ...exp, description: suggestion.suggestion } : exp
          );
        }
      }
      return nextResume;
    });
    
    const appliedSuggestion = { ...suggestion, isApplied: true };
    setCompletedSuggestions(prev => [appliedSuggestion, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setSelectedSuggestionIds(prev => prev.filter(id => id !== suggestion.id));
    setActiveSuggestion(null);
  };

  const handleApplySelected = () => {
    const toApply = suggestions.filter(s => selectedSuggestionIds.includes(s.id));
    toApply.forEach(s => applySuggestion(s));
  };

  const handleAddJobLink = async (url: string) => {
    if (!url) return;
    setJobLinks(prev => [...prev, url]);
    setIsAiLoading(true);
    const details = await analyzeJobLink(url);
    setJobContext(prev => prev + "\n\n" + details);
    setIsAiLoading(false);
  };

  const handleRemoveJobLink = (index: number) => {
    setJobLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateCoverLetter = async () => {
    setIsAiLoading(true);
    const content = await generateCoverLetter(resume, coverLetterContext);
    // Basic clean up of markdown bold if present
    const cleanContent = content.replace(/\*\*/g, '').replace(/### /g, '');
    setCoverLetter(cleanContent);
    setIsAiLoading(false);
  };



  const handleUploadResume = async (data: ResumeData) => {
    setResume(data);
    setMode('RESUME');
  };

  return (
    <div className="flex h-screen bg-[#121212] overflow-hidden select-none font-sans print:h-auto print:overflow-visible print:bg-white print:block">
      <Sidebar 
        mode={mode}
        setMode={setMode}
        atsScore={atsScore}
        isAtsLoading={isAtsLoading}
        suggestions={suggestions}
        completedSuggestions={completedSuggestions}
        selectedSuggestionIds={selectedSuggestionIds}
        onToggleSuggestionSelection={(id) => setSelectedSuggestionIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )}
        onApplySelected={handleApplySelected}
        isAiLoading={isAiLoading}
        theme={mode === 'RESUME' ? resumeTheme : letterTheme}
        setTheme={mode === 'RESUME' ? setResumeTheme : setLetterTheme}
        onSelectSuggestion={setActiveSuggestion}
        onGenerateCoverLetter={handleGenerateCoverLetter}
        coverLetterContext={coverLetterContext}
        onUpdateLetterContext={setCoverLetterContext}
        jobLinks={jobLinks}
        onAddJobLink={handleAddJobLink}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onRemoveJobLink={handleRemoveJobLink}
      />
      
      <div className="relative flex-1 flex">
        <div className="absolute top-8 right-8 z-50 print:hidden">
          <AccountDropdown 
            user={user}
            onLogout={() => {}}
            isOpen={isAccountOpen}
            onToggle={() => setIsAccountOpen(!isAccountOpen)}
            isCollapsed={false}
          />
        </div>
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
        onUploadResume={handleUploadResume}
        isAiLoading={isAiLoading}
        setIsAiLoading={setIsAiLoading}
        suggestions={suggestions}
        selectedSuggestionIds={selectedSuggestionIds}
        onDeselectSuggestion={(id) => setSelectedSuggestionIds(prev => prev.filter(i => i !== id))}
        onApplySelected={handleApplySelected}
      />
      </div>
    </div>
  );
};

export default App;
