"use client";

import { useState } from "react";
import { registerPasskey } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, KeyRound, Users } from "lucide-react";

export default function SettingsPage() {
  const [passkeyStatus, setPasskeyStatus] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    setPasskeyStatus("");
    try {
      await registerPasskey();
      setPasskeyStatus("パスキーを登録しました");
    } catch (e) {
      setPasskeyStatus(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint size={20} />
            パスキー管理
          </CardTitle>
          <CardDescription>パスキーを登録すると、パスワードなしでログインできます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRegisterPasskey} disabled={isRegistering}>
            {isRegistering ? "登録中..." : "新しいパスキーを登録"}
          </Button>
          {passkeyStatus && (
            <p className="text-sm text-muted-foreground">{passkeyStatus}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={20} />
            パスワード変更
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 max-w-md" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="current-password">現在のパスワード</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button type="submit">パスワードを変更</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            家族設定
          </CardTitle>
          <CardDescription>家族メンバーの招待と権限管理</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">家族メンバーの管理機能は今後実装予定です</p>
        </CardContent>
      </Card>
    </div>
  );
}
