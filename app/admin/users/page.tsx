"use client";

import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/auth/admin-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type AdminUserRecord } from "@/lib/firebase-auth-rest";

const STORAGE_KEY = "studyrx_auth_session";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatPractice(seconds: number) {
  const mins = Math.round((seconds || 0) / 60);
  return `${mins} min`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    setToken((parsed?.idToken as string | undefined) || null);
  }, []);

  const loadUsers = async () => {
    if (!token) return;
    setStatus(null);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to load users");
      setUsers((body?.users || []) as AdminUserRecord[]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load users");
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const saveName = async (uid: string) => {
    if (!token) return;
    const name = editingName.trim();
    if (!name) {
      setStatus("Name cannot be empty.");
      return;
    }

    setBusyUid(uid);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to update name");
      setEditingUid(null);
      setEditingName("");
      await loadUsers();
      setStatus("Name updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update name");
    } finally {
      setBusyUid(null);
    }
  };

  const resetPassword = async (uid: string, email: string) => {
    if (!token || !email) return;
    setBusyUid(uid);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reset_password", email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to send reset email");
      setStatus(`Password reset email sent to ${email}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to send reset email");
    } finally {
      setBusyUid(null);
    }
  };

  const deleteUser = async (uid: string, name: string) => {
    if (!token) return;
    const firstConfirm = window.confirm(`Delete user ${name || uid}? This is privileged and irreversible.`);
    if (!firstConfirm) return;

    const confirmText = window.prompt('Type DELETE to permanently remove this user profile and access:');
    if (confirmText !== "DELETE") {
      setStatus("Deletion cancelled. Confirmation text did not match.");
      return;
    }

    setBusyUid(uid);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete_user", confirmText }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to delete user");
      await loadUsers();
      setStatus(body?.warning || "User deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider>
        <AdminGuard>
          <AppSidebar />
          <SidebarInset>
            <main className="space-y-4 p-6">
              <h1 className="text-2xl font-semibold">Admin Users</h1>
              <p className="text-sm text-muted-foreground">Manage user profiles, resets, and irreversible deletions.</p>

              <section className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Join date</th>
                      <th className="p-3"># logins</th>
                      <th className="p-3">Practice time</th>
                      <th className="p-3">Last login</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.uid} className="border-b align-top">
                        <td className="p-3">
                          {editingUid === user.uid ? (
                            <div className="flex gap-2">
                              <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                              <Button size="sm" onClick={() => saveName(user.uid)} disabled={busyUid === user.uid}>Save</Button>
                            </div>
                          ) : (
                            user.name || `${user.firstName} ${user.lastName}`.trim() || "—"
                          )}
                        </td>
                        <td className="p-3">{user.email || "—"}</td>
                        <td className="p-3">{formatDate(user.createdAt)}</td>
                        <td className="p-3">{user.loginCount || 0}</td>
                        <td className="p-3">{formatPractice(user.totalPracticeSeconds)}</td>
                        <td className="p-3">{formatDate(user.lastLoginAt)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {editingUid === user.uid ? (
                              <Button size="sm" variant="outline" onClick={() => { setEditingUid(null); setEditingName(""); }} disabled={busyUid === user.uid}>Cancel</Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => { setEditingUid(user.uid); setEditingName(user.name || `${user.firstName} ${user.lastName}`.trim()); }}>Edit name</Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => resetPassword(user.uid, user.email)} disabled={busyUid === user.uid || !user.email}>Reset password</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteUser(user.uid, user.name)} disabled={busyUid === user.uid}>Delete user</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 ? (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={7}>No users found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </section>

              {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </main>
          </SidebarInset>
        </AdminGuard>
      </SidebarProvider>
    </div>
  );
}
