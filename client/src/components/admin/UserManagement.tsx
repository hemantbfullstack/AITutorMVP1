import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Crown,
  User,
  GraduationCap,
} from "lucide-react";
import { 
  adminService, 
  type UserSchema, 
  type UserWithStats, 
  type PaginationInfo, 
  type FilterOptions 
} from "@/services/adminService";
import {
  RoleChangeConfirmation,
  PlanChangeConfirmation,
  UsageResetConfirmation,
  DeleteUserConfirmation,
} from "@/components/ui/confirmation-dialog";

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const UserManagementComponent: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    plan: "all",
    status: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    roles: [],
    plans: [],
    statuses: [],
  });

  // Confirmation dialog states
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    userId: string;
    newRole: string;
    userName: string;
  }>({ open: false, userId: '', newRole: '', userName: '' });

  const [planChangeDialog, setPlanChangeDialog] = useState<{
    open: boolean;
    userId: string;
    newPlan: string;
    userName: string;
  }>({ open: false, userId: '', newPlan: '', userName: '' });

  const [usageResetDialog, setUsageResetDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: '', userName: '' });

  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: '', userName: '' });

  const debouncedSearch = useDebounce(filters.search, 500);
  const isInitialRender = useRef(true);

  // Initial load
  useEffect(() => {
    fetchUsers();
    isInitialRender.current = false;
  }, []);

  // Handle search, filter and sort changes
  useEffect(() => {
    // Skip the very first render, but fetch on all subsequent changes
    if (!isInitialRender.current) {
      fetchUsers();
    }
  }, [
    debouncedSearch,
    filters.role,
    filters.plan,
    filters.status,
    filters.sortBy,
    filters.sortOrder,
  ]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        role: filters.role,
        plan: filters.plan,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      setUsers(data.users);
      setPagination(data.pagination);
      setFilterOptions(data.filters || { roles: [], plans: [], statuses: [] });
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    filters.role,
    filters.plan,
    filters.status,
    filters.sortBy,
    filters.sortOrder,
  ]);

  const updateUserRole = useCallback((userId: string, newRole: string) => {
    // Find the user to get their name for the confirmation
    const user = users.find(u => u._id === userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'this user';
    
    setRoleChangeDialog({
      open: true,
      userId,
      newRole,
      userName,
    });
  }, [users]);

  const handleRoleChangeConfirm = useCallback(async () => {
    try {
      await adminService.updateUserRole(roleChangeDialog.userId, { role: roleChangeDialog.newRole });
      fetchUsers();
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  }, [roleChangeDialog.userId, roleChangeDialog.newRole, fetchUsers]);

  const updateUserPlan = useCallback((userId: string, newPlan: string) => {
    // Find the user to get their name for the confirmation
    const user = users.find(u => u._id === userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'this user';
    
    setPlanChangeDialog({
      open: true,
      userId,
      newPlan,
      userName,
    });
  }, [users]);

  const handlePlanChangeConfirm = useCallback(async () => {
    try {
      await adminService.updateUserPlan(planChangeDialog.userId, { planId: planChangeDialog.newPlan });
      fetchUsers();
    } catch (error) {
      console.error("Failed to update user plan:", error);
    }
  }, [planChangeDialog.userId, planChangeDialog.newPlan, fetchUsers]);

  const resetUserUsage = useCallback((userId: string) => {
    // Find the user to get their name for the confirmation
    const user = users.find(u => u._id === userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'this user';
    
    setUsageResetDialog({
      open: true,
      userId,
      userName,
    });
  }, [users]);

  const handleUsageResetConfirm = useCallback(async () => {
    try {
      await adminService.resetUserUsage(usageResetDialog.userId);
      fetchUsers();
    } catch (error) {
      console.error("Failed to reset user usage:", error);
    }
  }, [usageResetDialog.userId, fetchUsers]);

  const deleteUser = useCallback((userId: string) => {
    // Find the user to get their name for the confirmation
    const user = users.find(u => u._id === userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'this user';
    
    setDeleteUserDialog({
      open: true,
      userId,
      userName,
    });
  }, [users]);

  const handleDeleteUserConfirm = useCallback(async () => {
    try {
      await adminService.deleteUser(deleteUserDialog.userId);
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }, [deleteUserDialog.userId, fetchUsers]);

  const handleSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Don't call fetchUsers here - let debounced search handle it
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Don't call fetchUsers here - let useEffect handle it
  }, []);

  const handleSort = useCallback((sortBy: string) => {
    const newSortOrder =
      filters.sortBy === sortBy && filters.sortOrder === "asc" ? "desc" : "asc";
    setFilters((prev) => ({ ...prev, sortBy, sortOrder: newSortOrder }));
    // Don't call fetchUsers here - let useEffect handle it
  }, [filters.sortBy, filters.sortOrder]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "teacher":
        return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case "student":
        return <User className="h-4 w-4 text-green-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "teacher":
        return "secondary";
      case "student":
        return "default";
      default:
        return "default";
    }
  };

  // Update the plan display logic
  const getPlanDisplayName = (planId: string) => {
    switch (planId) {
      case "free":
        return "Free";
      case "basic":
        return "Basic";
      case "standard":
        return "Standard";
      case "pro":
        return "Pro";
      case "institution":
        return "Institution";
      default:
        return planId;
    }
  };

  // Update the plan upgrade logic
  const handlePlanUpgrade = (userId: string, currentPlan: string) => {
    const planUpgrades = {
      free: "basic",
      basic: "standard",
      standard: "pro",
      pro: "institution"
    };
    
    const nextPlan = planUpgrades[currentPlan as keyof typeof planUpgrades];
    if (nextPlan) {
      updateUserPlan(userId, nextPlan);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search with debounce indicator */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              {/* Show debounce indicator */}
              {filters.search !== debouncedSearch && (
                <div className="absolute right-3 top-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Role Filter */}
            <Select
              value={filters.role}
              onValueChange={(value) => handleFilterChange("role", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {filterOptions.roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Plan Filter */}
            <Select
              value={filters.plan}
              onValueChange={(value) => handleFilterChange("plan", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {filterOptions.plans.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search status indicator */}
          {filters.search && (
            <div className="text-sm text-gray-500">
              {filters.search !== debouncedSearch ? (
                <span>Searching for "{filters.search}"...</span>
              ) : (
                <span>Showing results for "{filters.search}"</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({pagination.total} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th
                    className="text-left p-3 font-medium cursor-pointer"
                    onClick={() => handleSort("firstName")}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {filters.sortBy === "firstName" &&
                        (filters.sortOrder === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {filters.sortBy === "email" &&
                        (filters.sortOrder === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {filters.sortBy === "role" &&
                        (filters.sortOrder === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer"
                    onClick={() => handleSort("planId")}
                  >
                    <div className="flex items-center gap-2">
                      Plan
                      {filters.sortBy === "planId" &&
                        (filters.sortOrder === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer"
                    onClick={() => handleSort("usageCount")}
                  >
                    <div className="flex items-center gap-2">
                      Usage
                      {filters.sortBy === "usageCount" &&
                        (filters.sortOrder === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium">Stats</th>
                  <th
                    className="text-left p-3 font-medium cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      Joined
                      {filters.sortBy === "createdAt" &&
                        (filters.sortOrder === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user._id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">{user.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{user.planId}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>
                          {user.usageCount} /{" "}
                          {user.planId === "free"
                            ? "5"
                            : user.planId === "basic"
                            ? "100"
                            : user.planId === "standard"
                            ? "200"
                            : user.planId === "pro"
                            ? "500"
                            : "1000"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Images: {user.imageUsageCount} | Voice: {user.voiceUsageCount} | Papers: {user.paperUsageCount}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.usageResetAt
                            ? `Resets: ${new Date(
                                user.usageResetAt
                              ).toLocaleDateString()}`
                            : "No reset date"}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs space-y-1">
                        <div>📚  sessions</div>
                        <div>💬  messages</div>
                        <div>��  papers</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {/* Role Update */}
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            updateUserRole(user._id, value)
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Plan Update */}
                        <Select
                          value={user.planId}
                          onValueChange={(value) =>
                            updateUserPlan(user._id, value)
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="institution">Institution</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Reset Usage */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetUserUsage(user._id)}
                          title="Reset usage count"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>

                        {/* Delete User */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user._id)}
                          disabled={user.role === "admin"}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                  fetchUsers();
                }}
                disabled={!pagination.hasPrev}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                  fetchUsers();
                }}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <RoleChangeConfirmation
        open={roleChangeDialog.open}
        onOpenChange={(open) => setRoleChangeDialog(prev => ({ ...prev, open }))}
        onConfirm={handleRoleChangeConfirm}
        userName={roleChangeDialog.userName}
        newRole={roleChangeDialog.newRole}
      />

      <PlanChangeConfirmation
        open={planChangeDialog.open}
        onOpenChange={(open) => setPlanChangeDialog(prev => ({ ...prev, open }))}
        onConfirm={handlePlanChangeConfirm}
        userName={planChangeDialog.userName}
        newPlan={planChangeDialog.newPlan}
      />

      <UsageResetConfirmation
        open={usageResetDialog.open}
        onOpenChange={(open) => setUsageResetDialog(prev => ({ ...prev, open }))}
        onConfirm={handleUsageResetConfirm}
        userName={usageResetDialog.userName}
      />

      <DeleteUserConfirmation
        open={deleteUserDialog.open}
        onOpenChange={(open) => setDeleteUserDialog(prev => ({ ...prev, open }))}
        onConfirm={handleDeleteUserConfirm}
        userName={deleteUserDialog.userName}
      />
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const UserManagement = memo(UserManagementComponent);
