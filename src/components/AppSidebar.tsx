import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileImage,
  Clock,
  Share2,
  User,
  Search,
  Home,
  Images,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  SidebarInput,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Templates",
    icon: FileImage,
    path: "/templates",
  },
  {
    title: "Jobs",
    icon: Clock,
    path: "/jobs",
  },
  {
    title: "Generate",
    icon: Share2,
    path: "/generate",
  },
  {
    title: "Library",
    icon: Images,
    path: "/library",
  },
  {
    title: "Account",
    icon: User,
    path: "/account",
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center px-4 py-2">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-semibold transition-opacity"
        >
          <Home className="h-5 w-5 shrink-0" />
          <span className="text-xl font-bold brand-gradient group-data-[state=collapsed]:hidden">
            Carousel Gen
          </span>
        </NavLink>
        <SidebarTrigger className="ml-auto" />
      </SidebarHeader>
      
      {/* Search input - only visible when expanded */}
      <div className="px-4 pb-4 group-data-[state=collapsed]:hidden">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <SidebarInput
            type="search"
            placeholder="Search..."
            className="w-full pl-8"
          />
        </div>
      </div>
      
      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <NavLink to={item.path}>
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-4 py-2 group-data-[state=collapsed]:justify-center">
          <span className="text-xs text-muted-foreground group-data-[state=collapsed]:hidden">
            v1.0.0
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
