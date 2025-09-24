# Music Notes App

A modern, responsive web application for creating, organizing, and managing music notes, chords, tabs, and lyrics. Built with Next.js, TypeScript, and Supabase.

## ✨ Features

### 📝 Note Management
- **Create & Edit Notes**: Rich text editor for music notes, chords, tabs, and lyrics
- **Metadata Support**: Add artist, album, release year, and custom metadata
- **Pin Important Notes**: Pin frequently used notes for quick access
- **References**: Add external links and references to your notes

### 🔍 Advanced Search & Filtering
- **Smart Search**: Search across titles, content, artists, albums, and metadata
- **Year-based Search**: Search by specific release years (e.g., "1999")
- **Multi-word Search**: Find notes containing all search terms
- **Relevance Scoring**: Results ranked by relevance with exact matches prioritized

### 🏷️ Tag System
- **Flexible Tagging**: Organize notes with custom tags
- **Multi-tag Filtering**: Filter by multiple tags simultaneously
- **Special Filters**: 
  - View pinned notes only
  - Show untagged notes
  - Clear all filters with one click

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme switching based on system preference
- **Modern Interface**: Clean, card-based layout
- **Collapsible Sidebar**: Efficient use of screen space
- **Real-time Updates**: Instant search and filter results

### 🔐 Authentication
- **Secure Login**: Supabase-powered authentication
- **Password Management**: Update password functionality
- **Session Management**: Automatic login/logout handling

### 🎵 Music-specific Features
- **Chord Highlighting**: Automatic highlighting of chord notations in content
- **Chord Transposition**: Transpose chords up or down by semitones with automatic capo detection
- **Autoscroll**: Automatic scrolling with customizable speed for hands-free playing
- **Artist & Album Management**: Autocomplete for artists and albums
- **Music Metadata**: Store technical details like tuning, capo position, etc.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL database, Authentication)
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **State Management**: React hooks and context

## 📋 Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account and project

## 🚀 Local Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Music-Notes
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Set up your Supabase database with the [sql script](DB_Setup.sql).

### 5. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## 📱 Usage

### Creating Notes
1. Click the **+** button in the bottom-right corner
2. Fill in the note details:
   - **Title**: Name of the song/piece
   - **Content**: Chords, lyrics, tabs, or notes
   - **Artist**: Song artist (with autocomplete)
   - **Album**: Album name (with autocomplete)
   - **Tags**: Organize with custom tags
   - **Metadata**: Technical details (tuning, capo, etc.)
   - **References**: External links

### Searching & Filtering
- **Search Bar**: Type to search across all note content
- **Tag Filters**: Use the sidebar to filter by tags
- **Special Filters**: Filter by pinned or untagged notes
- **Clear Filters**: Click "Clear All" when filters are active

### Managing Notes
- **View**: Click any note card to view full content
- **Edit**: Click edit button in note view
- **Pin**: Use the pin button to mark important notes
- **Delete**: Remove notes from the note view dialog
- **Transpose**: Use +/- buttons to transpose chords up or down by semitones
- **Autoscroll**: Enable automatic scrolling with speed control for hands-free playing

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## 🎯 Key Features in Detail

### Smart Search Algorithm
The search functionality uses a sophisticated scoring system:
- **Exact title matches**: Highest priority (100 points)
- **Exact content/metadata matches**: High priority (50 points)
- **Partial matches**: Weighted by field importance
- **Multi-word support**: All terms must be present
- **Year-only search**: Special handling for 4-digit years

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Adaptive Layout**: Sidebar collapses on mobile
- **Touch-friendly**: Large touch targets and gestures
- **Performance**: Optimized bundle size and loading

### Data Management
- **Real-time sync**: Changes reflected immediately
- **Optimistic updates**: UI updates before server confirmation
- **Error handling**: Graceful error recovery
- **Data validation**: Client and server-side validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

Built with ❤️ for musicians and music enthusiasts.

