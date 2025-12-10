/**
 * Admin Users Management Page
 *
 * Allows admins to view all users and assign admin roles
 */

"use client";

import {
	ArrowLeft,
	Loader2,
	Search,
	Shield,
	ShieldCheck,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";

interface UserData {
	id: string;
	email: string;
	full_name: string | null;
	avatar_url: string | null;
	role: string;
	entitlement_level: string | null;
	created_at: string;
	last_sign_in_at: string | null;
}

interface UsersResponse {
	data: {
		users: UserData[];
		pagination: {
			total: number;
			page: number;
			perPage: number;
			totalPages: number;
		};
	};
}

export default function AdminUsersPage() {
	const { user: currentUser, loading: authLoading } = useAuth();
	const router = useRouter();
	const { toast } = useToast();
	const [users, setUsers] = useState<UserData[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());

	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				limit: "50",
				offset: String((currentPage - 1) * 50),
				...(searchQuery && { search: searchQuery }),
			});

			const response = await fetch(`/api/admin/users?${params.toString()}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || data.error || "Failed to fetch users");
			}

			const typedData = data as UsersResponse;
			if (typedData.data) {
				setUsers(typedData.data.users);
				setTotalPages(typedData.data.pagination.totalPages);
				setTotal(typedData.data.pagination.total);
			}
		} catch (error) {
			console.error("Error fetching users:", error);
			toast({
				title: "Error",
				description: "Failed to load users. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [currentPage, searchQuery, toast]);

	useEffect(() => {
		if (!authLoading && currentUser) {
			fetchUsers();
		}
	}, [authLoading, currentUser, fetchUsers]);

	const handleRoleChange = async (userId: string, newRole: string) => {
		setUpdatingRoles((prev) => new Set(prev).add(userId));
		try {
			const response = await fetch("/api/admin/users", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId,
					role: newRole,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to update role");
			}

			toast({
				title: "Success",
				description: `User role updated to ${newRole}`,
			});

			// Refresh users list
			await fetchUsers();
		} catch (error) {
			console.error("Error updating role:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to update user role",
				variant: "destructive",
			});
		} finally {
			setUpdatingRoles((prev) => {
				const next = new Set(prev);
				next.delete(userId);
				return next;
			});
		}
	};

	const getRoleBadge = (role: string) => {
		const roleConfig = {
			admin: { label: "Admin", variant: "default" as const, icon: ShieldCheck },
			content_admin: {
				label: "Content Admin",
				variant: "secondary" as const,
				icon: Shield,
			},
			system_admin: {
				label: "System Admin",
				variant: "secondary" as const,
				icon: Shield,
			},
			user: { label: "User", variant: "outline" as const, icon: User },
		};

		const config =
			roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
		const Icon = config.icon;

		return (
			<Badge variant={config.variant} className="flex items-center gap-1">
				<Icon className="h-3 w-3" />
				{config.label}
			</Badge>
		);
	};

	const getEntitlementBadge = (entitlement: string | null) => {
		if (!entitlement) return null;

		const variants = {
			PRO: "default" as const,
			TRIAL: "secondary" as const,
			FREE: "outline" as const,
		};

		return (
			<Badge
				variant={variants[entitlement as keyof typeof variants] || "outline"}
			>
				{entitlement}
			</Badge>
		);
	};

	if (authLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!currentUser) {
		router.push("/login");
		return null;
	}

	return (
		<div className="container mx-auto py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<Link
						href="/admin"
						className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Admin Dashboard
					</Link>
					<h1 className="text-3xl font-bold">User Management</h1>
					<p className="text-muted-foreground mt-1">
						View and manage user accounts and permissions
					</p>
				</div>
			</div>

			{/* Search and Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Users</CardTitle>
					<CardDescription>
						Total users: {total} | Page {currentPage} of {totalPages}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by email or name..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setCurrentPage(1);
								}}
								className="pl-10"
							/>
						</div>
					</div>

					{/* Users List */}
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : users.length === 0 ? (
						<Alert>
							<AlertDescription>No users found.</AlertDescription>
						</Alert>
					) : (
						<div className="border rounded-lg overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead className="bg-muted">
										<tr>
											<th className="px-4 py-3 text-sm font-medium">Email</th>
											<th className="px-4 py-3 text-sm font-medium">Name</th>
											<th className="px-4 py-3 text-sm font-medium">Role</th>
											<th className="px-4 py-3 text-sm font-medium">
												Entitlement
											</th>
											<th className="px-4 py-3 text-sm font-medium">Created</th>
											<th className="px-4 py-3 text-sm font-medium">
												Last Sign In
											</th>
											<th className="px-4 py-3 text-sm font-medium">Actions</th>
										</tr>
									</thead>
									<tbody>
										{users.map((user) => (
											<tr key={user.id} className="border-t hover:bg-muted/50">
												<td className="px-4 py-3 font-medium">{user.email}</td>
												<td className="px-4 py-3">{user.full_name || "—"}</td>
												<td className="px-4 py-3">{getRoleBadge(user.role)}</td>
												<td className="px-4 py-3">
													{getEntitlementBadge(user.entitlement_level)}
												</td>
												<td className="px-4 py-3 text-sm text-muted-foreground">
													{new Date(user.created_at).toLocaleDateString()}
												</td>
												<td className="px-4 py-3 text-sm text-muted-foreground">
													{user.last_sign_in_at
														? new Date(
																user.last_sign_in_at,
															).toLocaleDateString()
														: "Never"}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<Select
															value={user.role}
															onValueChange={(newRole) =>
																handleRoleChange(user.id, newRole)
															}
															disabled={updatingRoles.has(user.id)}
														>
															<SelectTrigger className="w-40">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="user">User</SelectItem>
																<SelectItem value="admin">Admin</SelectItem>
																<SelectItem value="content_admin">
																	Content Admin
																</SelectItem>
																<SelectItem value="system_admin">
																	System Admin
																</SelectItem>
															</SelectContent>
														</Select>
														{updatingRoles.has(user.id) && (
															<Loader2 className="h-4 w-4 animate-spin" />
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between">
							<Button
								variant="outline"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1 || loading}
							>
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {currentPage} of {totalPages}
							</span>
							<Button
								variant="outline"
								onClick={() =>
									setCurrentPage((p) => Math.min(totalPages, p + 1))
								}
								disabled={currentPage === totalPages || loading}
							>
								Next
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
