# BayClock ⏰

A modern, feature-rich time tracking application built with React, Vite, and Supabase. BayClock helps individuals and teams track their productivity with beautiful visualizations, project management, and comprehensive analytics.

Hosted at: https://bayclock.netlify.app/

## ✨ Features

### 🕐 **Accurate Time Tracking**
- Real-time timer with start, pause, and stop functionality
- Manual time entry with start/end times or duration
- Persistent timers that survive page refreshes
- Resume previous tasks with one click

### 📁 **Project & Task Management**
- Organize work by projects and tasks
- Project status tracking (Active, Completed, On Hold, Archived)
- Client assignment and workspace management
- Archive and restore deleted projects

### 📊 **Insightful Analytics**
- Beautiful charts and visualizations with Chart.js
- Weekly and monthly productivity summaries
- Project-based time breakdowns
- Goal tracking with progress indicators

### 🌙 **Light & Dark Mode**
- Seamless theme switching
- Glassmorphism UI design
- Responsive design for all screen sizes
- Theme persistence across sessions

### ☁️ **Cloud Sync**
- Real-time data synchronization with Supabase
- Secure authentication and user management
- Multi-workspace support for teams
- Role-based access control (User/Admin)

### 📅 **Advanced Views**
- **Calendar View**: Visual timeline of all activities
- **Timesheet View**: Weekly grid-based time entry
- **Dashboard**: Comprehensive overview with widgets
- **Analytics**: Detailed productivity insights

### 🏆 **Achievements & Milestones**
- Track total hours and streaks
- Unlock achievements based on productivity
- Visual progress indicators
- Motivational feedback system

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bayclock.git
   cd bayclock
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Material-UI** - Component library
- **Styled Components** - CSS-in-JS styling
- **Framer Motion** - Smooth animations
- **React Spring** - Physics-based animations
- **Chart.js** - Data visualization
- **React Router** - Client-side routing

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security** - Data protection
- **Real-time subscriptions** - Live updates

### Additional Libraries
- **date-fns** - Date manipulation
- **React Hook Form** - Form management
- **React Icons** - Icon components
- **TypeAnimation** - Text animations
- **file-saver & xlsx** - Data export functionality

## 📱 Pages & Features

### 🏠 **Landing Page**
- Animated hero section with glassmorphism design
- Feature showcase with interactive cards
- Responsive design with mobile optimization

### 🔐 **Authentication**
- Secure login/signup with animated cards
- Password reset functionality
- Profile management with name prompts

### 📊 **Dashboard**
- Real-time productivity overview
- Quick stats and recent activities
- Achievement progress tracking
- Weekly goal monitoring

### ⏱️ **Time Tracker**
- Active timer with live updates
- Project and task selection
- Manual time entry options
- Recent entries with edit/delete actions

### 📁 **Projects**
- Project CRUD operations (Admin only)
- Client and status management
- Workspace organization
- Search and filter capabilities

### 📅 **Calendar**
- Weekly and monthly views
- Color-coded project entries
- Compact and detailed viewing modes
- Statistics and filtering options

### 📋 **Timesheet**
- Weekly grid-based time entry
- Project filtering and color coding
- Goal tracking with progress bars
- Bulk time entry capabilities

### 👥 **Admin Panel** (Admin Only)
- User management and role assignment
- Workspace administration
- System-wide analytics
- Data export capabilities

## 🎨 Design System

### Theme Colors
- **Primary**: `#fb923c` (Orange)
- **Secondary**: `#3b82f6` (Blue)
- **Success**: `#22c55e` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Dark Background**: `#18181b`
- **Light Background**: `#f3f4f6`

### Components
- **GlassCard**: Reusable glassmorphism container
- **EntryCard**: Time entry display with animations
- **Theme utilities**: Consistent color and styling functions

## 📂 Project Structure

```
BayClock/
├── public/                 # Static assets
│   ├── Background.png      # Landing page background
│   └── Header.png          # Logo and branding
├── src/
│   ├── components/         # Reusable components
│   │   ├── EntryCard.jsx   # Time entry display
│   │   ├── Theme.jsx       # Theme utilities
│   │   ├── Navbar.jsx      # Navigation
│   │   └── Settings.jsx    # User settings
│   ├── pages/              # Main application pages
│   │   ├── Dashboard.jsx   # Overview dashboard
│   │   ├── TimeTracker.jsx # Time tracking interface
│   │   ├── Projects.jsx    # Project management
│   │   ├── Calendar.jsx    # Calendar view
│   │   ├── Timesheet.jsx   # Grid-based entry
│   │   └── Admin/          # Admin-only pages
│   ├── App.jsx             # Main application component
│   └── supabaseClient.js   # Database configuration
└── package.json
```

## 🔐 Database Schema

### Core Tables
- **profiles** - User information and roles
- **workspaces** - Organization/team workspaces
- **projects** - Project definitions and metadata
- **entries** - Time tracking records

### Authentication
- Supabase Auth for user management
- Row Level Security (RLS) for data protection
- Role-based access control

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify/Vercel
1. Connect your repository
2. Set environment variables
3. Deploy with build command: `npm run build`
4. Set publish directory: `dist`

## 🙏 Acknowledgments

- Bay Valley Tech for project inspiration
- Supabase for the excellent backend platform
- The React community for amazing tools and libraries


**BayClock** - Making every second count! ⏰✨
