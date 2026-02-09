export type AccountType = "bank" | "credit_card" | "cash" | "investment";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
