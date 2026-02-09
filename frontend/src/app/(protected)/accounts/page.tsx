"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Account } from "@/types/account";
import { Plus, Landmark, CreditCard, Banknote, TrendingUp } from "lucide-react";

const accountTypeIcons: Record<string, React.ElementType> = {
  bank: Landmark,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

const accountTypeLabels: Record<string, string> = {
  bank: "銀行",
  credit_card: "クレジットカード",
  cash: "現金",
  investment: "投資",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await api.get<Account[]>("/api/accounts");
        setAccounts(data);
      } catch {
        // keep empty on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">口座管理</h1>
        <Button>
          <Plus size={16} className="mr-2" />
          口座を追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登録済み口座</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-muted-foreground">読み込み中...</div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">口座が登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>口座名</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>金融機関</TableHead>
                  <TableHead className="text-right">残高</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const Icon = accountTypeIcons[account.type] || Landmark;
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="flex items-center gap-2">
                        <Icon size={16} className="text-muted-foreground" />
                        {account.name}
                      </TableCell>
                      <TableCell>{accountTypeLabels[account.type] || account.type}</TableCell>
                      <TableCell>{account.institution || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
