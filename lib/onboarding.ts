export const GRADE_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Other"] as const;

export const REFERRAL_OPTIONS = ["Reddit", "Discord", "Friend", "Instagram", "Other"] as const;

export const HOSA_EVENT_OPTIONS = [
  "Medical Terminology",
  "Medical Spelling",
  "Respiratory Therapy",
  "Anatomy & Physiology",
  "Health Informatics",
  "Other",
] as const;

export const EXPERIENCE_LEVEL_OPTIONS = ["First year", "Returning competitor", "ILC qualifier"] as const;

export const GOAL_OPTIONS = ["Just exploring", "Make SLC", "Make ILC"] as const;

export const QUESTION_SESSION_OPTIONS = ["10", "25", "50", "100", "Infinite"] as const;

export const MISSED_QUESTION_HANDLING_OPTIONS = ["Focused Redemption Round", "Spaced Reinforcement"] as const;

export const HOSA_CHARTER_ORGANIZATIONS = [
  "Alabama",
  "Alaska",
  "American Samoa",
  "Arizona",
  "Arkansas",
  "California",
  "Canada",
  "China",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Korea",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Mexico",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Puerto Rico",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
] as const;

export interface OnboardingData {
  grade: string;
  referralSource: string;
  hosaEvents: string[];
  hosaEventsOther?: string;
  experienceLevel: string;
  goal: string;
  charterOrganization: string;
  questionsPerSession: string;
  missedQuestionHandling: string;
  onboardingCompleted: boolean;
}
