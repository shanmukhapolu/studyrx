"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { rtdbPatch } from "@/lib/rtdb";

function generateCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export default function ChapterOnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [chapterName, setChapterName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [charterOrganization, setCharterOrganization] = useState("");
  const [affiliation, setAffiliation] = useState("HOSA");
  const [chapterType, setChapterType] = useState("High School");
  const [adminRole, setAdminRole] = useState("President");

  const submit = async () => {
    if (!user) return;

    const chapterCode = generateCode();
    await rtdbPatch(`chapters/${chapterCode}`, {
      chapterName,
      schoolName,
      charterOrganization,
      affiliation,
      chapterType,
      adminUid: user.uid,
      adminRole,
      createdAt: new Date().toISOString(),
      members: { [user.uid]: { joinedAt: new Date().toISOString() } },
    });
    await rtdbPatch(`users/${user.uid}`, { chapterCode, onboardingCompleted: true });
    await completeOnboarding({ grade: "", referralSource: "", hosaEvents: [], experienceLevel: "", goal: "", charterOrganization: "", questionsPerSession: "10", chapterCode });
    router.replace("/chapter-admin/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Chapter Setup (Step {step}/3)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {step === 1 && (
            <>
              <Input placeholder="Chapter Name" value={chapterName} onChange={(e) => setChapterName(e.target.value)} />
              <Input placeholder="School Name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              <Input placeholder="Charter Organization" value={charterOrganization} onChange={(e) => setCharterOrganization(e.target.value)} />
            </>
          )}
          {step === 2 && (
            <>
              <label className="text-sm">Affiliated Organization</label>
              <select className="w-full border rounded p-2" value={affiliation} onChange={(e) => setAffiliation(e.target.value)}>
                <option>HOSA</option><option>DECA</option><option>BPA</option><option>None</option><option>Other</option>
              </select>
              <label className="text-sm">Chapter Type</label>
              <select className="w-full border rounded p-2" value={chapterType} onChange={(e) => setChapterType(e.target.value)}>
                <option>High School</option><option>College</option><option>Independent</option>
              </select>
            </>
          )}
          {step === 3 && (
            <>
              <label className="text-sm">Role in Chapter</label>
              <select className="w-full border rounded p-2" value={adminRole} onChange={(e) => setAdminRole(e.target.value)}>
                <option>President</option><option>Officer</option><option>Advisor</option><option>Other</option>
              </select>
            </>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</Button>
            {step < 3 ? <Button onClick={() => setStep((s) => s + 1)}>Next</Button> : <Button onClick={submit}>Create Chapter</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
