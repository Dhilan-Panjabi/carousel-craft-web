import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, LoaderCircle, SendIcon, Bot, Code, Book, Sparkles, Search, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  sendChatMessage, 
  generateImages, 
  Message as AIMessage, 
  createConversation,
  saveMessage,
  generateConversationTitle,
  getConversationMessages,
  checkConversationExists
} from "@/integrations/ai/chatService";
import { useParams, useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function GenerateWithAIPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  
  // State for active conversation
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId || null);
  
  // State for mode selection (chat or image generation)
  const [mode, setMode] = useState<"chat" | "image">("chat");
  
  // Image generation state
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Sample questions
  const sampleQuestions = [
    "How does AI work?",
    "Create an ad for a coffee shop",
    "How can I improve my social media presence?",
    "What is the best strategy for lead generation?"
  ];

  // Check if conversation exists when first loading with a conversationId
  useEffect(() => {
    const validateConversation = async () => {
      if (conversationId) {
        setIsLoadingHistory(true);
        try {
          const exists = await checkConversationExists(conversationId);
          if (exists) {
            loadConversationMessages(conversationId);
          } else {
            console.error("Conversation does not exist:", conversationId);
            setLoadError("This conversation could not be found or you don't have permission to view it.");
            // Don't navigate away immediately, just show the error
            setShowWelcome(false);
            toast.error("Conversation not found");
          }
        } catch (error) {
          console.error("Error validating conversation:", error);
          setLoadError("Error checking conversation access");
          // Don't navigate away immediately, just show the error
          setShowWelcome(false);
          toast.error("Error accessing conversation");
        } finally {
          setIsLoadingHistory(false);
        }
      } else {
        // No conversationId means we're starting a new chat
        setShowWelcome(true);
        setMessages([]);
        setActiveConversationId(null);
        setLoadError(null);
      }
    };

    validateConversation();
  }, [conversationId, navigate]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, [input]);
  
  // Load messages for a specific conversation
  const loadConversationMessages = async (convId: string) => {
    setIsLoadingHistory(true);
    setLoadError(null);
    
    try {
      const messages = await getConversationMessages(convId);
      
      // Always set the active conversation ID, even if no messages yet
      setActiveConversationId(convId);
      
      if (messages && messages.length > 0) {
        // If we have messages, display them and hide welcome screen
        setMessages(messages as Message[]);
        setShowWelcome(false);
      } else {
        // Handle case where conversation exists but has no messages
        console.log("Conversation exists but has no messages");
        // Empty conversation but still valid - show empty chat, not welcome
        setMessages([]);
        setShowWelcome(false);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      setLoadError("This conversation could not be loaded. It may have been deleted or you don't have permission to view it.");
      setShowWelcome(true);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Call the image generation service
      const imageUrls = await generateImages(prompt);
      setGeneratedImages(imageUrls);
      
      toast.success("Images generated successfully!");
    } catch (error) {
      console.error("Error generating images:", error);
      toast.error("Failed to generate images");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (inputText = input) => {
    if (!inputText.trim()) return;
    
    // Hide welcome screen when first message is sent
    setShowWelcome(false);
    
    // Add user message to chat immediately for better UX
    const userMessage = { role: "user" as const, content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
    }
    
    setIsProcessing(true);
    
    // Create a new conversation if this is the first message and no conversation is active
    if (!activeConversationId) {
      try {
        const title = generateConversationTitle(inputText);
        console.log("Creating new conversation with title:", title);
        const newConversation = await createConversation(title);
        console.log("New conversation created:", newConversation);
        setActiveConversationId(newConversation.id);
        
        // Update the URL with the new conversation ID *without* replace: true
        // This way we maintain proper history stack
        navigate(`/ai/${newConversation.id}`);
        
        // Save the user message now that we have a conversation ID
        await saveMessage(newConversation.id, userMessage);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        toast.error("Authentication required. Please log in to save conversations.");
        // Continue with the chat without saving
      }
    } else {
      // Save the user message to the database if we have an active conversation
      try {
        await saveMessage(activeConversationId, userMessage);
      } catch (error) {
        console.error("Failed to save message:", error);
        toast.error("Failed to save message");
        // Continue with the chat without saving
      }
    }
    
    try {
      // Convert messages to the format expected by the API
      const apiMessages: AIMessage[] = messages.map(message => ({
        role: message.role,
        content: message.content,
      }));
      
      // Add the current user message
      apiMessages.push({
        role: 'user',
        content: inputText,
      });
      
      console.log("Sending messages to AI:", apiMessages);
      
      // Call the chat service
      const response = await sendChatMessage(apiMessages);
      
      console.log("AI response received:", response);
      
      // Process and render the response
      if (response.message?.content) {
        // Create assistant message
        const assistantMessage = { 
          role: "assistant" as const, 
          content: response.message.content 
        };
        
        // Add AI response to chat
        setMessages(prev => [...prev, assistantMessage]);
        
        // Save the assistant message to the database
        if (activeConversationId) {
          try {
            await saveMessage(activeConversationId, assistantMessage);
          } catch (saveError) {
            console.error("Failed to save assistant message:", saveError);
            toast.error("Failed to save AI response");
            // Continue with the chat without saving
          }
        }
      } else if (response.message?.tool_calls) {
        // If the model decided to use tools, show a processing message
        const processingMessage = { 
          role: "assistant" as const, 
          content: "I'm searching the web for information to help answer your question..." 
        };
        
        setMessages(prev => [...prev, processingMessage]);
      }
    } catch (error) {
      console.error("Error in chat API call:", error);
      toast.error("Failed to get response from AI");
      
      // Add a fallback message
      const errorMessage = { 
        role: "assistant" as const, 
        content: "I'm sorry, but I encountered an error processing your request. Please try again later." 
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Save the error message to the database
      if (activeConversationId) {
        try {
          await saveMessage(activeConversationId, errorMessage);
        } catch (saveError) {
          console.error("Failed to save error message:", saveError);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === "chat") {
        handleSendMessage();
      } else {
        handleGenerate();
      }
    }
  };

  const handleSampleQuestion = (question: string) => {
    setInput(question);
    handleSendMessage(question);
  };
  
  // Helper function to extract search keywords
  const extractSearchKeywords = (text: string): string => {
    // Only use search for non-trivial queries
    if (text.length < 10) return "";
    
    // Check if message appears to be a question or search request
    const isQuestion = /^(what|how|why|when|where|who|can you|could you|tell me|search for|find|lookup)/i.test(text.trim());
    
    // Extract potential search terms
    // Focus on nouns and key phrases which are more likely to be search terms
    const keywords = text
      .replace(/[.,?!;:()"']/g, ' ')  // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !commonWords.has(word.toLowerCase())
      );
    
    // For questions or explicit search requests, return the processed query
    if (isQuestion || text.toLowerCase().includes("search")) {
      return keywords.join(' ');
    }
    
    // For other messages, only return search terms if we have enough meaningful keywords
    return keywords.length >= 3 ? keywords.join(' ') : "";
  };

  // List of common stop words to filter out
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'of', 'for', 'in', 'on', 'at', 'to', 'this', 'that', 'these', 'those',
    'with', 'about', 'from', 'into', 'during', 'until', 'against', 'among',
    'throughout', 'despite', 'towards', 'upon', 'concerning', 'been', 'have',
    'has', 'had', 'could', 'should', 'would', 'may', 'might', 'must', 'can',
    'will', 'shall', 'being', 'doing', 'does', 'did', 'done', 'there', 'their',
    'they', 'them', 'then', 'than', 'some', 'such', 'what', 'when', 'where',
    'which', 'who', 'whom', 'whose', 'how', 'why'
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === "chat" ? (
          <>
            <ScrollArea className="flex-1 p-4">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center h-full">
                  <LoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2">Loading conversation...</span>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
                  <h2 className="text-2xl font-semibold mb-4 text-red-500">Error Loading Conversation</h2>
                  <p className="mb-6">{loadError}</p>
                  <Button 
                    onClick={() => {
                      setLoadError(null);
                      navigate("/ai");
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Start New Chat
                  </Button>
                </div>
              ) : showWelcome ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <h2 className="text-3xl font-semibold mb-8">How can I help you?</h2>
                  
                  <div className="flex flex-wrap justify-center gap-4 mb-10">
                    <Button variant="outline" className="border-blue-200">
                      <Sparkles className="mr-2 h-4 w-4 text-blue-500" />
                      Create
                    </Button>
                    <Button variant="outline" className="border-blue-200">
                      <Search className="mr-2 h-4 w-4 text-blue-500" />
                      Explore
                    </Button>
                    <Button variant="outline" className="border-blue-200">
                      <Code className="mr-2 h-4 w-4 text-blue-500" />
                      Code
                    </Button>
                    <Button variant="outline" className="border-blue-200">
                      <Book className="mr-2 h-4 w-4 text-blue-500" />
                      Learn
                    </Button>
                  </div>
                  
                  <div className="flex flex-col w-full max-w-lg gap-2">
                    {sampleQuestions.map((question, index) => (
                      <Button 
                        key={index}
                        variant="ghost" 
                        className="justify-start hover:bg-blue-50"
                        onClick={() => handleSampleQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {messages.map((message, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <Avatar>
                          <div className={`flex h-full w-full items-center justify-center rounded-full ${
                            message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {message.role === 'user' ? 'U' : <Bot className="h-4 w-4" />}
                          </div>
                        </Avatar>
                        <div className={`rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-muted'
                        }`}>
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <Avatar>
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-100 text-blue-800">
                            <Bot className="h-4 w-4" />
                          </div>
                        </Avatar>
                        <div className="rounded-lg p-3 bg-muted flex items-center">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            <div className="p-4 flex-1 overflow-auto">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>AI Image Generator</CardTitle>
                  <CardDescription>
                    Enter a description of the images you want to create
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe what you want to see in your generated images..."
                    className="min-h-32 mb-4"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Generate Images
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              {generatedImages.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Generated Images</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {generatedImages.map((imageUrl, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="relative aspect-video">
                          <img 
                            src={imageUrl} 
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardFooter className="p-2">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => window.open(imageUrl, '_blank')}
                          >
                            Open Full Size
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Fixed input bar at bottom */}
      <div className="border-t p-4 bg-background">
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                {mode === "chat" ? <Bot className="h-5 w-5 text-blue-500" /> : <ImageIcon className="h-5 w-5 text-blue-500" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setMode("chat")} className="flex items-center gap-2">
                <Bot className="h-4 w-4" /> Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("image")} className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Image Generation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Textarea
            ref={textAreaRef}
            placeholder={mode === "chat" ? "Type a message..." : "Describe the image you want to generate..."}
            value={mode === "chat" ? input : prompt}
            onChange={(e) => mode === "chat" ? setInput(e.target.value) : setPrompt(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 min-h-10 max-h-[200px] resize-none overflow-y-auto"
            rows={1}
          />

          <Button 
            onClick={() => mode === "chat" ? handleSendMessage() : handleGenerate()} 
            size="icon"
            disabled={(mode === "chat" && (isProcessing || !input.trim())) || 
                     (mode === "image" && (isGenerating || !prompt.trim()))}
            className="bg-blue-500 hover:bg-blue-600 text-white h-10 w-10"
          >
            {mode === "chat" ? (
              isProcessing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />
            ) : (
              isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 