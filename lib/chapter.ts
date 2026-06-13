export type ChapterTest = {
  id: string;
  eventName: string;
  testName: string;
  deadlineAt: string;
  status: "active" | "completed";
  assignedMembers: Record<string, boolean>;
  createdAt: string;
  results?: Record<string, { score?: number; accuracy?: number; timeTakenSec?: number }>;
};

export type ChapterRecord = {
  chapterName: string;
  schoolName: string;
  charterOrganization: string;
  affiliation?: string;
  chapterType?: string;
  adminUid: string;
  adminRole?: string;
  createdAt: string;
  members?: Record<string, boolean | { joinedAt?: string; role?: string }>;
  tests?: Record<string, Omit<ChapterTest, "id">>;
};
