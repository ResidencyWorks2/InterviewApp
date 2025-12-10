import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/infrastructure/config/clients";
import { createClient } from "@/infrastructure/supabase/server";

/**
 * GET /api/admin/users
 * List all users with their roles and profile information
 * Requires admin role
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{
					error: "UNAUTHORIZED",
					message: "Authentication required",
					timestamp: new Date().toISOString(),
				},
				{ status: 401 },
			);
		}

		// Check if user is admin
		const userMetadata = user.user_metadata as
			| Record<string, unknown>
			| null
			| undefined;
		const role =
			typeof userMetadata?.role === "string"
				? (userMetadata.role as string)
				: "user";

		if (role !== "admin" && role !== "system_admin") {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		// Get pagination parameters
		const { searchParams } = new URL(request.url);
		const limit = Math.min(
			parseInt(searchParams.get("limit") || "50", 10),
			100,
		);
		const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
		const search = searchParams.get("search") || "";

		// Use service role client to access auth.users
		const serviceClient = getSupabaseServiceRoleClient();
		if (!serviceClient) {
			return NextResponse.json(
				{
					error: "INTERNAL_ERROR",
					message: "Service role client not available",
					timestamp: new Date().toISOString(),
				},
				{ status: 500 },
			);
		}

		// Get users from auth.users via admin API
		// Note: Supabase Admin API doesn't have a direct list endpoint
		// We'll need to use the service role client's auth.admin methods
		const { data: authUsers, error: listError } =
			await serviceClient.auth.admin.listUsers({
				page: Math.floor(offset / limit) + 1,
				perPage: limit,
			});

		if (listError) {
			console.error("Error listing users:", listError);
			return NextResponse.json(
				{
					error: "INTERNAL_ERROR",
					message: "Failed to list users",
					timestamp: new Date().toISOString(),
				},
				{ status: 500 },
			);
		}

		// Get public user profiles
		const userIds = authUsers.users.map((u) => u.id);
		const { data: userProfiles, error: profileError } = await supabase
			.from("users")
			.select("id, email, full_name, avatar_url, entitlement_level, created_at")
			.in("id", userIds);

		if (profileError) {
			console.error("Error fetching user profiles:", profileError);
		}

		// Combine auth users with profiles
		const profileMap = new Map(
			(userProfiles || []).map((profile) => [profile.id, profile]),
		);

		// Filter by search if provided
		let filteredUsers = authUsers.users;
		if (search) {
			const searchLower = search.toLowerCase();
			filteredUsers = authUsers.users.filter(
				(u) =>
					u.email?.toLowerCase().includes(searchLower) ||
					u.user_metadata?.full_name?.toLowerCase().includes(searchLower) ||
					profileMap.get(u.id)?.full_name?.toLowerCase().includes(searchLower),
			);
		}

		// Map to response format
		const users = filteredUsers.map((authUser) => {
			const profile = profileMap.get(authUser.id);
			const userRole =
				typeof authUser.user_metadata?.role === "string"
					? (authUser.user_metadata.role as string)
					: "user";

			return {
				id: authUser.id,
				email: authUser.email || "",
				full_name:
					profile?.full_name || authUser.user_metadata?.full_name || null,
				avatar_url:
					profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
				role: userRole,
				entitlement_level: profile?.entitlement_level || null,
				created_at: authUser.created_at,
				last_sign_in_at: authUser.last_sign_in_at || null,
			};
		});

		return NextResponse.json(
			{
				data: {
					users,
					pagination: {
						total: authUsers.total,
						page: Math.floor(offset / limit) + 1,
						perPage: limit,
						totalPages: Math.ceil(authUsers.total / limit),
					},
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error in GET /api/admin/users:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/admin/users
 * Update a user's role
 * Requires admin role
 */
export async function PATCH(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{
					error: "UNAUTHORIZED",
					message: "Authentication required",
					timestamp: new Date().toISOString(),
				},
				{ status: 401 },
			);
		}

		// Check if user is admin
		const userMetadata = user.user_metadata as
			| Record<string, unknown>
			| null
			| undefined;
		const role =
			typeof userMetadata?.role === "string"
				? (userMetadata.role as string)
				: "user";

		if (role !== "admin" && role !== "system_admin") {
			return NextResponse.json(
				{
					error: "FORBIDDEN",
					message: "Admin access required",
					timestamp: new Date().toISOString(),
				},
				{ status: 403 },
			);
		}

		const body = await request.json();
		const { userId, role: newRole } = body;

		if (!userId || !newRole) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "userId and role are required",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Validate role
		const validRoles = ["user", "admin", "content_admin", "system_admin"];
		if (!validRoles.includes(newRole)) {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Prevent users from removing their own admin status
		if (userId === user.id && newRole !== "admin" && role === "admin") {
			return NextResponse.json(
				{
					error: "BAD_REQUEST",
					message: "Cannot remove your own admin status",
					timestamp: new Date().toISOString(),
				},
				{ status: 400 },
			);
		}

		// Use service role client to update user metadata
		const serviceClient = getSupabaseServiceRoleClient();
		if (!serviceClient) {
			return NextResponse.json(
				{
					error: "INTERNAL_ERROR",
					message: "Service role client not available",
					timestamp: new Date().toISOString(),
				},
				{ status: 500 },
			);
		}

		// Get current user metadata
		const { data: targetUser, error: getUserError } =
			await serviceClient.auth.admin.getUserById(userId);

		if (getUserError || !targetUser) {
			return NextResponse.json(
				{
					error: "NOT_FOUND",
					message: "User not found",
					timestamp: new Date().toISOString(),
				},
				{ status: 404 },
			);
		}

		// Update user metadata with new role
		const currentMetadata =
			(targetUser.user.user_metadata as Record<string, unknown>) || {};
		const updatedMetadata = {
			...currentMetadata,
			role: newRole,
		};

		const { data: updatedUser, error: updateError } =
			await serviceClient.auth.admin.updateUserById(userId, {
				user_metadata: updatedMetadata,
			});

		if (updateError) {
			console.error("Error updating user role:", updateError);
			return NextResponse.json(
				{
					error: "INTERNAL_ERROR",
					message: "Failed to update user role",
					timestamp: new Date().toISOString(),
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{
				data: {
					id: updatedUser.user.id,
					email: updatedUser.user.email,
					role: newRole,
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error in PATCH /api/admin/users:", error);
		return NextResponse.json(
			{
				error: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
