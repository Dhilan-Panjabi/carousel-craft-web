
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="container py-8">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Welcome to <span className="brand-gradient">Carousel Gen</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-[700px] mb-8">
          Generate beautiful carousel images at scale. 
          Upload templates, provide data through CSV files, and let our system do the work.
        </p>
        <Button 
          size="lg" 
          onClick={() => navigate("/generate")}
          className="group"
        >
          Create Your First Carousel
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Upload and manage your design templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create professional templates with PNG/SVG files and YAML configuration
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/templates")}>
              Browse Templates
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>
              Monitor your generation jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track status and progress of all your carousel generation jobs
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/jobs")}>
              View Jobs
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Generate</CardTitle>
            <CardDescription>
              Start a new generation job
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload CSVs or scripts, select templates, and generate carousels
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/generate")}>
              Start Generating
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
