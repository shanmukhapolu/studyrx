"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminGuard } from "@/components/auth/admin-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { HOSA_EVENTS } from "@/lib/events";
import {
  createQuestion,
  deleteQuestion,
  fetchQuestionsForAdmin,
  updateQuestion,
  type DbQuestion,
  type QuestionInput,
} from "@/lib/question-bank";

const STORAGE_KEY = "studyrx_auth_session";

function validateQuestionInput(input: QuestionInput): string | null {
  if (!input.question.trim()) return "Question is required.";
  if (!Array.isArray(input.options) || input.options.length !== 4) return "Exactly 4 options are required.";

  const normalizedOptions = input.options.map((option) => option.trim());
  if (normalizedOptions.some((option) => option.length === 0)) return "All 4 options are required.";

  const uniqueCount = new Set(normalizedOptions).size;
  if (uniqueCount !== 4) return "Options must be unique so there is a single correct choice.";

  if (!Number.isInteger(input.correctAnswerIndex) || input.correctAnswerIndex < 0 || input.correctAnswerIndex > 3) {
    return "A single correct option must be selected.";
  }

  if (!normalizedOptions[input.correctAnswerIndex]) return "Correct option must map to a non-empty answer.";
  if (!input.explanation.trim()) return "Explanation is required.";
  if (!input.eventId.trim()) return "Event is required.";
  if (!input.difficulty.trim()) return "Difficulty is required.";
  if (!input.category.trim()) return "Category is required.";

  return null;
}

const DEFAULT_FORM: QuestionInput = {
  question: "",
  options: ["", "", "", ""],
  correctAnswerIndex: 0,
  explanation: "",
  eventId: HOSA_EVENTS[0]?.id || "",
  category: "General",
  difficulty: "Easy",
  tags: [],
};

export default function AdminQuestionsPage() {
  const [items, setItems] = useState<DbQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionInput>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const token = useMemo(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return (parsed?.idToken as string | undefined) || null;
  }, []);

  const loadQuestions = async () => {
    if (!token) return;
    try {
      const res = await fetchQuestionsForAdmin(token, {
        page,
        pageSize,
        search,
        eventId: eventId || undefined,
        difficulty: difficulty || undefined,
        category: category || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load questions");
    }
  };

  useEffect(() => {
    void loadQuestions();
  }, [page, search, eventId, difficulty, category]);

  const clearForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const submitForm = async () => {
    if (!token) return;

    const validationError = validateQuestionInput(form);
    if (validationError) {
      setStatus(validationError);
      return;
    }

    try {
      if (editingId) {
        await updateQuestion(token, editingId, form);
        setStatus("Question updated.");
      } else {
        await createQuestion(token, form);
        setStatus("Question created.");
      }
      clearForm();
      await loadQuestions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    }
  };

  const beginEdit = (item: DbQuestion) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      options: item.options,
      correctAnswerIndex: item.correctAnswerIndex,
      explanation: item.explanation,
      eventId: item.eventId,
      category: item.category,
      difficulty: item.difficulty,
      tags: item.tags || [],
    });
  };

  const onDelete = async (id: string) => {
    if (!token || !confirm("Delete this question?")) return;
    try {
      await deleteQuestion(token, id);
      setStatus("Question deleted.");
      await loadQuestions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider>
        <AdminGuard>
          <AppSidebar />
          <SidebarInset>
            <main className="space-y-6 p-6">
              <div>
                <h1 className="text-2xl font-semibold">Questions</h1>
                <p className="text-sm text-muted-foreground">CRUD + indexed filters + full-text search across prompt/options/explanation/tags.</p>
              </div>

              <section className="grid gap-3 md:grid-cols-4">
                <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={eventId} onChange={(e) => { setEventId(e.target.value); setPage(1); }}>
                  <option value="">All Events</option>
                  {HOSA_EVENTS.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                </select>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}>
                  <option value="">All Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <Input placeholder="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} />
              </section>

              <section className="rounded-lg border p-4 space-y-3">
                <h2 className="font-semibold">{editingId ? "Edit Question" : "New Question"}</h2>
                <Input placeholder="Question" value={form.question} onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))} />
                <div className="grid gap-2 md:grid-cols-2">
                  {form.options.map((value, index) => (
                    <Input
                      key={index}
                      placeholder={`Option ${index + 1}`}
                      value={value}
                      onChange={(e) => {
                        const options = [...form.options] as [string, string, string, string];
                        options[index] = e.target.value;
                        setForm((prev) => ({ ...prev, options }));
                      }}
                    />
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.correctAnswerIndex} onChange={(e) => setForm((prev) => ({ ...prev, correctAnswerIndex: Number(e.target.value) }))}>
                    <option value={0}>Correct: Option 1</option>
                    <option value={1}>Correct: Option 2</option>
                    <option value={2}>Correct: Option 3</option>
                    <option value={3}>Correct: Option 4</option>
                  </select>
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.eventId} onChange={(e) => setForm((prev) => ({ ...prev, eventId: e.target.value }))}>
                    {HOSA_EVENTS.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                  </select>
                  <Input placeholder="Category" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.difficulty} onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value as "Easy" | "Medium" | "Hard" }))}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <Input placeholder="Explanation" value={form.explanation} onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))} />
                <Input
                  placeholder="Tags (comma separated)"
                  value={(form.tags || []).join(", ")}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))}
                />
                <div className="flex gap-2">
                  <Button onClick={submitForm}>{editingId ? "Update" : "Create"}</Button>
                  {editingId ? <Button variant="outline" onClick={clearForm}>Cancel</Button> : null}
                </div>
              </section>

              <section className="rounded-lg border">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b p-3 text-sm font-medium">
                  <span>Question</span>
                  <span>Meta</span>
                  <span>Actions</span>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b p-3 text-sm last:border-b-0">
                    <div>
                      <p className="font-medium">{item.question}</p>
                      <p className="text-muted-foreground">{item.options.join(" • ")}</p>
                    </div>
                    <div className="text-muted-foreground">
                      <p>{item.eventId}</p>
                      <p>{item.category} • {item.difficulty}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => beginEdit(item)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </section>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{total} total • page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Prev</Button>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
                </div>
              </div>

              {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </main>
          </SidebarInset>
        </AdminGuard>
      </SidebarProvider>
    </div>
  );
}
