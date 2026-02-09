export type UserRole = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  has_passkey: boolean;
  created_at: string;
  updated_at: string;
}
