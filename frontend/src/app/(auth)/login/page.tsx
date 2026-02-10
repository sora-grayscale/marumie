"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithPasskey, loginWithPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"passkey" | "password">("passkey");

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await loginWithPasskey();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "パスキー認証に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await loginWithPassword(
        email,
        password,
        masterPassword,
        totpRequired ? totpCode : undefined,
      );
      if (result.ok) {
        router.push("/dashboard");
      } else if (result.totpRequired) {
        setTotpRequired(true);
      } else {
        setError("認証に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <span className="text-primary-foreground font-bold text-2xl">M</span>
          </div>
          <h1 className="text-[27px] font-bold text-foreground">みらい家計簿</h1>
          <p className="text-sm text-muted-foreground mt-1">安全にログインしてください</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-8 pb-8 space-y-6">
            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            {mode === "passkey" ? (
              <div className="space-y-4">
                <Button
                  className="w-full h-12 text-base rounded-xl"
                  size="lg"
                  onClick={handlePasskeyLogin}
                  disabled={isLoading}
                >
                  <Fingerprint className="mr-2" size={22} />
                  {isLoading ? "認証中..." : "パスキーでログイン"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMode("password")}
                  >
                    パスワードでログイン
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="master-password">マスターパスワード</Label>
                  <Input
                    id="master-password"
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="E2EE暗号化用"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                {totpRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="totp-code">認証コード (TOTP)</Label>
                    <Input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="6桁のコード"
                      className="h-11 rounded-xl"
                      maxLength={6}
                      required
                    />
                  </div>
                )}
                <Button className="w-full h-12 text-base rounded-xl" type="submit" disabled={isLoading}>
                  <KeyRound className="mr-2" size={20} />
                  {isLoading ? "ログイン中..." : "ログイン"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMode("passkey")}
                  >
                    パスキーでログイン
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
