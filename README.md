<div align="center">
<img width="1920" height="1080" alt="Typecraft banner" src="https://github.com/user-attachments/assets/94ab1c87-6cd7-489c-b2fa-2f4295b7d8df" />

[![License: CC BY-ND 4.0](https://img.shields.io/badge/License-CC_BY--ND_4.0-lightgrey.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

</div>

# Rsme

A desktop-class resume and cover letter builder with AI-powered ATS scoring and content optimization. Create, edit, and optimize professional resumes and cover letters with real-time feedback.

## Features

- **Resume Builder** — Inline editing on a live, print-precise A4 preview with support for experience, education, skills, certifications, and custom sections
- **Cover Letter Generator** — AI-generated cover letters tailored to your resume and a target job description, with signature support (draw, type, or upload)
- **ATS Scoring** — Real-time scoring (100-point scale) combining structure completeness, keyword matching, and AI semantic evaluation
- **Smart Suggestions** — AI-powered rewrite, impact, and quantify suggestions for each resume entry
- **Job Link Analysis** — Paste a job posting URL and the AI extracts key requirements and desired skills
- **Resume Parsing** — Upload an existing resume (PDF, DOCX, or TXT) and have its content extracted and structured automatically
- **Multi-Theme** — 6 resume themes and 3 letter themes with distinct typography and layouts
- **Export & Share** — Download as PDF via browser print, or share via LinkedIn, WhatsApp, or Email

## Prerequisites

- Node.js

## Getting Started

1. Install dependencies:
   `npm install`

2. Set your Cencori API key in `.env`:
   `CENCORI_API_KEY=your_key_here`

3. Start the dev server:
   `npm run dev`

   This runs both the Vite frontend (port 3000) and the Express document parsing server (port 3001) concurrently.
