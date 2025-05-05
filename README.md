# Carousel Craft

A modern web application for generating AI-powered image carousels at scale.

## Overview

Carousel Craft allows you to create templates for image carousels and generate thousands of variations using AI. The application leverages OpenAI's GPT-4o for prompt generation and GPT-image-1 for image creation.

## Features

- Template management with configurable slides and variables
- CSV or script-based data input for mass generation
- Real-time job monitoring with progress tracking
- Prompt visualization and management
- Image library for browsing and organizing generated images
- Edge Function processing for scalable generation

## Tech Stack

- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase for database and Edge Functions
- OpenAI API for AI-powered generation

## Deployment

### Prerequisites

1. Supabase account and project
2. OpenAI API key
3. Node.js and npm installed

### Database Setup

1. Create the following tables in your Supabase project:
   - `templates` - For storing carousel templates
   - `jobs` - For tracking generation jobs
   - `carousel_prompts` - For storing generated prompts
   - `carousel_images` - For storing generated images

Refer to `supabase/functions/README.md` for detailed database schema.

### Edge Function Deployment

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Set the OpenAI API key as a secret:
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy generate-images
   ```

Refer to `supabase/functions/README.md` for detailed instructions.

### Frontend Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Deploy the built output to your hosting provider of choice (Vercel, Netlify, etc.)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. To test the Edge Function locally, refer to the instructions in `supabase/functions/README.md`.

## Usage

1. Create a template with slides and variable placeholders
2. Prepare your data in CSV format or as a JavaScript object
3. Create a new job, selecting the template and uploading your data
4. Monitor the job's progress in real-time
5. View and download the generated images

## License

MIT
