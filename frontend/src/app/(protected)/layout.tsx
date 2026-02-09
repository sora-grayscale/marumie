"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkSession } from "@/lib/auth";
import { api } from "@/lib/api-client";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, AlertTriangle } from "lucide-react";

function ForcePasswordChangeModal({ onSuccess }: { onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("新しいパスワードが一致しません");
      return;
    }
    if (newPassword.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put("/api/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      onSuccess();
    } catch {
      setError("パスワードの変更に失敗しました。現在のパスワードを確認してください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={20} />
            パスワードの変更が必要です
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-500" />
            <p className="text-sm text-yellow-500">
              初回ログインのため、パスワードを変更してください。変更が完了するまでアプリを使用できません。
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="force-current-password">現在のパスワード</Label>
              <Input
                id="force-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-new-password">新しいパスワード</Label>
              <Input
                id="force-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-confirm-password">新しいパスワード（確認）</Label>
              <Input
                id="force-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "変更中..." : "パスワードを変更"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        const session = await checkSession();
        setUserName(session.display_name);
        setMustChangePassword(session.must_change_password);
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    verify();
  }, [router]);

  const handlePasswordChanged = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="animate-pulse text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      {mustChangePassword && (
        <ForcePasswordChangeModal onSuccess={handlePasswordChanged} />
      )}
    </div>
  );
}
