"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { registerPasskey, checkSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, KeyRound, Shield, Lock, AlertTriangle, Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [passkeyStatus, setPasskeyStatus] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // TOTP
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetupUri, setTotpSetupUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isSettingUpTotp, setIsSettingUpTotp] = useState(false);
  const [isEnablingTotp, setIsEnablingTotp] = useState(false);
  const [isDisablingTotp, setIsDisablingTotp] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Encryption key rotation
  const [currentMasterPassword, setCurrentMasterPassword] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [isRotatingKey, setIsRotatingKey] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await checkSession();
        setTotpEnabled(session.totp_enabled);
      } catch {
        // ignore
      }
    };
    loadSession();
  }, []);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("新しいパスワードが一致しません");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("パスワードは8文字以上にしてください");
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.put("/api/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("パスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("パスワードの変更に失敗しました");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTotpSetup = async () => {
    setIsSettingUpTotp(true);
    try {
      const data = await api.post<{ secret: string; otpauth_uri: string }>("/api/auth/totp/setup");
      setTotpSetupUri(data.otpauth_uri);
    } catch {
      toast.error("TOTPセットアップに失敗しました");
    } finally {
      setIsSettingUpTotp(false);
    }
  };

  const handleTotpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode) return;
    setIsEnablingTotp(true);
    try {
      await api.post("/api/auth/totp/enable", { code: totpCode });
      toast.success("二段階認証を有効化しました");
      setTotpEnabled(true);
      setTotpSetupUri("");
      setTotpCode("");
    } catch {
      toast.error("認証コードが正しくありません");
    } finally {
      setIsEnablingTotp(false);
    }
  };

  const handleTotpDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode) return;
    setIsDisablingTotp(true);
    try {
      await api.post("/api/auth/totp/disable", { code: disableCode });
      toast.success("二段階認証を無効化しました");
      setTotpEnabled(false);
      setDisableCode("");
      setShowDisableForm(false);
    } catch {
      toast.error("認証コードが正しくありません");
    } finally {
      setIsDisablingTotp(false);
    }
  };

  const handleCopyUri = async () => {
    try {
      await navigator.clipboard.writeText(totpSetupUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const handleRotateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMasterPassword !== confirmMasterPassword) {
      toast.error("新しいマスターパスワードが一致しません");
      return;
    }
    if (newMasterPassword.length < 8) {
      toast.error("マスターパスワードは8文字以上にしてください");
      return;
    }
    setIsRotatingKey(true);
    try {
      await api.post("/api/auth/encryption/rotate", {
        current_master_password: currentMasterPassword,
        new_master_password: newMasterPassword,
      });
      toast.success("暗号化キーを変更しました。再ログインしてください。");
      setCurrentMasterPassword("");
      setNewMasterPassword("");
      setConfirmMasterPassword("");
    } catch {
      toast.error("暗号化キーの変更に失敗しました");
    } finally {
      setIsRotatingKey(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] sm:text-[27px] font-bold">設定</h1>

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
          <form className="space-y-4 max-w-md" onSubmit={handleChangePassword}>
            <div className="space-y-2">
              <Label htmlFor="current-password">現在のパスワード</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "変更中..." : "パスワードを変更"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            二段階認証 (TOTP)
          </CardTitle>
          <CardDescription>
            認証アプリを使った二段階認証でセキュリティを強化できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totpEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  有効
                </span>
                <span className="text-sm text-muted-foreground">二段階認証が有効です</span>
              </div>
              {showDisableForm ? (
                <form onSubmit={handleTotpDisable} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="disable-code">認証コード</Label>
                    <Input
                      id="disable-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="6桁のコード"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="destructive" disabled={isDisablingTotp}>
                      {isDisablingTotp ? "無効化中..." : "無効化する"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowDisableForm(false); setDisableCode(""); }}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" onClick={() => setShowDisableForm(true)}>
                  二段階認証を無効化
                </Button>
              )}
            </div>
          ) : totpSetupUri ? (
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-muted-foreground">
                以下のURIを認証アプリ（Google Authenticator等）に登録してください。
              </p>
              {/* QR code display can be added later with a library like qrcode.react */}
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={totpSetupUri}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCopyUri}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <form onSubmit={handleTotpEnable} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp-code">認証コード</Label>
                  <Input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="6桁のコード"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isEnablingTotp}>
                    {isEnablingTotp ? "確認中..." : "有効化"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setTotpSetupUri(""); setTotpCode(""); }}>
                    キャンセル
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <Button onClick={handleTotpSetup} disabled={isSettingUpTotp}>
              {isSettingUpTotp ? "セットアップ中..." : "セットアップ"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={20} />
            暗号化キーの変更
          </CardTitle>
          <CardDescription>マスターパスワードを変更して暗号化キーをローテーションします</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-500" />
            <p className="text-sm text-yellow-500">
              この操作はすべてのデータを新しいキーで再暗号化します。すべてのセッションが無効化されます。
            </p>
          </div>
          <form className="space-y-4 max-w-md" onSubmit={handleRotateKey}>
            <div className="space-y-2">
              <Label htmlFor="current-master">現在のマスターパスワード</Label>
              <Input
                id="current-master"
                type="password"
                value={currentMasterPassword}
                onChange={(e) => setCurrentMasterPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-master">新しいマスターパスワード</Label>
              <Input
                id="new-master"
                type="password"
                value={newMasterPassword}
                onChange={(e) => setNewMasterPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-master">新しいマスターパスワード（確認）</Label>
              <Input
                id="confirm-master"
                type="password"
                value={confirmMasterPassword}
                onChange={(e) => setConfirmMasterPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={isRotatingKey}>
              {isRotatingKey ? "変更中..." : "暗号化キーを変更"}
            </Button>
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
