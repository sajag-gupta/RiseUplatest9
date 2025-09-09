import { apiRequest } from "./queryClient";
import { STORAGE_KEYS } from "./constants";
import type { CurrentUser, LoginForm, SignupForm } from "../types";

export interface AuthResponse {
  user: CurrentUser;
  token: string;
}

export const authApi = {
  login: async (credentials: LoginForm): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data = await response.json();

    // Transform user data to match CurrentUser type
    const transformedUser: CurrentUser = {
      _id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      avatarUrl: data.user.avatarUrl,
      plan: data.user.plan,
      favorites: data.user.favorites,
      following: data.user.following,
    };

    // Store auth data
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(transformedUser));

    // Track login analytics
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify({
        userId: transformedUser._id,
        action: 'login',
        context: 'auth_system',
        metadata: {
          role: transformedUser.role,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      })
    }).catch(error => console.error('Login analytics failed:', error));

    return { user: transformedUser, token: data.token };
  },

  signup: async (userData: SignupForm): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/signup", {
      name: userData.name,
      email: userData.email,
      passwordHash: userData.password,
      role: "fan" // Default role for new signups
    });
    const data = await response.json();

    // Transform user data to match CurrentUser type
    const transformedUser: CurrentUser = {
      _id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      avatarUrl: data.user.avatarUrl,
      plan: data.user.plan,
      favorites: data.user.favorites,
      following: data.user.following,
    };

    // Store auth data
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(transformedUser));

    // Track signup analytics
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify({
        userId: transformedUser._id,
        action: 'signup',
        context: 'auth_system',
        metadata: {
          role: transformedUser.role,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      })
    }).catch(error => console.error('Signup analytics failed:', error));

    return { user: transformedUser, token: data.token };
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
    return response.json();
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    const response = await apiRequest("GET", "/api/users/me");
    const user = await response.json();

    // Transform the response to match CurrentUser type
    const transformedUser: CurrentUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      favorites: user.favorites,
      following: user.following,
    };

    // Update stored user data
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(transformedUser));

    return transformedUser;
  },

  getStoredToken: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  getStoredUser: (): CurrentUser | null => {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const user = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return !!(token && user);
  },

  hasRole: (role: string): boolean => {
    const user = authApi.getStoredUser();
    return user?.role === role;
  },

  updateProfile: async (updates: Partial<CurrentUser>): Promise<CurrentUser> => {
    const response = await apiRequest("PATCH", "/api/users/me", updates);
    const user = await response.json();

    // Transform the response to match CurrentUser type
    const transformedUser: CurrentUser = {
      _id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      favorites: user.favorites,
      following: user.following,
    };

    // Update stored user data
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(transformedUser));

    return transformedUser;
  },

  followArtist: async (artistId: string): Promise<{ following: boolean }> => {
    const response = await apiRequest("POST", `/api/users/follow/${artistId}`);
    return response.json();
  }
};

// Auth helper functions
export const getAuthHeaders = (): Record<string, string> => {
  const token = authApi.getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const requireAuth = () => {
  if (!authApi.isAuthenticated()) {
    // Instead of redirecting, we'll let the component handle showing the auth modal
    return false;
  }
  return true;
};

export const requireRole = (requiredRole: string) => {
  if (!authApi.isAuthenticated()) {
    // Instead of redirecting, we'll let the component handle showing the auth modal
    return false;
  }

  if (!authApi.hasRole(requiredRole)) {
    // Redirect to appropriate dashboard based on role
    const user = authApi.getStoredUser();
    if (user?.role === "artist") {
      window.location.href = "/creator";
    } else if (user?.role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/dashboard";
    }
    return false;
  }

  return true;
};

export const redirectAfterAuth = (user: CurrentUser) => {
  // Redirect to appropriate dashboard based on role
  switch (user.role) {
    case "artist":
      window.location.href = "/creator";
      break;
    case "admin":
      window.location.href = "/admin";
      break;
    case "fan":
      window.location.href = "/home";
      break;
    default:
      window.location.href = "/";
  }
};
