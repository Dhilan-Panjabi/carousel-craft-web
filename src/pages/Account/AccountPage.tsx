
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings updated",
      description: "Your account settings have been saved"
    });
  };

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your account details
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue="John Doe" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" disabled />
                <p className="text-xs text-muted-foreground">
                  To change your email, please contact support
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </CardFooter>
          </form>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API credentials for programmatic access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <Input 
                  id="apiKey" 
                  type="password" 
                  value="sk_live_****************************************"
                  readOnly 
                />
                <Button variant="outline" onClick={() => {
                  toast({
                    title: "API key copied",
                    description: "Your API key has been copied to clipboard"
                  });
                }}>
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This key provides full access to your account. Keep it secure!
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="destructive">Revoke Key</Button>
            <Button variant="outline">Generate New Key</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be certain.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={() => {
              toast({
                title: "Account deletion",
                description: "Please contact support to delete your account",
                variant: "destructive"
              });
            }}>
              Delete Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
