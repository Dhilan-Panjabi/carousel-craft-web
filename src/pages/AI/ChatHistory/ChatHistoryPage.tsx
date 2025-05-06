import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getConversations, Conversation, checkConversationExists } from "@/integrations/ai/chatService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ChatHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        // Get all conversations (limit 100)
        const data = await getConversations(100);
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  const handleNewChat = () => {
    navigate('/ai');
  };

  const handleOpenChat = async (conversationId: string) => {
    // Prevent multiple clicks while checking
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      // Check if the conversation exists and is accessible to the user
      const exists = await checkConversationExists(conversationId);
      
      if (exists) {
        navigate(`/ai/${conversationId}`);
      } else {
        toast.error("This conversation is no longer available");
        
        // Refresh the list of conversations
        const data = await getConversations(100);
        setConversations(data);
      }
    } catch (error) {
      console.error("Error checking conversation:", error);
      toast.error("Could not open this conversation");
    } finally {
      setIsNavigating(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Chat History</h1>
        <Button 
          onClick={handleNewChat}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin mr-2">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
          <p>Loading your chat history...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No chat history found</h2>
          <p className="text-gray-500 mb-6">Start a new chat to get some help or creative ideas!</p>
          <Button 
            onClick={handleNewChat} 
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Start New Chat
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="truncate text-lg">{conversation.title}</CardTitle>
                <CardDescription className="flex items-center text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(conversation.updated_at)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-3 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => handleOpenChat(conversation.id)}
                  variant="default"
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={isNavigating}
                >
                  {isNavigating ? "Loading..." : "Continue Chat"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 