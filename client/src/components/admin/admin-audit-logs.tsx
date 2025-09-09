import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Clock, User, Shield, AlertTriangle, Ban, Key, Edit, Trash2, DollarSign } from "lucide-react";
import Loading from "@/components/common/loading";

interface AuditLog {
  _id: string;
  adminId: string;
  action: string;
  details: any;
  timestamp: string;
  ip?: string;
}

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");

  // Fetch audit logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["/api/admin/logs", actionFilter, adminFilter],
    queryFn: () => fetch(`/api/admin/logs?action=${actionFilter}&admin=${adminFilter}&limit=100`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ruc_auth_token')}` }
    }).then(res => res.json()),
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ban_user':
      case 'unban_user':
        return <Ban className="w-4 h-4" />;
      case 'reset_password':
        return <Key className="w-4 h-4" />;
      case 'change_role':
        return <User className="w-4 h-4" />;
      case 'freeze_nft':
      case 'unfreeze_nft':
        return <AlertTriangle className="w-4 h-4" />;
      case 'edit_nft':
        return <Edit className="w-4 h-4" />;
      case 'burn_nft':
        return <Trash2 className="w-4 h-4" />;
      case 'process_refund':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getActionBadge = (action: string) => {
    const actionColors: { [key: string]: "destructive" | "default" | "secondary" | "outline" } = {
      'ban_user': 'destructive',
      'unban_user': 'default',
      'reset_password': 'secondary',
      'change_role': 'default',
      'freeze_nft': 'destructive',
      'unfreeze_nft': 'default',
      'edit_nft': 'secondary',
      'burn_nft': 'destructive',
      'process_refund': 'secondary'
    };

    return (
      <Badge variant={actionColors[action] || 'outline'}>
        {action.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDetails = (action: string, details: any) => {
    switch (action) {
      case 'ban_user':
        return `Banned user ${details.userId} for ${details.duration || 'permanent'}. Reason: ${details.reason}`;
      case 'unban_user':
        return `Unbanned user ${details.userId}`;
      case 'reset_password':
        return `Reset password for user ${details.userId}`;
      case 'change_role':
        return `Changed role for user ${details.userId} from ${details.oldRole} to ${details.newRole}. Reason: ${details.reason}`;
      case 'freeze_nft':
        return `Froze NFT ${details.nftId}. Reason: ${details.reason}`;
      case 'unfreeze_nft':
        return `Unfroze NFT ${details.nftId}`;
      case 'edit_nft':
        return `Edited NFT ${details.nftId}`;
      case 'burn_nft':
        return `Burned NFT ${details.nftId}. Reason: ${details.reason}`;
      case 'process_refund':
        return `Processed refund of ₹${details.amount} for payment ${details.paymentId}. Reason: ${details.reason}`;
      default:
        return JSON.stringify(details);
    }
  };

  const filteredLogs = auditLogs?.logs?.filter((log: AuditLog) =>
    formatDetails(log.action, log.details).toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <Loading size="lg" text="Loading audit logs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track all administrative actions and changes
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Logs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search in log details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="action-filter">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="ban_user">Ban User</SelectItem>
                  <SelectItem value="unban_user">Unban User</SelectItem>
                  <SelectItem value="reset_password">Reset Password</SelectItem>
                  <SelectItem value="change_role">Change Role</SelectItem>
                  <SelectItem value="freeze_nft">Freeze NFT</SelectItem>
                  <SelectItem value="unfreeze_nft">Unfreeze NFT</SelectItem>
                  <SelectItem value="edit_nft">Edit NFT</SelectItem>
                  <SelectItem value="burn_nft">Burn NFT</SelectItem>
                  <SelectItem value="process_refund">Process Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="admin-filter">Admin</Label>
              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Admins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {/* This would be populated with actual admin users */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-4">
        {filteredLogs.map((log: AuditLog) => (
          <Card key={log._id}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-muted rounded-full">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getActionBadge(log.action)}
                    <span className="text-sm text-muted-foreground">
                      Admin ID: {log.adminId}
                    </span>
                  </div>
                  <p className="text-sm mb-2">
                    {formatDetails(log.action, log.details)}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    {log.ip && (
                      <div className="flex items-center space-x-1">
                        <Shield className="w-3 h-3" />
                        <span>IP: {log.ip}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Audit Logs Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || actionFilter !== 'all' || adminFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No administrative actions have been logged yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
