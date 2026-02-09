export type UserRole = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  totp_enabled: boolean;
  must_change_password: boolean;
  created_at: string;
}
