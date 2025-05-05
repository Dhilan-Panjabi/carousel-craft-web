# Carousel Craft Web

A powerful web application for generating marketing carousel images at scale. Create, customize, and batch-produce social media carousel posts using templates and structured data sources.

## 🎯 Purpose

Carousel Craft is designed to streamline the creation of social media carousel posts by:
- Allowing designers to create reusable templates
- Enabling marketers to generate content variations at scale
- Automating the export process to structured folders
- Supporting data-driven content creation through CSV inputs

## ✨ Features

- **Template Management**: Upload and manage design templates (PNG/SVG + YAML config)
- **Bulk Generation**: Create carousel variants from templates using CSV data or custom scripts
- **Job Monitoring**: Track generation progress with real-time status updates
- **Structured Output**: Export carousels to organized Google Drive folders
- **User Authentication**: Secure access with Supabase auth integration

## 🚀 Technology Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **Backend**: Supabase for authentication, database, and serverless functions
- **Routing**: React Router for navigation
- **State Management**: React Query for data fetching and caching
- **File Processing**: CSV parsing and image manipulation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16+)
- npm, yarn, or pnpm (v7+)
- A Supabase account for backend services
- Google API credentials (for Drive integration)

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/carousel-craft-web.git
   cd carousel-craft-web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or with yarn/pnpm
   yarn install
   pnpm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Update the `.env` file with your credentials**:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_API_KEY=your_google_api_key
   VITE_GOOGLE_DRIVE_FOLDER_ID=your_root_drive_folder_id
   ```

## 🏃‍♂️ Development

Start the development server:
```bash
npm run dev
# or with yarn/pnpm
yarn dev
pnpm dev
```

The app will be available at http://localhost:5173.

## 🛠️ Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Set up database tables**:
   - `templates`: For storing template information and YAML configurations
   - `jobs`: For tracking generation job status and metadata
   - `variants`: For storing individual carousel variant data
3. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy jobs
   ```

## 📝 Usage Guide

### Creating Templates

1. Navigate to the **Templates** page
2. Click "New Template" to create a template
3. Upload your base design assets (PNG/SVG)
4. Configure template variables using the YAML editor
5. Save your template

### Generating Carousels

1. Go to the **Generate** page
2. Select a template
3. Choose your data source:
   - **CSV Upload**: Prepare a CSV with headers matching your template variables
   - **Custom Script**: Write JavaScript to generate dynamic data
4. Set the number of variants to generate
5. Submit the job

### Template YAML Structure

```yaml
name: "Product Showcase"
slides:
  - id: "slide1"
    textFields:
      - name: "headline"
        x: 100
        y: 150
        maxWidth: 500
        fontSize: 36
        color: "#333333"
      - name: "subheading"
        x: 100
        y: 200
        maxWidth: 450
        fontSize: 24
        color: "#666666"
    imageFields:
      - name: "productImage"
        x: 350
        y: 300
        width: 400
        height: 400
```

### CSV Format Example

```csv
headline,subheading,productImage
"Summer Collection","Available now in stores","/images/product1.jpg"
"Winter Essentials","Limited time offer","/images/product2.jpg"
```

## 📁 Project Structure

```
/src
  /components        # UI components and shadcn wrappers
    /ui              # Base UI components from shadcn
    /Auth            # Authentication components
    /AppLayout.tsx   # Main layout component
    /AppSidebar.tsx  # Navigation sidebar
  /hooks             # Custom React hooks
  /lib               # Utility functions
    /csvParse.ts     # CSV parsing functionality
    /downloadZip.ts  # File download utilities
  /pages             # Page components
    /Dashboard       # Dashboard page components
    /Templates       # Template management components
    /Jobs            # Job monitoring components
    /Generate        # Wizard for creating jobs
    /Account         # User account settings
  /supabase          # Supabase client and auth provider
  /integrations      # External service integrations
```

## ✅ Success Criteria

The project aims to achieve the following goals:

- ✅ System accepts multiple variants of input images and text
- ✅ Generates at least 10 distinct carousel variants
- ✅ Creates structured Google Drive folder output
- ✅ Code is modular and reusable for future batch generations
- ✅ README includes clear setup and usage instructions

## 📄 License

This project is licensed under the MIT License.
