# Supabase Edge Functions for Carousel Generator

This directory contains Edge Functions for the Carousel Generation application.

## Prerequisites

1. [Supabase CLI](https://supabase.com/docs/guides/cli)
2. [Deno](https://deno.land/manual/getting_started/installation)
3. Supabase project with the following tables:
   - `jobs` - For tracking job status and progress
   - `carousel_prompts` - For storing generated prompts
   - `carousel_images` - For storing generated images

## Image Generation

This function uses GPT-image-1 to generate images based on prompts created by GPT-4o. GPT-image-1 is OpenAI's image generation model that is optimized for high-quality visuals.

## Setup

1. Set up your Supabase project and link it to your local development environment:

```bash
supabase login
supabase link --project-ref your-project-ref
```

2. Set the required environment variables in your Supabase project:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

## Deployment

Deploy the Edge Functions to your Supabase project:

```bash
supabase functions deploy generate-images --no-verify-jwt
```

## Database Schema

Here's the recommended schema for the database tables:

```sql
-- Jobs table for tracking generation jobs
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  image_urls TEXT[],
  prompts JSONB,
  data_type TEXT NOT NULL CHECK (data_type IN ('csv', 'script')),
  data_content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompts table for storing generated prompts
CREATE TABLE carousel_prompts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  data_variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Images table for storing generated images
CREATE TABLE carousel_images (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL REFERENCES carousel_prompts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage

The Edge Function can be invoked from your application with the following parameters:

```typescript
const { data, error } = await supabase.functions.invoke('generate-images', {
  body: {
    jobId: "job-123",            // Unique job ID
    templateId: "template-456",  // Template ID
    templateName: "Product Showcase", // Template name
    templateDescription: "Product descriptions with key features", // Optional description
    numVariants: 5,              // Number of variants to generate
    dataType: "csv",             // Data source type: "csv" or "script"
    dataContent: [               // Optional data content for variables
      { "title": "Product A", "feature": "Feature 1" },
      { "title": "Product B", "feature": "Feature 2" }
    ]
  }
});
```

## Local Development

To run the Edge Function locally for development and testing:

```bash
supabase start
supabase functions serve --env-file .env.local
```

You'll need a `.env.local` file with the following variables:

```
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
``` 