
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, BarChart3, DollarSign } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to <span className="brand-gradient">Carousel Gen</span>
        </h1>
        <Button 
          onClick={() => navigate("/generate")}
          className="group"
        >
          Create New Carousel
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Templates</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">8</CardTitle>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-600">+2 since last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Jobs</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">12</CardTitle>
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-600">-1 since last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Images Generated</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">845</CardTitle>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-600">+105 since last month</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent carousel generation activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Product Showcase</p>
                  <p className="text-sm text-muted-foreground">24 images • Completed</p>
                </div>
                <p className="text-sm text-muted-foreground">2 hours ago</p>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Summer Sale</p>
                  <p className="text-sm text-muted-foreground">12 images • Processing</p>
                </div>
                <p className="text-sm text-muted-foreground">5 hours ago</p>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Brand Assets</p>
                  <p className="text-sm text-muted-foreground">36 images • Completed</p>
                </div>
                <p className="text-sm text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Access frequently used features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate("/templates")} className="justify-start">
                Browse Templates
              </Button>
              <Button variant="outline" onClick={() => navigate("/jobs")} className="justify-start">
                View Jobs
              </Button>
              <Button variant="outline" onClick={() => navigate("/generate")} className="justify-start">
                Start Generating
              </Button>
              <Button variant="outline" onClick={() => navigate("/account")} className="justify-start">
                Account Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
