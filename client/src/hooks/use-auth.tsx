import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authApi, redirectAfterAuth, type AuthResponse } from "@/lib/auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { toast } from "@/hooks/use-toast";
import type { CurrentUser, AuthState, LoginForm, SignupForm } from "@/types";

interface AuthContextType extends AuthState {
  login: (credentials: LoginForm) => Promise<void>;
  signup: (userData: SignupForm, skipRedirect?: boolean) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (updates: Partial<CurrentUser>) => Promise<void>;
  updateUser: (user: CurrentUser) => void;
  followArtist: (artistId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = authApi.getStoredToken();
    const user = authApi.getStoredUser();

    if (token && user) {
      // If we have both token and user, fetch complete user data to ensure it's up to date
      setAuthState({
        user: null, // Set to null to trigger the /api/users/me query
        token,
        isLoading: true,
      });
    } else {
      setAuthState({
        user,
        token,
        isLoading: false,
      });
    }
  }, []);

  // Get current user query with improved caching and race condition handling
  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["/api/users/me"],
    enabled: !!authState.token && !authState.user,
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache to reduce API calls
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection time
    retry: (failureCount, error) => {
      // Only retry on network errors, not on auth errors (401, 403)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403) {
          return false; // Don't retry on auth errors
        }
      }
      return failureCount < 1; // Only retry once for network errors to prevent loops
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Update auth state when user data changes or errors occur
  useEffect(() => {
    if (currentUser) {
      setAuthState(prev => ({
        ...prev,
        user: currentUser as CurrentUser,
        isLoading: false,
      }));
    } else if (userError && authState.token && !authState.user) {
      // If we have a token but failed to fetch user data, clear the token
      // This prevents the loading state from being stuck
      console.warn("Failed to fetch user data, clearing auth state:", userError);
      authApi.logout();
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
      });
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
    }
  }, [currentUser, userError, authState.token, authState.user]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuthState({
        user: data.user,
        token: data.token,
        isLoading: false,
      });
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.name}`,
      });
      redirectAfterAuth(data.user);
    },
    onError: (error: any) => {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Ensure loading state is reset even if mutation is cancelled
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => {
      setAuthState({
        user: data.user,
        token: data.token,
        isLoading: false,
      });
      toast({
        title: "Welcome to Rise Up Creators!",
        description: `Account created successfully for ${data.user.name}`,
      });
      redirectAfterAuth(data.user);
    },
    onError: (error: any) => {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
      toast({
        title: "Signup failed",
        description: error.message || "Please try again with different details.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Ensure loading state is reset even if mutation is cancelled
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (user) => {
      setAuthState(prev => ({
        ...prev,
        user,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Follow artist mutation
  const followArtistMutation = useMutation({
    mutationFn: authApi.followArtist,
    onSuccess: (data, artistId) => {
      // Update user's following list
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          following: data.following 
            ? [...(prev.user.following || []), artistId]
            : (prev.user.following || []).filter(id => id !== artistId)
        } : null,
      }));
      
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      
      toast({
        title: data.following ? "Following!" : "Unfollowed",
        description: data.following 
          ? "You're now following this artist" 
          : "You unfollowed this artist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Failed to follow/unfollow artist.",
        variant: "destructive",
      });
    },
  });

  const login = async (credentials: LoginForm) => {
    await loginMutation.mutateAsync(credentials);
  };

  const signup = async (userData: SignupForm, skipRedirect?: boolean): Promise<AuthResponse> => {
    if (userData.password !== userData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      throw new Error("Passwords don't match");
    }

    const result = await signupMutation.mutateAsync(userData);

    // If skipRedirect is true, don't redirect and return the result
    if (skipRedirect) {
      return result;
    }

    // Otherwise, the mutation's onSuccess will handle the redirect
    return result;
  };

  const logout = () => {
    authApi.logout();
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
    });
    queryClient.clear();
    navigate("/");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const updateProfile = async (updates: Partial<CurrentUser>) => {
    await updateProfileMutation.mutateAsync(updates);
  };

  const updateUser = (user: CurrentUser) => {
    setAuthState(prev => ({
      ...prev,
      user,
    }));
    
    // Update localStorage to keep it in sync with the same key used in auth.ts
    localStorage.setItem("ruc_user_data", JSON.stringify(user));
  };

  const followArtist = async (artistId: string) => {
    await followArtistMutation.mutateAsync(artistId);
  };

  const contextValue: AuthContextType = {
    ...authState,
    isLoading: authState.isLoading || userLoading || 
               loginMutation.isPending || signupMutation.isPending,
    login,
    signup,
    logout,
    updateProfile,
    updateUser,
    followArtist,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Auth guard hooks
export function useRequireAuth() {
  const auth = useAuth();
  const { openModal } = useAuthModal();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      openModal("login");
    }
  }, [auth.isLoading, auth.user, openModal]);

  return auth;
}

export function useRequireRole(requiredRole: string) {
  const auth = useAuth();
  const { openModal } = useAuthModal();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.user) {
        openModal("login");
      } else if (auth.user.role !== requiredRole) {
        // Redirect to appropriate dashboard
        redirectAfterAuth(auth.user);
      }
    }
  }, [auth.isLoading, auth.user, requiredRole, openModal]);

  return auth;
}
