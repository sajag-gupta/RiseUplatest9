import { useState } from "react";
import { Plus, Edit, Trash2, Search, Calendar, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Loading from "@/components/common/loading";

interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  userUsageLimit?: number;
  validFrom: string;
  validUntil: string;
  applicableCategories?: string[];
  applicableProducts?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export default function AdminPromoManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE" as 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING',
    discountValue: 0,
    minimumOrderAmount: 0,
    maximumDiscount: 0,
    usageLimit: 0,
    userUsageLimit: 0,
    validFrom: "",
    validUntil: "",
    applicableCategories: [] as string[],
    isActive: true
  });

  const queryClient = useQueryClient();

  // Fetch promo codes
  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/promo-codes"],
    staleTime: 30 * 1000
  });

  // Create promo code mutation
  const createPromoMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to create promo code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: "Success",
        description: "Promo code created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create promo code",
        variant: "destructive"
      });
    }
  });

  // Update promo code mutation
  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Failed to update promo code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: "Success",
        description: "Promo code updated successfully"
      });
      setEditingPromo(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update promo code",
        variant: "destructive"
      });
    }
  });

  // Delete promo code mutation
  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ruc_auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete promo code");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      toast({
        title: "Success",
        description: "Promo code deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "PERCENTAGE",
      discountValue: 0,
      minimumOrderAmount: 0,
      maximumDiscount: 0,
      usageLimit: 0,
      userUsageLimit: 0,
      validFrom: "",
      validUntil: "",
      applicableCategories: [],
      isActive: true
    });
  };

  const handleCreate = () => {
    createPromoMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (editingPromo) {
      updatePromoMutation.mutate({ id: editingPromo._id, data: formData });
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minimumOrderAmount: promo.minimumOrderAmount || 0,
      maximumDiscount: promo.maximumDiscount || 0,
      usageLimit: promo.usageLimit || 0,
      userUsageLimit: promo.userUsageLimit || 0,
      validFrom: formatDateForInput(promo.validFrom),
      validUntil: formatDateForInput(promo.validUntil),
      applicableCategories: promo.applicableCategories || [],
      isActive: promo.isActive
    });
  };

  // Helper function to safely format dates for input fields
  const formatDateForInput = (dateValue: string | Date) => {
    try {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Invalid date format:', dateValue);
      return '';
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this promo code?")) {
      deletePromoMutation.mutate(id);
    }
  };

  const filteredPromoCodes = promoCodes?.filter(promo =>
    promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promo.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" text="Loading promo codes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promo Code Management</h2>
          <p className="text-muted-foreground">Manage discount codes and promotional offers</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Promo Code</DialogTitle>
            </DialogHeader>
            <PromoForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreate}
              isLoading={createPromoMutation.isPending}
              submitLabel="Create Promo Code"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search promo codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Promo Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPromoCodes.map((promo) => (
          <Card key={promo._id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{promo.code}</CardTitle>
                <Badge variant={promo.isActive ? "default" : "secondary"}>
                  {promo.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{promo.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium">
                  {promo.discountType === 'PERCENTAGE'
                    ? `${promo.discountValue}%`
                    : `₹${promo.discountValue}`
                  }
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Min Purchase:</span>
                <span>₹{promo.minimumOrderAmount || 0}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage:</span>
                <span>
                  {promo.usageCount}
                  {promo.usageLimit ? `/${promo.usageLimit}` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valid Until:</span>
                <span>{new Date(promo.validUntil).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(promo)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(promo._id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPromoCodes.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No promo codes found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Create your first promo code to get started"}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPromo} onOpenChange={() => setEditingPromo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
          </DialogHeader>
          <PromoForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdate}
            isLoading={updatePromoMutation.isPending}
            submitLabel="Update Promo Code"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PromoFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}

function PromoForm({ formData, setFormData, onSubmit, isLoading, submitLabel }: PromoFormProps) {
  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Promo Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="SUMMER2024"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountType">Discount Type *</Label>
          <Select
            value={formData.discountType}
            onValueChange={(value: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING') =>
              setFormData({ ...formData, discountType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Discount Value */}
      <div className="space-y-2">
        <Label htmlFor="discountValue">
          Discount Value * {formData.discountType === 'PERCENTAGE' ? '(%)' : formData.discountType === 'FIXED' ? '(₹)' : ''}
        </Label>
        <Input
          id="discountValue"
          type="number"
          value={formData.discountValue}
          onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
          min="0"
          max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
          placeholder={formData.discountType === 'PERCENTAGE' ? "10" : formData.discountType === 'FIXED' ? "100" : ""}
        />
      </div>

      {/* Validity Period */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validFrom">Valid From *</Label>
          <Input
            id="validFrom"
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">Valid Until *</Label>
          <Input
            id="validUntil"
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            min={formData.validFrom || new Date().toISOString().split('T')[0]}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Summer Sale Discount"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFormData({
              code: "",
              description: "",
              discountType: "PERCENTAGE",
              discountValue: 0,
              minimumOrderAmount: 0,
              maximumDiscount: 0,
              usageLimit: 0,
              userUsageLimit: 0,
              validFrom: "",
              validUntil: "",
              applicableCategories: [],
              isActive: true
            });
          }}
        >
          Reset
        </Button>
        <Button onClick={onSubmit} disabled={isLoading || !formData.code || !formData.discountValue}>
          {isLoading ? "Creating..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
