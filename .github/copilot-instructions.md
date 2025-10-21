# Copilot Instructions for Rproject

## Overview
This project, `Rproject`, is a web application with a client-server architecture. It uses modern web development tools and frameworks, including React, TypeScript, TailwindCSS, and Vite. The project is structured to support modular development, with clear separation of concerns between components, hooks, libraries, and pages.

## Key Directories
- **`client/`**: Contains the frontend code, including React components, hooks, and pages.
  - `components/`: Reusable UI and functional components.
  - `hooks/`: Custom React hooks for shared logic.
  - `lib/`: Utility functions and libraries.
  - `pages/`: Top-level pages for routing.
- **`server/`**: Backend code, including API routes and services.
- **`shared/`**: Shared resources like schemas.
- **`attached_assets/`**: Static assets like images.

## Developer Workflows
### Build and Run
- Install dependencies: `npm install`
- Start the development server: `npm run dev`
- Build for production: `npm run build`
- Preview the production build: `npm run preview`

### Testing
- Add testing instructions here if applicable.

### Debugging
- Use the browser developer tools for frontend debugging.
- Add backend debugging instructions here if applicable.

## Project-Specific Conventions
- **Component Structure**: Components are organized by functionality. For example, `dashboard-navigation.tsx` handles navigation within dashboards.
- **Styling**: TailwindCSS is used for styling. Utility classes are preferred over custom CSS.
- **State Management**: React's Context API or custom hooks are used for state management.
- **API Integration**: API calls are managed in the `server/` directory or through utility functions in `lib/`.

## Integration Points
- **External Dependencies**:
  - Google Sheets API: Managed in `server/services/google-sheets.ts`.
  - Authentication: Utilities in `lib/authUtils.ts`.
- **Cross-Component Communication**: Use props, context, or hooks to share data between components.

## Examples
- **Reusable Component**: `client/src/components/ui/button.tsx` demonstrates how to create a styled, reusable button component.
- **Custom Hook**: `client/src/hooks/use-toast.ts` shows how to encapsulate toast notification logic.
- **Page Example**: `client/src/pages/dashboard.tsx` illustrates how to structure a top-level page.

## Notes
- Follow the existing patterns and conventions to maintain consistency.
- Refer to the `README.md` for additional context (currently minimal).

---

Feel free to update this file as the project evolves.