import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Mail, User as UserIcon, Shield, Ban, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { usePOS } from '@/contexts/POSContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// User form validation schema
const userSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .refine((val) => val.trim().length > 0, 'Full name cannot be empty or whitespace only')
    .refine((val) => val.trim().length <= 100, 'Full name must be less than 100 characters'),
  email: z.string()
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .refine((val) => val.trim().length > 0, 'Email cannot be empty or whitespace only')
    .refine((val) => {
      // Validate email format after trimming and lowercasing
      const trimmedEmail = val.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(trimmedEmail);
    }, 'Invalid email address format'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters')
    .refine((val) => !val.includes('<script') && !val.includes('javascript:'), {
      message: 'Invalid password format',
    }),
  role: z.enum(['Admin', 'Stock-Keeper', 'Sales Representative'], {
    required_error: 'Role is required',
  }),
});

type UserFormData = z.infer<typeof userSchema>;

interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  roles?: Array<{ name: string; permissionKeys: string[] }>;
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const { user } = usePOS();
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user is Super Admin (has "*" permission)
  const isSuperAdmin = user?.permissions?.includes('*') || false;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'Stock-Keeper',
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/v1/user');
      const backendUsers: BackendUser[] = response.data.users || [];
      setUsers(backendUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
      toast.error(errorMessage);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/api/v1/user', {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: data.role,
      });

      toast.success(response.data.message || 'User created successfully');
      setIsCreateDialogOpen(false);
      form.reset();
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    try {
      const response = await api.patch(`/api/v1/user/${userId}/suspend`);
      toast.success(response.data.message || 'User suspended successfully');
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error suspending user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to suspend user';
      toast.error(errorMessage);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      const response = await api.patch(`/api/v1/user/${userId}/unsuspend`);
      toast.success(response.data.message || 'User unsuspended successfully');
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error unsuspending user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to unsuspend user';
      toast.error(errorMessage);
    }
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleDisplay = (user: BackendUser): string => {
    if (user.role) return user.role;
    if (user.roles && user.roles.length > 0) {
      return user.roles[0].name;
    }
    return 'N/A';
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Users</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Manage system users and permissions
            </p>
          </div>
          {isSuperAdmin && (
            <Button 
              className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New User
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        )}

        {/* Table - Desktop */}
        {!isLoading && (
          <div className="glass-card rounded-xl overflow-hidden hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">
                              {user.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.fullName}</p>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-48">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs sm:text-sm">{getRoleDisplay(user)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-success/10 text-success'
                              : user.status === 'suspended'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {user.status === 'active' && <CheckCircle className="h-3 w-3" />}
                          {user.status === 'suspended' && <Ban className="h-3 w-3" />}
                          {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.status === 'suspended' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleUnsuspend(user.id)}
                            >
                              Unsuspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:text-destructive"
                              onClick={() => handleSuspend(user.id)}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mobile/Tablet Cards */}
        {!isLoading && (
          <div className="lg:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-semibold">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{user.fullName}</p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{getRoleDisplay(user)}</span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-success/10 text-success'
                            : user.status === 'suspended'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {user.status === 'active' && <CheckCircle className="h-3 w-3" />}
                        {user.status === 'suspended' && <Ban className="h-3 w-3" />}
                        {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    {user.status === 'suspended' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleUnsuspend(user.id)}
                      >
                        Unsuspend
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs text-destructive hover:text-destructive"
                        onClick={() => handleSuspend(user.id)}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          className="pl-4"
                          placeholder="Enter full name"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          className="pl-4"
                          placeholder="Enter email address"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="pl-4"
                          placeholder="Enter password (min 6 characters)"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="pl-4">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Stock-Keeper">Stock-Keeper</SelectItem>
                          <SelectItem value="Sales Representative">Sales Representative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      form.reset();
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
