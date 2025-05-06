# Carousel Craft

A modern web application for creating AI-powered social media carousels with automated content generation.

## Overview

Carousel Craft helps content creators build engaging social media carousels by combining images with AI-generated texts, hooks, headlines, and scripts. The platform analyzes your images using OpenAI's GPT-4o vision capabilities and generates optimized social media content tailored to your carousel's theme.

## Features

- Image carousel management and organization
- AI-powered content generation for social media
- Automatically generates hooks, headlines, and full carousel scripts
- Customizable number of content variations
- Real-time processing with Supabase Edge Functions
- Modern, responsive UI built with React and Tailwind

## Tech Stack

- React + TypeScript
- Tailwind CSS + shadcn/ui for component styling
- Supabase for database, authentication, and Edge Functions
- OpenAI's GPT-4o for image analysis and content generation
- Vite for fast development and production builds

## Deployment

### Prerequisites

1. Supabase account and project
2. OpenAI API key with access to GPT-4o
3. Node.js and npm installed

### Database Setup

Set up the following tables in your Supabase project:
- `carousel_ad_assets` - For storing generated creative text content

Run the schema SQL files included in the repository:
```bash
supabase db push supabase_ad_assets_schema.sql
```

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
   npm run deploy:edge-functions
   ```

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

3. The app will be available at https://brilliant-dango-9f68cc.netlify.app/

## How It Works

1. Upload images for your carousel
2. The application sends the images to OpenAI's GPT-4o through Supabase Edge Functions
3. AI analyzes the images and generates relevant hooks, headlines, and scripts
4. Choose from multiple content variations and customize as needed
5. Use the generated content with your carousel images on social media platforms

## License

MIT
