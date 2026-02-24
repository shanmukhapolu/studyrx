# StudyRx - HOSA Prep Platform

A modern, frontend-only practice platform for HOSA competitive events with intelligent session tracking, detailed analytics, and event-specific performance insights.

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 16
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **Storage**: LocalStorage 
- **State Management**: React hooks + localStorage

## File Structure

\`\`\`
/
├── app/
│   ├── page.tsx                 # Public homepage
│   ├── auth/page.tsx            # Password authentication page
│   ├── dashboard/page.tsx       # Main dashboard with stats overview
│   ├── practice/page.tsx        # Practice session with timed questions
│   ├── analytics/page.tsx       # Detailed performance analytics
│   ├── layout.tsx               # Root layout with metadata
│   └── globals.css              # Global styles and theme tokens
│
├── components/
│   ├── app-sidebar.tsx          # Persistent sidebar navigation
│   ├── auth-guard.tsx           # Client-side auth protection
│   └── ui/*                     # shadcn/ui components
│
├── lib/
│   ├── storage.ts               # localStorage utilities and interfaces
│   └── utils.ts                 # Utility functions (cn, etc.)
│
└── public/
    └── questions.json           # Question bank
\`\`\`

## Key Features

### 1. Homepage (/)
- Public-facing landing page with no authentication
- Explains StudyRx and HOSA competitive events platform
- Sections: Hero, What is StudyRx, How It Helps, Analytics Preview, CTA
- Responsive design with animated elements

### 2. Authentication (/auth)
- Simple password auth
- No user accounts or sign-up required
- Stores auth state in localStorage
- Auto-redirects authenticated users to dashboard

### 3. Dashboard (/dashboard)
- Protected route (requires authentication)
- Overview statistics: total attempts, accuracy, avg time, sessions
- Best performing event highlights
- Study resources and tips
- Sidebar navigation (Dashboard, Events, Analytics, Logout)

### 4. Events Page (/events)
- Grid layout with cards for each HOSA competitive event
- Each card shows: event name, description, icon, progress
- "Practice Now" button navigates to event-specific practice
- Track which events have been practiced

### 5. Practice Session (/practice/[event])
- Dynamic page that loads questions based on event parameter
- Event-specific question banks (separate JSON files)
- Real-time timer tracking per question
- Immediate feedback on answer selection
- Session statistics (correct/incorrect count)
- Back button to return to events page
- Data only saved after "End Session" click

### 6. Analytics (/analytics)
- Comprehensive performance insights with tabbed interface
- General tab: overall stats across all events
- Event-specific tabs: detailed stats for each practiced event
- Only shows tabs for events with at least one answered question
- Per-event accuracy, timing, and performance metrics
- Ability to reset all statistics

## Data Structure

### Question Format (questions.json)
\`\`\`json
{
  "id": 1,
  "question": "Question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option B",
  "category": "Cell Biology | Human Physiology | Other",
  "difficulty": "Easy | Medium | Hard"
}
\`\`\`

### Session Data
\`\`\`typescript
{
  sessionId: string;
  attempts: QuestionAttempt[];
  startTime: string (ISO);
  endTime?: string (ISO);
}
\`\`\`

### Question Attempt
\`\`\`typescript
{
  questionId: number;
  category: string;
  correct: boolean;
  timeSpent: number (seconds);
  timestamp: string (ISO);
}
\`\`\`

## Editing Questions

To add or modify questions, edit `/public/questions.json`:

1. Open `/public/questions.json`
2. Add/edit question objects following the format above
3. Ensure categories are one of: "Cell Biology", "Human Physiology", "Other"
4. Ensure difficulty is one of: "Easy", "Medium", "Hard"
5. Save the file - changes take effect on next page load

## Configuration

### Change Password
Edit `/app/auth/page.tsx`:
\`\`\`typescript
const PASSWORD = "your_new_password";
\`\`\`

### Exam Timing
The platform calculates based on USMDO standards:
- 160 questions in 120 minutes = 45 seconds per question
- Timer is tracked per question in practice sessions

### Categories
Three predefined categories (defined in `/lib/storage.ts`):
1. Cell Biology
2. Human Physiology
3. Other

To add/change categories, update the Question interface in `/lib/storage.ts`.

## User Flow

1. **First Visit**: User lands on homepage → Clicks "Get Started" → Auth page
2. **Authentication**: Enters password → Redirected to dashboard
3. **Dashboard**: Views stats (if any) → Clicks "Start Practice"
4. **Practice**: Answers questions → Sees immediate feedback → Ends session
5. **Analytics**: Views detailed performance insights → Identifies weak areas
6. **Repeat**: Returns to practice to improve

## Browser Warning System

The platform warns users if they try to:
- Close the browser tab during practice
- Refresh the page during practice
- Navigate away without ending session

Warning message: "Session not ended. Progress will not be saved."

## Performance Insights

The analytics system automatically provides:
- **Accuracy Insights**: Highlights excellent performance (>80%)
- **Timing Insights**: Warns if average time exceeds 45s target
- **Practice Recommendations**: Encourages more questions for better insights
- **Category Comparison**: Identifies strongest and weakest topics

## Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Sidebar collapses on mobile
- Touch-friendly button sizes
- Optimized typography for all screen sizes

## Accessibility

- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader friendly
- High contrast color ratios
- Focus indicators

## Legal Disclaimer

Footer on all pages:
"This platform is for educational practice only and is not affiliated with or endorsed by USMDO."

## Future Enhancements (Optional)

- Add more questions to question bank
- Implement category filtering in practice
- Add difficulty level selection
- Export performance data as PDF/CSV
- Add streak tracking and achievements
- Implement spaced repetition algorithm
- Add flashcard mode for quick review

---

Built with ❤️ for students preparing for USMDO

## Role-Based Access Control (RBAC)

StudyRx now stores a role per user in Firebase Firestore:

- `users/{uid}/name`
- `users/{uid}/role` where role is `"user"` or `"admin"`

### Runtime behavior

- New signups are always created with role `"user"`.
- Auth bootstrap loads profile + role and keeps it in auth context.
- `/admin/*` is protected in two places:
  - Client-side via `AdminGuard`
  - Server-side via `middleware.ts` role checks
- `/api/admin/*` endpoints require admin role on the server.

### Promoting existing users

#### Option A: Admin Backoffice UI

1. Sign in as an existing admin user.
2. Go to `/admin`.
3. Go to **Users** in the admin sidebar (`/admin/users`).
4. Enter the target Firebase Auth UID and click **Promote to admin**.

#### Option B: One-time script

```bash
FIREBASE_ADMIN_ID_TOKEN=<admin_user_id_token> TARGET_UID=<uid_to_promote> npm run promote:admin
```

This writes `users/{TARGET_UID}/role = "admin"` via Firebase Firestore REST.

### Recommended Firestore rules

Use `firestore.rules` to ensure role changes are server/admin controlled, then deploy:

```bash
firebase deploy --only firestore:rules
```


### Admin navigation

Admin sidebar for role `"admin"` uses dedicated navigation:

- Users (`/admin/users`)
- Questions (`/admin/questions`)
- Site Analytics (`/admin/site-analytics`)

## Question Bank in Firestore

Questions now live in Firebase Firestore at `questions/{questionId}` with this shape:

- `question`
- `options` (array of 4)
- `correctAnswerIndex`
- `explanation`
- `eventId`
- `category`
- `difficulty`
- `tags`
- `searchText`
- `createdAt`, `updatedAt`

### Admin CRUD

`/admin/questions` includes create, edit, delete, pagination, indexed filters (event/difficulty/category), and full-text search using `searchText`.

### Practice question source

Practice pages now load from Firestore filtered by `eventId` instead of JSON files.

### Migration tooling

To seed Firestore from `public/questions/*.json`:

```bash
FIREBASE_ADMIN_ID_TOKEN=<admin_user_id_token> npm run import:questions
```


## Admin site analytics architecture

- Admin metrics are fetched server-side from a privileged endpoint: `GET /api/admin/site-analytics`.
- The endpoint computes platform-wide aggregates (users, questions, usage, accuracy) across all users and events.
- To reduce cost at scale, computed results are materialized in `adminAggregates/siteAnalytics` and reused for 15 minutes unless `?refresh=1` is passed.
- Personal `/analytics` remains user-scoped and is intentionally not mixed with admin metrics.


## Firestore migration notes

- Realtime Database is removed from app data paths; app data now uses Firestore collections/documents only.
- Key collections: `users`, `questions`, `adminAggregates`, `deletedUsers`.
- User sessions are stored under `users/{uid}/events/{eventId}/sessions/{sessionId}`.
- Copy `firestore.rules` into Firebase console rules editor (or deploy with CLI).


### Account bootstrap

- On sign up/sign in, the app ensures `users/{uid}` exists in Firestore.
- Basic fields are always written/maintained: `email`, `role`, `createdAt`, `lastLoginAt`, `loginCount`, `totalPracticeSeconds`, plus name fields.
