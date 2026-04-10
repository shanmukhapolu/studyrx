export type ContributorRecord = {
  name: string;
  eventId: string;
  eventName: string;
  questionsContributed: number;
  note?: string;
};

export const CONTRIBUTORS: ContributorRecord[] = [
  {
    name: "Vedant Nayak",
    eventId: "respiratory-therapy",
    eventName: "Respiratory Therapy",
    questionsContributed: 400,
    note: "Built high-yield root-word and suffix sets.",
  },
  {
    name: "Soumya Panigrahy",
    eventId: "medical-math",
    eventName: "Medical Math",
    questionsContributed: 60,
    note: "Focused on system-level application questions.",
  }
];
