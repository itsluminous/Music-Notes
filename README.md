# Music Notes App

[![CI](https://github.com/itsluminous/Music-Notes/actions/workflows/ci.yml/badge.svg)](https://github.com/itsluminous/Music-Notes/actions/workflows/ci.yml)
[![CD](https://vercelbadge.vercel.app/api/itsluminous/Music-Notes)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

A modern, responsive web application for creating, organizing, and managing music notes, chords, tabs, and lyrics. Built with Next.js, TypeScript, and Supabase.

**Public Access**: Anyone can view and search all notes without logging in. Creating and editing notes requires signed in user with approval from the admin.

## ✨ Features

### 🌐 Public Access Model
- **View Without Login**: Browse all music notes without creating an account
- **Search & Filter**: Full search and tag filtering available to anonymous visitors
- **Collaborative Platform**: Approved users can contribute notes to the shared collection
- **Author Attribution**: All notes display their author for proper credit

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
- **Smart Caching**: Local storage caching with 30-day TTL for instant load times
- **Background Refresh**: Automatic incremental updates without blocking the UI

### 🔐 Authentication & User Management
- **Secure Login**: Supabase-powered authentication
- **User Approval Workflow**: New users require admin approval before contributing
- **Role-Based Access**: Admin, approved, pending, and rejected user roles
- **First User Admin**: The first person to sign up automatically becomes the admin
- **Password Management**: Update password functionality
- **Session Management**: Automatic login/logout handling

### 👥 Admin Capabilities
- **User Management**: View all users and their approval status
- **Approve/Reject Users**: Control who can create and edit notes
- **Pending User Queue**: See all users awaiting approval with email and signup date
- **Admin Dashboard**: Dedicated interface for managing the platform
- **Cache Management**: View cache statistics and manually clear cache for troubleshooting

### 🎵 Music-specific Features
- **Chord Highlighting**: Automatic highlighting of chord notations in content
- **Chord Transposition**: Transpose chords up or down by semitones with automatic capo detection
- **Autoscroll**: Automatic scrolling with customizable speed for hands-free playing
- **Artist & Album Management**: Autocomplete for artists and albums
- **Music Metadata**: Store technical details like tuning, capo position, etc.

### 💾 Import/Export
- **Export Notes**: Download all your notes as a JSON file with complete metadata
- **Import Notes**: Restore or migrate notes from exported files
- **Full Data Preservation**: Exports include title, content, artist, album, tags, author, and timestamps
- **Tag Matching**: Import automatically matches or creates tags by name
- **Backup & Migration**: Perfect for backing up your collection or moving between instances

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
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
NEXT_PUBLIC_CACHE_TTL_DAYS=30
```

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_CACHE_TTL_DAYS`: (Optional) Number of days to cache authentication state & notes in browser localStorage. Default: 30 days. The cache automatically refreshes on each app visit, so active users won't be logged out. The notes cache automatically refreshes with incremental updates on each app visit.

### 4. Database Setup
Set up your Supabase database with the [sql script](DB_Setup.sql).

### 5. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## 📱 Usage

### For Anonymous Visitors
1. **Browse Notes**: Visit the app to view all notes without logging in
2. **Search & Filter**: Use the search bar and tag filters to find specific content
3. **View Full Notes**: Click any note card to see complete details
4. **Sign Up to Contribute**: Click the create button to be redirected to sign up

### User Approval Workflow
1. **Sign Up**: Create an account with email verification
2. **Pending Status**: After signup, you'll be in "pending" status
3. **Wait for Approval**: The admin will review and approve your account
4. **Start Contributing**: Once approved, you can create and edit notes
5. **Automatic Attribution**: Your contributions are automatically attributed to you

### For the First User (Admin)
1. **Automatic Admin**: The first person to sign up becomes the admin automatically
2. **Access User Management**: Click your profile menu and select "Manage Users"
3. **Review Pending Users**: See all users awaiting approval with their email and signup date
4. **Approve or Reject**: Click approve to grant access or reject to deny
5. **Full Permissions**: Create, edit, and delete notes like any approved user
6. **Cache Management**: Access "Cache Info" in your profile menu to view cache statistics and clear cache if needed

### Creating Notes (Approved Users)
1. Click the **+** button in the bottom-right corner
2. Fill in the note details:
   - **Title**: Name of the song/piece
   - **Content**: Chords, lyrics, tabs, or notes
   - **Artist**: Performing artist (with autocomplete)
   - **Album**: Album name (with autocomplete)
   - **Tags**: Organize with custom tags
   - **Metadata**: Technical details (tuning, capo, etc.)
   - **References**: External links
3. Your user ID is automatically recorded as the author

### Searching & Filtering
- **Search Bar**: Type to search across all note content
- **Tag Filters**: Use the sidebar to filter by tags
- **Special Filters**: Filter by pinned or untagged notes
- **Clear Filters**: Click "Clear All" when filters are active

### Managing Notes
- **View**: Click any note card to view full content (available to everyone)
- **Edit**: Click edit button in note view (approved users only)
- **Pin**: Use the pin button to mark important notes
- **Delete**: Remove notes from the note view dialog (approved users only)
- **Transpose**: Use +/- buttons to transpose chords up or down by semitones
- **Autoscroll**: Enable automatic scrolling with speed control for hands-free playing
- **Author Info**: See who created or last edited each note

### Importing & Exporting Notes

#### Exporting Your Notes
1. Click your profile menu in the top-right corner
2. Select "Export Notes"
3. A JSON file will download containing all notes with complete metadata
4. The export includes: title, content, artist, album, release year, metadata, references, tags, author, and timestamps

#### Importing Notes
1. Click your profile menu in the top-right corner
2. Select "Import Notes"
3. Choose a previously exported JSON file
4. The system will:
   - Validate the file structure
   - Create or match tags by name
   - Create notes with you as the author
   - Preserve original timestamps
   - Show success or error messages

**Note**: Import requires approved user status. Invalid files will be rejected without creating partial data.

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run all tests (unit, property-based, integration, and e2e)
- `npm run test:watch` - Run tests in watch mode for development

## 🧪 Testing

The application includes a comprehensive test suite to ensure correctness and reliability:

### Test Types
- **Unit Tests**: Test individual functions and components in isolation
- **Property-Based Tests**: Verify universal properties across many random inputs using fast-check
- **Integration Tests**: Test interactions between multiple components
- **End-to-End Tests**: Validate complete user workflows

### Key Test Coverage
- **Cache Manager**: Cache validity, read/write operations, error handling, TTL validation
- **Merge Logic**: Data merging with overlapping/non-overlapping IDs, edge cases
- **Search Engine**: Search scoring, multi-word queries, year-based search
- **UI Components**: Accessibility, user interactions, form validation
- **Data Hooks**: Data fetching, caching integration, error recovery

### Running Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Property-Based Testing
The caching system uses property-based testing to verify correctness properties:
- **Cache Freshness**: Validates 30-day TTL across random timestamps
- **Merge Preserves Identity**: Ensures no duplicate notes after merging
- **Merge Preserves All Notes**: Verifies all unique notes are retained
- **Round-Trip Consistency**: Confirms data integrity after cache write/read
- **Error Recovery**: Tests graceful degradation under various failure conditions

Each property test runs 100+ iterations with randomly generated inputs to catch edge cases.

## 🎯 Key Features in Detail

### Local Storage Caching
The application implements an intelligent caching system to dramatically improve load times and user experience:

#### How It Works
- **First Visit**: Data is fetched from the database and cached in browser localStorage
- **Subsequent Visits**: Cached data loads instantly (< 100ms) while fresh data is fetched in the background
- **Incremental Updates**: Only changed records are fetched, reducing network traffic and server load
- **Smart Merging**: New and updated records are automatically merged with cached data
- **30-Day TTL**: Cache expires after 30 days, ensuring data freshness

#### Benefits
- **Instant Load Times**: See your notes immediately without waiting for network requests
- **Reduced Server Load**: Incremental fetches minimize database queries
- **Offline-Ready**: View cached notes even with poor connectivity
- **Seamless Updates**: Background refresh keeps data current without interrupting your workflow
- **Visual Feedback**: Subtle indicator shows when data is being refreshed

#### Cache Management (Admin Only)
Admins have access to cache management tools in their profile menu:
- **Cache Statistics**: View cache age, size, and record count
- **Manual Clear**: Clear cache for troubleshooting or testing
- **Debug Logging**: Enable detailed cache operation logs via `DEBUG_LOG=true` environment variable

#### Technical Details
- **Storage**: Browser localStorage (typically 5-10MB limit)
- **Cache Size**: ~2KB per note, comfortably fits 1000+ notes
- **Error Handling**: Graceful fallback to full fetch if cache is corrupted or unavailable
- **Privacy**: Only public note data is cached, no sensitive information

### Access Control & Security
The application uses Row Level Security (RLS) policies in PostgreSQL:
- **Public Read Access**: Anyone can SELECT from the notes table
- **Restricted Writes**: Only users with 'admin' or 'approved' role can INSERT, UPDATE, or DELETE
- **User Profiles**: Separate table tracks user roles and approval status
- **Automatic Attribution**: Database triggers ensure author field is set correctly
- **First User Logic**: Database function automatically assigns admin role to first user

### User Roles
- **Admin**: First user to sign up. Can manage users and has full note permissions
- **Approved**: Users approved by admin. Can create, edit, and delete notes
- **Pending**: New users awaiting approval. Can view notes but not edit
- **Rejected**: Users denied access by admin

### Smart Search Algorithm
The search functionality uses a sophisticated scoring system:
- **Exact title matches**: Highest priority (100 points)
- **Exact content/metadata matches**: High priority (50 points)
- **Partial matches**: Weighted by field importance
- **Multi-word support**: All terms must be present
- **Year-only search**: Special handling for 4-digit years
- **Available to All**: Anonymous visitors can use full search functionality

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
- **Import/Export**: Full backup and restore capabilities
- **Authentication cache**: User authentication state is cached in browser localStorage for improved performance. The cache expires after 30 days (configurable via `NEXT_PUBLIC_CACHE_TTL_DAYS`) but automatically refreshes on each app visit. This prevents unnecessary loading states when switching tabs or during hot reloads in development.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

Built with ❤️ for musicians and music enthusiasts.

