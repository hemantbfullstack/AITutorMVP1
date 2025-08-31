import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  GraduationCap
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { User as UserSchema } from '@shared/schema';

interface UserWithStats extends UserSchema {
  stats: {
    sessions: number;
    messages: number;
    papers: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterOptions {
  roles: string[];
  plans: string[];
  statuses: string[];
}

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

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    plan: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    roles: [],
    plans: [],
    statuses: []
  });

  // Debounce search input with 500ms delay
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fetch users when debounced search or other filters change
  useEffect(() => {
    // Only fetch if pagination is initialized
    if (pagination && pagination.page && pagination.limit) {
      fetchUsers();
    }
  }, [debouncedSearch, filters.role, filters.plan, filters.status, filters.sortBy, filters.sortOrder]);

  // Separate effect for pagination changes
  useEffect(() => {
    if (pagination && pagination.page && pagination.limit) {
      fetchUsers();
    }
  }, [pagination.page, pagination.limit]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearch, // Use debounced search value
        role: filters.role,
        plan: filters.plan,
        status: filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      setUsers(data.users);
      setPagination(data.pagination);
      setFilterOptions(data.filters);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.role, filters.plan, filters.status, filters.sortBy, filters.sortOrder, pagination.page, pagination.limit]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlan })
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user plan:', error);
    }
  };

  const resetUserUsage = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/reset-usage`, {
        method: 'PATCH'
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Failed to reset user usage:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSort = (sortBy: string) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({ ...prev, sortBy, sortOrder: newSortOrder }));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'teacher': return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case 'student': return <User className="h-4 w-4 text-green-600" />;
      default: return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'secondary';
      case 'student': return 'default';
      default: return 'default';
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    fetchUsers();
  }, []); // Empty dependency array for initial fetch only

  if (loading) return <div>Loading...</div>;

  return (
    <AdminLayout>
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
              <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {filterOptions.roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Plan Filter */}
              <Select value={filters.plan} onValueChange={(value) => handleFilterChange('plan', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {filterOptions.plans.map(plan => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
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
                    <th className="text-left p-3 font-medium cursor-pointer" onClick={() => handleSort('firstName')}>
                      <div className="flex items-center gap-2">
                        Name
                        {filters.sortBy === 'firstName' && (
                          filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium cursor-pointer" onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-2">
                        Email
                        {filters.sortBy === 'email' && (
                          filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium cursor-pointer" onClick={() => handleSort('role')}>
                      <div className="flex items-center gap-2">
                        Role
                        {filters.sortBy === 'role' && (
                          filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium cursor-pointer" onClick={() => handleSort('planId')}>
                      <div className="flex items-center gap-2">
                        Plan
                        {filters.sortBy === 'planId' && (
                          filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium cursor-pointer" onClick={() => handleSort('usageCount')}>
                      <div className="flex items-center gap-2">
                        Usage
                        {filters.sortBy === 'usageCount' && (
                          filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium">Stats</th>
                    <th className="text-left p-3 font-medium cursor-pointer" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-2">
                        Joined
                        {filters.sortBy === 'createdAt' && (
                          filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
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
                          <div>{user.usageCount} / {user.planId === 'free' ? '5' : user.planId === 'hourly' ? '100' : user.planId === 'monthly' ? '200' : '2500'}</div>
                          <div className="text-xs text-gray-500">
                            {user.usageResetAt ? `Resets: ${new Date(user.usageResetAt).toLocaleDateString()}` : 'No reset date'}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs space-y-1">
                          <div>📚 {user.stats.sessions} sessions</div>
                          <div>💬 {user.stats.messages} messages</div>
                          <div>�� {user.stats.papers} papers</div>
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
                          <Select value={user.role} onValueChange={(value) => updateUserRole(user.id, value)}>
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
                          <Select value={user.planId} onValueChange={(value) => updateUserPlan(user.id, value)}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Reset Usage */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetUserUsage(user.id)}
                            title="Reset usage count"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>

                          {/* Delete User */}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                            disabled={user.role === 'admin'}
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
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};