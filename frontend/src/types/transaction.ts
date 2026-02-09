export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  memo?: string;
  payment_method?: string;
  hash: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}
