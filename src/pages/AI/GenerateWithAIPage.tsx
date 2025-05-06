import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, LoaderCircle, SendIcon, Bot, Code, Book, Sparkles, Search, ChevronDown } from "lucide-react";
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

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function GenerateWithAIPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Sample questions
  const sampleQuestions = [
    "How does AI work?",
    "Create an ad for a coffee shop",
    "How can I improve my social media presence?",
    "What is the best strategy for lead generation?"
  ];

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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }

    setIsGenerating(true);
    
    try {
      // This is a placeholder for actual AI image generation API integration
      // In a real implementation, you would call your AI service here
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, we'll use placeholder images
      setGeneratedImages([
        "https://placehold.co/600x400/blue/white?text=AI+Generated+Image+1",
        "https://placehold.co/600x400/blue/white?text=AI+Generated+Image+2",
        "https://placehold.co/600x400/blue/white?text=AI+Generated+Image+3"
      ]);
      
      toast.success("Images generated successfully!");
    } catch (error) {
      toast.error("Failed to generate images");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (inputText = input) => {
    if (!inputText.trim()) return;
    
    // Hide welcome screen when first message is sent
    setShowWelcome(false);
    
    // Add user message to chat
    const userMessage = { role: "user" as const, content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
    }
    
    setIsProcessing(true);
    
    try {
      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate different responses based on message content
      let responseContent = "";
      
      if (inputText.toLowerCase().includes("ad") || inputText.toLowerCase().includes("creative")) {
        responseContent = "I can help create ad creatives! Would you like me to generate some image ideas or help with ad copy?";
      } else if (inputText.toLowerCase().includes("hello") || inputText.toLowerCase().includes("hi")) {
        responseContent = "Hello! How can I assist you with your marketing or creative needs today?";
      } else if (inputText.toLowerCase().includes("ai work") || inputText.toLowerCase().includes("how does ai")) {
        responseContent = "AI systems like me work by using machine learning models trained on vast amounts of data. I analyze patterns in the data I was trained on to generate responses that are contextually relevant to your questions.";
      } else {
        responseContent = "I'm your AI assistant for marketing and creative tasks. I can help with ad ideas, copy suggestions, or answer questions about marketing strategies.";
      }
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: "assistant", content: responseContent }]);
    } catch (error) {
      toast.error("Failed to get response");
      console.error(error);
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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-hidden flex flex-col">
        {mode === "chat" ? (
          <>
            <ScrollArea className="flex-1 p-4">
              {showWelcome ? (
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