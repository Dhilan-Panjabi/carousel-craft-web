import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileImage,
  Clock,
  Share2,
  User,
  Search,
  Home,
  Images,
  ChevronDown,
  MessageSquare,
  Plus,
  History,
  Loader2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getConversations, Conversation, checkConversationExists } from "@/integrations/ai/chatService";
import { toast } from "sonner";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch chat conversation history
  useEffect(() => {
    const loadConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const data = await getConversations(5); // Get 5 most recent conversations
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, []);

  const handleNewChat = () => {
    navigate('/ai');
  };

  const handleOpenChat = async (conversationId: string) => {
    // Prevent multiple clicks
    if (navigatingTo === conversationId) return;
    
    setNavigatingTo(conversationId);
    
    try {
      // Check if the conversation exists
      const exists = await checkConversationExists(conversationId);
      
      if (exists) {
        navigate(`/ai/${conversationId}`);
      } else {
        toast.error("This conversation is no longer available");
        // Refresh the conversations list
        const data = await getConversations(5);
        setConversations(data);
      }
    } catch (error) {
      console.error("Error opening conversation:", error);
      toast.error("Could not open this conversation");
    } finally {
      setNavigatingTo(null);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center px-4 py-2">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-semibold transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
            <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
            <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
            <line x1="14.83" y1="9.17" x2="18.36" y2="5.64" />
            <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
          </svg>
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
          {/* AI Chat with Dropdown */}
          <SidebarMenuItem>
            <div className="flex w-full">
              <NavLink to="/ai" className="flex-1">
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip="Generate with AI"
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-blue-500 font-medium mr-1"
                  >
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <span>Generate with AI</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Chat History</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleNewChat} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>New Chat</span>
                  </DropdownMenuItem>
                  
                  {conversations.length > 0 ? (
                    <DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      {conversations.map((conversation) => (
                        <DropdownMenuItem 
                          key={conversation.id} 
                          onClick={() => handleOpenChat(conversation.id)}
                          className="cursor-pointer"
                          disabled={navigatingTo === conversation.id}
                        >
                          {navigatingTo === conversation.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <MessageSquare className="mr-2 h-4 w-4" />
                          )}
                          <span className="truncate">{conversation.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  ) : isLoadingConversations ? (
                    <DropdownMenuItem disabled>
                      <span className="text-muted-foreground">Loading...</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      <span className="text-muted-foreground">No recent chats</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/ai/history')} className="cursor-pointer">
                    <History className="mr-2 h-4 w-4" />
                    <span>View All Chats</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuItem>
          
          <SidebarMenuItem className="mt-6">
            <div className="h-px w-full bg-gray-200 dark:bg-gray-800 my-2"></div>
          </SidebarMenuItem>
          
          {/* Regular navigation items */}
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <NavLink to={item.path}>
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  >
                    {React.createElement(item.icon, { className: "h-5 w-5" })}
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
