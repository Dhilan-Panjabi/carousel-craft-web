import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdAsset } from "@/integrations/ai/adAssetsService";

interface AdAssetsEditorProps {
  hooks: AdAsset[];
  headlines: AdAsset[];
  scripts: AdAsset[];
  isLoading: boolean;
  onRegenerateClick?: () => void;
}

export function AdAssetsEditor({
  hooks,
  headlines,
  scripts,
  isLoading,
  onRegenerateClick
}: AdAssetsEditorProps) {
  const [editedHooks, setEditedHooks] = useState<Record<string, string>>({});
  const [editedHeadlines, setEditedHeadlines] = useState<Record<string, string>>({});
  const [editedScripts, setEditedScripts] = useState<Record<string, string>>({});
  
  const getAssetText = (asset: AdAsset, editedTexts: Record<string, string>) => {
    return editedTexts[asset.id] !== undefined ? editedTexts[asset.id] : asset.text;
  };
  
  const handleAssetChange = (
    assetId: string, 
    newText: string, 
    setEditedTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    setEditedTexts(prev => ({
      ...prev,
      [assetId]: newText
    }));
  };
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };
  
  const renderAssetCards = (
    assets: AdAsset[],
    editedTexts: Record<string, string>,
    setEditedTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    title: string
  ) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-medium">Variation {asset.id.split('-').pop()}</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCopyToClipboard(getAssetText(asset, editedTexts))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Textarea
                  value={getAssetText(asset, editedTexts)}
                  onChange={(e) => handleAssetChange(asset.id, e.target.value, setEditedTexts)}
                  className="min-h-[100px] resize-none"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ad Assets</h2>
        <Button 
          onClick={onRegenerateClick} 
          size="sm" 
          variant="outline"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Generating...' : 'Regenerate'}
        </Button>
      </div>
      
      <Tabs defaultValue="hooks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="headlines">Headlines</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="hooks" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Generating hooks...</p>
            </div>
          ) : (
            renderAssetCards(hooks, editedHooks, setEditedHooks, "Caption Hooks")
          )}
        </TabsContent>
        
        <TabsContent value="headlines" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Generating headlines...</p>
            </div>
          ) : (
            renderAssetCards(headlines, editedHeadlines, setEditedHeadlines, "Headlines")
          )}
        </TabsContent>
        
        <TabsContent value="scripts" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Generating scripts...</p>
            </div>
          ) : (
            renderAssetCards(scripts, editedScripts, setEditedScripts, "Carousel Scripts")
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 