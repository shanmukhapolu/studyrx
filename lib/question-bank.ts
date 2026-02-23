import {
  firestoreDeleteDocument,
  firestoreListCollection,
  firestorePatchDocument,
  firestoreRunQuery,
  firestoreSetDocument,
} from "@/lib/firestore-rest";

export type QuestionDifficulty = "Easy" | "Medium" | "Hard";

export interface DbQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  correctAnswer?: string; // legacy compatibility
  explanation: string;
  eventId: string;
  category: string;
  difficulty: QuestionDifficulty;
  tags?: string[];
  searchText: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionInput = Omit<DbQuestion, "id" | "searchText" | "createdAt" | "updatedAt">;

function ensureOptions(options: string[]): [string, string, string, string] {
  return [options[0] || "", options[1] || "", options[2] || "", options[3] || ""];
}

function buildSearchText(input: { question: string; options: string[]; explanation: string; tags?: string[] }) {
  return [input.question, ...input.options, input.explanation, ...(input.tags || [])].join(" ").toLowerCase();
}

export function normalizeDbQuestion(id: string, raw: any): DbQuestion {
  const options = Array.isArray(raw?.options) ? raw.options.map((opt: unknown) => String(opt ?? "")) : ["", "", "", ""];
  const tags = Array.isArray(raw?.tags) ? raw.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : [];

  const normalizedOptions = ensureOptions(options);
  const legacyAnswer = typeof raw?.correctAnswer === "string" ? raw.correctAnswer : "";
  const indexFromLegacy = legacyAnswer ? normalizedOptions.findIndex((value) => value === legacyAnswer) : -1;
  const resolvedIndex = Number.isInteger(raw?.correctAnswerIndex)
    ? Number(raw.correctAnswerIndex)
    : indexFromLegacy >= 0
      ? indexFromLegacy
      : 0;

  return {
    id,
    question: String(raw?.question || ""),
    options: normalizedOptions,
    correctAnswerIndex: Math.min(3, Math.max(0, resolvedIndex)),
    correctAnswer: legacyAnswer || undefined,
    explanation: String(raw?.explanation || ""),
    eventId: String(raw?.eventId || ""),
    category: String(raw?.category || ""),
    difficulty: raw?.difficulty === "Hard" || raw?.difficulty === "Medium" ? raw.difficulty : "Easy",
    tags,
    searchText: String(raw?.searchText || buildSearchText({ question: String(raw?.question || ""), options, explanation: String(raw?.explanation || ""), tags })),
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    updatedAt: String(raw?.updatedAt || new Date().toISOString()),
  };
}

export async function fetchQuestionsByEvent(idToken: string, eventId: string): Promise<DbQuestion[]> {
  const query = {
    from: [{ collectionId: "questions" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "eventId" },
        op: "EQUAL",
        value: { stringValue: eventId },
      },
    },
  };

  const docs = await firestoreRunQuery(idToken, query);
  return docs.map((doc) => normalizeDbQuestion(doc.id, doc.data));
}

export interface QuestionAdminQuery {
  eventId?: string;
  difficulty?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchQuestionsForAdmin(idToken: string, query: QuestionAdminQuery) {
  const all = (await firestoreListCollection(idToken, "questions")).map((doc) => normalizeDbQuestion(doc.id, doc.data));

  const search = (query.search || "").trim().toLowerCase();
  const filtered = all.filter((item) => {
    if (query.eventId && item.eventId !== query.eventId) return false;
    if (query.difficulty && item.difficulty !== query.difficulty) return false;
    if (query.category && item.category !== query.category) return false;
    if (search && !item.searchText.includes(search)) return false;
    return true;
  });

  const pageSize = Math.max(1, query.pageSize || 10);
  const page = Math.max(1, query.page || 1);
  const start = (page - 1) * pageSize;

  return {
    total: filtered.length,
    page,
    pageSize,
    items: filtered.slice(start, start + pageSize),
  };
}

export async function createQuestion(idToken: string, input: QuestionInput) {
  const now = new Date().toISOString();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await firestoreSetDocument(idToken, `questions/${id}`, {
    ...input,
    options: ensureOptions(input.options),
    searchText: buildSearchText(input),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateQuestion(idToken: string, questionId: string, input: QuestionInput) {
  await firestorePatchDocument(idToken, `questions/${questionId}`, {
    ...input,
    options: ensureOptions(input.options),
    searchText: buildSearchText(input),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteQuestion(idToken: string, questionId: string) {
  await firestoreDeleteDocument(idToken, `questions/${questionId}`);
}
