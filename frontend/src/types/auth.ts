export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionInfo {
  user_id: string;
  email: string;
  name: string;
  role: string;
  expires_at: string;
}
