import { useEffect, useState } from "react";
import { createClient } from "@/infrastructure/supabase/client";
import type { AuthUser } from "@/types/auth";

/**
 * Custom hook for managing authentication state and user session
 *
 * @returns Object containing user state, loading state, and auth methods
 * @example
 * ```tsx
 * const { user, loading, signIn, signOut } = useAuth();
 * ```
 */
export function useAuth() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = createClient();

	useEffect(() => {
		let mounted = true;

		// Listen for auth changes first
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log(
				"useAuth - Auth state changed:",
				event,
				session ? "session present" : "no session",
			);

			// Handle token refresh errors gracefully
			// These can occur when the client tries to refresh before cookies are fully available
			// after a magic link callback - we'll let the session establish naturally
			if (event === "TOKEN_REFRESHED" && !session) {
				// Token refresh failed - try to get the current session
				try {
					const {
						data: { session: currentSession },
					} = await supabase.auth.getSession();
					if (currentSession && mounted) {
						setUser(currentSession.user);
						setLoading(false);
						return;
					}
				} catch (error) {
					// Ignore refresh errors - they're often transient after magic link callbacks
					console.debug("Token refresh error (likely transient):", error);
				}
			}

			if (mounted) {
				if (event === "SIGNED_IN" && session) {
					// User just signed in, use the session user directly
					console.log(
						"useAuth - Signed in - user:",
						session.user
							? { id: session.user.id, email: session.user.email }
							: null,
					);
					setUser(session.user);
					setLoading(false);
				} else if (event === "SIGNED_OUT") {
					// User signed out
					console.log("useAuth - Signed out");
					setUser(null);
					setLoading(false);
				} else if (event === "INITIAL_SESSION" && session) {
					// Initial session found
					console.log(
						"useAuth - Initial session - user:",
						session.user
							? { id: session.user.id, email: session.user.email }
							: null,
					);
					setUser(session.user);
					setLoading(false);
				} else if (event === "INITIAL_SESSION" && !session) {
					// No initial session
					console.log("useAuth - No initial session");
					setUser(null);
					setLoading(false);
				} else if (event === "USER_UPDATED" && session) {
					// User profile was updated - use the updated user from session
					console.log(
						"useAuth - User updated - user:",
						session.user
							? {
									id: session.user.id,
									email: session.user.email,
									fullName: session.user.user_metadata?.full_name,
								}
							: null,
					);
					setUser(session.user);
					setLoading(false);
				} else if (event === "TOKEN_REFRESHED" && session) {
					// Token was refreshed - update user from session
					console.log(
						"useAuth - Token refreshed - user:",
						session.user
							? { id: session.user.id, email: session.user.email }
							: null,
					);
					setUser(session.user);
					setLoading(false);
				} else {
					// Other events, get user from auth
					const {
						data: { user },
					} = await supabase.auth.getUser();
					console.log(
						"useAuth - Auth change - user:",
						user ? { id: user.id, email: user.email } : null,
					);
					setUser(user);
					setLoading(false);
				}
			}
		});

		// Timeout to prevent infinite loading (increased to 10 seconds)
		const timeout = setTimeout(() => {
			console.log("useAuth - Timeout reached, setting loading to false");
			if (mounted) {
				setLoading(false);
			}
		}, 10000); // 10 second timeout

		return () => {
			mounted = false;
			clearTimeout(timeout);
			subscription.unsubscribe();
		};
	}, [supabase.auth]);

	/**
	 * Sign in with magic link
	 * @param email - User's email address
	 * @returns Promise that resolves when magic link is sent
	 */
	const signIn = async (email: string) => {
		// Next.js client/server—both are fine as long as it's absolute
		// Since this is a client-side hook, window.location.origin is always available
		// getAppUrl() would be used for server-side, but this hook only runs on the client
		const origin = window.location.origin;

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${origin}/auth/callback`,
			},
		});
		if (error) throw error;
	};

	/**
	 * Sign out the current user
	 * @returns Promise that resolves when user is signed out
	 */
	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	};

	return {
		loading,
		signIn,
		signOut,
		user,
	};
}
