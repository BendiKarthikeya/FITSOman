import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  organizationId?: string | null;
}

class AuthManager {
  private user: AuthUser | null = null;
  private token: string | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    // Check for existing session
    const savedUser = localStorage.getItem('insightpulse_user');
    const savedToken = localStorage.getItem('insightpulse_token');
    
    if (savedUser && savedToken) {
      try {
        this.user = JSON.parse(savedUser);
        this.token = savedToken;
        
        // Verify token is not expired
        if (this.isTokenExpired()) {
          this.logout();
        }
      } catch {
        this.logout();
      }
    }
  }

  private isTokenExpired(): boolean {
    if (!this.token) return true;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  subscribe(listener: (user: AuthUser | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.user));
  }

  async login(username: string, password: string, organizationId?: string): Promise<AuthUser> {
    const response = await apiRequest("POST", "/api/auth/login", {
      username,
      password,
      ...(organizationId && { organizationId }),
    });
    
    const data = await response.json();
    this.user = data.user;
    this.token = data.token;
    
    localStorage.setItem('insightpulse_user', JSON.stringify(this.user));
    localStorage.setItem('insightpulse_token', this.token!);
    
    this.notify();
    return this.user!;
  }

  async register(username: string, email: string, password: string, organizationId?: string): Promise<AuthUser> {
    const response = await apiRequest("POST", "/api/auth/register", {
      username,
      email,
      password,
      role: "user",
      organizationId,
    });
    
    const data = await response.json();
    this.user = data.user;
    this.token = data.token;
    
    localStorage.setItem('insightpulse_user', JSON.stringify(this.user));
    localStorage.setItem('insightpulse_token', this.token!);
    
    this.notify();
    return this.user!;
  }

  logout() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('insightpulse_user');
    localStorage.removeItem('insightpulse_token');
    this.notify();
  }

  isAdmin() {
    return this.user?.role === 'admin';
  }
}

export const auth = new AuthManager();
