import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Database, 
  TrendingUp, 
  DollarSign, 
  Activity,
  BookOpen,
  Brain,
  Calculator,
  BarChart3,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { adminService } from "@/services/adminService";
import { apiClient } from "@/utils/apiClient";

interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    premium: number;
    roleDistribution: Array<{ _id: string; count: number }>;
    planDistribution: Array<{ _id: string; count: number }>;
  };
  usage: {
    totalTokensUsed: number;
    totalCost: number;
    averageCostPerDay: number;
    totalTtsMinutes: number;
    totalWolframRequests: number;
  };
  chat: {
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    averageTokensPerSession: number;
  };
  knowledgeBases: {
    total: number;
    totalFiles: number;
    totalChunks: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch all dashboard data in parallel
      const [userStats, usageStats, chatStats, kbStats] = await Promise.all([
        adminService.getUserStats(),
        apiClient.get('/usage/stats').then(res => res.data),
        apiClient.get('/chat/sessions/stats').then(res => res.data),
        apiClient.get('/knowledge-base').then(res => res.data)
      ]);

      setStats({
        users: userStats,
        usage: usageStats.overview || {},
        chat: chatStats.overview || {},
        knowledgeBases: {
          total: kbStats.knowledgeBases?.length || 0,
          totalFiles: kbStats.knowledgeBases?.reduce((sum: number, kb: any) => sum + (kb.fileCount || 0), 0) || 0,
          totalChunks: kbStats.knowledgeBases?.reduce((sum: number, kb: any) => sum + (kb.totalChunks || 0), 0) || 0,
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    trendValue,
    color = "text-blue-600"
  }: {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ElementType;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center mt-2">
            {trend === "up" && <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />}
            <span className={`text-xs ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-gray-500"}`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    href, 
    color = "bg-blue-600 hover:bg-blue-700"
  }: {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    color?: string;
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className={`w-full ${color}`}>
          <Link href={href}>
            <span>Go to {title}</span>
            <ArrowUpRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Overview of your AI Tutor platform</p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          description={`${stats?.users.active || 0} active users`}
          icon={Users}
          trend="up"
          trendValue={`+${stats?.users.newThisMonth || 0} this month`}
        />
        <StatCard
          title="Chat Sessions"
          value={stats?.chat.totalSessions || 0}
          description={`${stats?.chat.totalMessages || 0} total messages`}
          icon={MessageSquare}
          trend="up"
          trendValue={`${Math.round(stats?.chat.averageMessagesPerSession || 0)} avg/session`}
        />
        <StatCard
          title="Knowledge Bases"
          value={stats?.knowledgeBases.total || 0}
          description={`${stats?.knowledgeBases.totalFiles || 0} files, ${stats?.knowledgeBases.totalChunks || 0} chunks`}
          icon={Database}
          color="text-green-600"
        />
        <StatCard
          title="Total Cost"
          value={`$${(stats?.usage.totalCost || 0).toFixed(2)}`}
          description={`$${(stats?.usage.averageCostPerDay || 0).toFixed(2)}/day average`}
          icon={DollarSign}
          color="text-red-600"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            title="Knowledge Base"
            description="Manage learning materials and documents"
            icon={Database}
            href="/knowledge-base"
            color="bg-green-600 hover:bg-green-700"
          />
          <QuickActionCard
            title="User Management"
            description="View and manage user accounts"
            icon={Users}
            href="/admin/users"
          />
          <QuickActionCard
            title="Plan Sync"
            description="Synchronize subscription plans"
            icon={Settings}
            href="/admin/sync"
            color="bg-purple-600 hover:bg-purple-700"
          />
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Role Distribution</span>
              </div>
              <div className="space-y-2">
                {stats?.users.roleDistribution.map((role) => (
                  <div key={role._id} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{role._id}</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(role.count / (stats?.users.total || 1)) * 100} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm font-medium">{role.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Plan Distribution</span>
              </div>
              <div className="space-y-2">
                {stats?.users.planDistribution.map((plan) => (
                  <div key={plan._id} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{plan._id}</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(plan.count / (stats?.users.total || 1)) * 100} 
                        className="w-20 h-2" 
                      />
                      <span className="text-sm font-medium">{plan.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Usage Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.usage.totalTokensUsed?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600">Total Tokens</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(stats?.usage.totalTtsMinutes || 0)}
                </div>
                <div className="text-sm text-gray-600">TTS Minutes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.usage.totalWolframRequests || 0}
                </div>
                <div className="text-sm text-gray-600">Wolfram Requests</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(stats?.chat.averageTokensPerSession || 0)}
                </div>
                <div className="text-sm text-gray-600">Avg Tokens/Session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Features Overview */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-600" />
          Platform Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold">AI Tutor Chat</h3>
            <p className="text-sm text-gray-600">Interactive math tutoring</p>
          </Card>
          <Card className="text-center p-4">
            <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold">Paper Generator</h3>
            <p className="text-sm text-gray-600">IB Math papers</p>
          </Card>
          <Card className="text-center p-4">
            <Calculator className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold">Math Tools</h3>
            <p className="text-sm text-gray-600">Calculator & graphing</p>
          </Card>
          <Card className="text-center p-4">
            <BookOpen className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold">Knowledge Base</h3>
            <p className="text-sm text-gray-600">Document management</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
