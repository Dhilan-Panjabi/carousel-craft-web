
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserRound, Mail, Key } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/supabase/AuthProvider';
import { toast } from 'sonner';
import supabase from '@/supabase/supabaseClient';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const formSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters.').max(50).optional(),
});

export default function AccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      username: '',
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
          return;
        }

        setProfile(data);

        // Update form values
        form.reset({
          full_name: data.full_name || '',
          username: data.username || '',
        });
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setUpdateLoading(true);

      if (!user) {
        toast.error('You must be logged in to update your profile');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          username: values.username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return;
      }

      // Update profile state
      setProfile(prev => 
        prev ? { ...prev, full_name: values.full_name, username: values.username || null } : null
      );

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUpdateLoading(false);
    }
  }

  const getInitials = () => {
    if (!profile?.full_name) return 'U';
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account details and preferences
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4 text-center">
              <Avatar className="h-24 w-24">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile?.full_name || 'User'} />
                ) : (
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {profile?.full_name || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account details here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Your full name" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
                            <Input className="pl-9" placeholder="username" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel className="text-base">Email</FormLabel>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        disabled 
                        value={user?.email || ''} 
                        className="pl-9 bg-muted" 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <Button type="submit" disabled={updateLoading}>
                    {updateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="text-base font-medium mb-2 flex items-center">
                  <Key className="mr-2 h-4 w-4" />
                  Password
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Reset your password to keep your account secure
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/auth?mode=reset-password'}
                >
                  Change Password
                </Button>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-base font-medium mb-2 text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
