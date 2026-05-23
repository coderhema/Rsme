
export interface ResumeData {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  date?: string;
  salutation?: string;
  closingPhrase?: string;
  experience: ExperienceItem[];
  skills: string[];
  education: EducationItem[];
  certificates: string[];
  customSections?: CustomSection[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface CustomSectionItem {
  id: string;
  text: string;
}

export interface CustomSection {
  id: string;
  name: string;
  items: CustomSectionItem[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface AISuggestion {
  id: string;
  type: 'REWRITE' | 'IMPACT' | 'QUANTIFY';
  original: string;
  suggestion: string;
  field: string;
  isApplied?: boolean;
}

export type AppMode = 'RESUME' | 'COVER_LETTER';

export enum ResumeTheme {
  MODERN = 'MODERN',
  MINIMAL = 'MINIMAL',
  CREATIVE = 'CREATIVE',
  PROFESSIONAL = 'PROFESSIONAL',
  EXECUTIVE = 'EXECUTIVE',
  ACADEMIC = 'ACADEMIC'
}

export enum LetterTheme {
  CLASSIC = 'CLASSIC',
  MODERN = 'MODERN',
  BOLD = 'BOLD'
}
