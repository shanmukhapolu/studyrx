"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, RotateCcw, Settings2, SlidersHorizontal, UserRound } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEFAULT_USER_SETTINGS, storage, type SessionQuestionLimit, type UserSettings } from "@/lib/storage";

const sessionOptions: SessionQuestionLimit[] = [10, 25, 50, 100, "unlimited"];

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <SettingsContent />
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}

function SettingsContent() {
  const { profile, user, updateName, sendPasswordReset } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingData, setResettingData] = useState(false);

  useEffect(() => {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
  }, [profile?.firstName, profile?.lastName]);

  useEffect(() => {
    const loadSettings = async () => {
      const loaded = await storage.getSettings();
      setSettings({ ...loaded, showExplanationTime: true });
    };

    void loadSettings();
  }, []);

  const email = user?.email ?? "your email";
  const fullNamePreview = useMemo(() => `${firstName} ${lastName}`.trim() || "Student", [firstName, lastName]);

  const handleSaveName = async () => {
    setSavingName(true);
    setStatus(null);
    try {
      await updateName({ firstName: firstName.trim(), lastName: lastName.trim() });
      setStatus("Name updated successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update your name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveStudySettings = async () => {
    setSavingSettings(true);
    setStatus(null);
    try {
      await storage.saveSettings({ ...settings, showExplanationTime: true });
      setStatus("Study settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordReset = async () => {
    setSendingReset(true);
    setStatus(null);
    try {
      await sendPasswordReset();
      setStatus(`Password reset email sent to ${email}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send password reset email.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleResetAllData = async () => {
    setResettingData(true);
    setStatus(null);
    try {
      await storage.resetAllData();
      setStatus("All stats and progress have been reset.");
      setShowResetModal(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to reset your data.");
    } finally {
      setResettingData(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="rounded-2xl border border-primary/25 bg-card/70 p-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Settings2 className="h-7 w-7 text-primary" /> Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account details and tailor how StudyRx tracks your practice.</p>
      </header>

      {status && <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{status}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" /> Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">First name</label>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last name</label>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="text-muted-foreground">Preview</div>
              <div className="mt-1 text-lg font-semibold">{fullNamePreview}</div>
            </div>

            <Button onClick={handleSaveName} disabled={savingName}>
              {savingName ? "Saving..." : "Save Name"}
            </Button>

            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold">Password reset</div>
              <p className="mt-1 text-sm text-muted-foreground">Send a reset link to <strong>{email}</strong>.</p>
              <Button variant="outline" className="mt-4 bg-transparent" onClick={handlePasswordReset} disabled={sendingReset}>
                <BellRing className="mr-2 h-4 w-4" />
                {sendingReset ? "Sending..." : "Email Reset Link"}
              </Button>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="text-sm font-semibold text-destructive">Danger zone</div>
              <p className="mt-1 text-sm text-muted-foreground">Reset all stats, session history, wrong-question pool progress, and completed progress.</p>
              <Button variant="outline" className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 bg-transparent" onClick={() => setShowResetModal(true)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset All Stats & Progress
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> Study Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Accuracy goal</label>
              <Input
                type="number"
                min={50}
                max={100}
                value={settings.accuracyGoal}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  accuracyGoal: Math.min(100, Math.max(50, Number(event.target.value) || DEFAULT_USER_SETTINGS.accuracyGoal)),
                }))}
              />
              <p className="text-xs text-muted-foreground">Used for the dashboard momentum meter and mastery targets.</p>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Session length</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {sessionOptions.map((option) => {
                  const active = settings.sessionQuestionLimit === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSettings((current) => ({ ...current, sessionQuestionLimit: option }))}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                    >
                      {option === "unlimited" ? "∞" : option}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleSaveStudySettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Study Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
          <Card className="w-full max-w-lg border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Confirm reset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                This will permanently erase your analytics history, spaced-repetition progress, and current session state. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="bg-transparent" onClick={() => setShowResetModal(false)} disabled={resettingData}>Cancel</Button>
                <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleResetAllData} disabled={resettingData}>
                  {resettingData ? "Resetting..." : "Yes, reset everything"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-card/80 p-4 shadow-none">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{label}</div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {checked ? "On" : "Off"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-7 w-12 rounded-full bg-muted transition-colors peer-checked:bg-primary/80" />
        <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow-none transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}
