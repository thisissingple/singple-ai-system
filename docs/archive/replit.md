# Overview

Oh Sheet is a modern backend management system that combines Google Sheets synchronization with user management. The application allows users to connect to Google Sheets, import data, and view it in a responsive table interface with live updates via WebSocket connections. The system focuses on user management for staff roles (teachers, telemarketers, consultants) with role-based permissions and secure authentication. Built as a full-stack TypeScript application with React frontend and Express backend.

# Recent Changes

## September 25, 2025
- **Member Management Removal**: Completely removed member management functionality to focus exclusively on staff user management
- **System Simplification**: Streamlined navigation to show only Google Sheets, Data Dashboard, and User Management
- **API Consolidation**: Unified user update endpoint to prevent partial update states and ensure data consistency
- **Enhanced Validation**: Implemented comprehensive form validation with specific enums for roles, statuses, and departments

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Real-time Updates**: Custom WebSocket hook for live data synchronization
- **Build Tool**: Vite with React plugin and development tooling

## Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **Development**: tsx for TypeScript execution in development
- **Production**: esbuild for bundling and compilation
- **API Design**: RESTful endpoints with WebSocket support for real-time features
- **Error Handling**: Centralized error middleware with status code mapping

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema definition
- **Connection**: Neon Database serverless PostgreSQL
- **In-Memory Fallback**: MemStorage class for development/testing scenarios
- **Data Models**: Spreadsheets table for metadata, sheet_data table for row content

## Authentication and Authorization
- **Session Management**: PostgreSQL-backed session storage using connect-pg-simple
- **Security**: Standard Express security practices with session-based auth

## External Service Integrations
- **Google Sheets API**: Service account authentication with googleapis library
- **Real-time Sync**: WebSocket server for broadcasting data updates to connected clients
- **Development Tools**: Replit-specific plugins for enhanced development experience

## Key Design Patterns
- **Monorepo Structure**: Shared schema definitions between client and server in `/shared`
- **Type Safety**: End-to-end TypeScript with Zod for runtime validation
- **Component Architecture**: Atomic design with reusable UI components
- **Real-time Updates**: WebSocket message broadcasting for live data synchronization
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Error Boundaries**: Graceful error handling with user-friendly messages

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations and migrations

## Google Services  
- **Google Sheets API**: Read access to spreadsheet data
- **Google Cloud Service Account**: Authentication for API access

## UI and Styling
- **Shadcn/ui**: Pre-built accessible React components
- **Radix UI**: Headless component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Development and Build Tools
- **Vite**: Frontend build tool and development server
- **esbuild**: Fast JavaScript/TypeScript bundler for production
- **TypeScript**: Static type checking
- **Replit Plugins**: Development environment enhancements

## Runtime Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **date-fns**: Date manipulation utilities
- **WebSocket (ws)**: Real-time bidirectional communication