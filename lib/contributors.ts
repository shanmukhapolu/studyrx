export type ContributorRecord = {
  name: string;
  eventId: string;
  eventName: string;
  questionsContributed: number;
  note?: string;
};

export const CONTRIBUTORS: ContributorRecord[] = [
  {
    name: "Aarav Patel",
    eventId: "medical-terminology",
    eventName: "Medical Terminology",
    questionsContributed: 128,
    note: "Built high-yield root-word and suffix sets.",
  },
  {
    name: "Mia Nguyen",
    eventId: "anatomy-and-physiology",
    eventName: "Anatomy & Physiology",
    questionsContributed: 94,
    note: "Focused on system-level application questions.",
  },
  {
    name: "Noah Kim",
    eventId: "health-informatics",
    eventName: "Health Informatics",
    questionsContributed: 76,
    note: "Wrote EHR workflows and privacy scenario items.",
  },
  {
    name: "Sofia Hernandez",
    eventId: "medical-spelling",
    eventName: "Medical Spelling",
    questionsContributed: 83,
    note: "Curated difficult spelling edge-cases and distractors.",
  },
  {
    name: "Ethan Johnson",
    eventId: "respiratory-therapy",
    eventName: "Respiratory Therapy",
    questionsContributed: 67,
    note: "Created intervention and patient-case prompts.",
  },
];
