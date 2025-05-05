
# Carousel Gen Web

A web application for generating carousel images at scale using templates and data sources.

## Features

- Upload and manage design templates (PNG/SVG + YAML config)
- Generate carousel images from templates using CSV data or custom scripts
- Monitor job status with real-time updates
- Download generated carousel packages

## Technology Stack

- Vite + React + TypeScript
- TailwindCSS for styling
- shadcn/ui for UI components
- Supabase for authentication, database, and serverless functions
- React Router for navigation
- React Query for data fetching and caching

## Getting Started

### Prerequisites

Make sure you have the following installed:
- Node.js (v16+)
- pnpm (v7+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/carousel-gen-web.git
   cd carousel-gen-web
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at http://localhost:8080.

### Building for Production

Build the application:
```bash
pnpm build
```

Preview the production build:
```bash
pnpm preview
```

## Supabase Setup

1. Create a Supabase project
2. Set up the following tables:
   - `templates`: For storing template information
   - `jobs`: For tracking generation jobs
3. Deploy the Edge Function in `/examples/edge-function-jobs.ts` to your Supabase project

## Project Structure

```
/src
  /components       # UI components and shadcn wrappers
  /hooks            # Custom React hooks
  /lib              # Utility functions
  /pages            # Page components
    /Dashboard      # Dashboard page components
    /Templates      # Template management components
    /Jobs           # Job monitoring components
    /Generate       # Wizard for creating jobs
  /supabase         # Supabase client and auth provider
  /routes           # Route definitions
```

## License

This project is licensed under the MIT License.
