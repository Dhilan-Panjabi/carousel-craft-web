import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { AdAsset } from "@/integrations/ai/adAssetsService";
import { Checkbox } from "@/components/ui/checkbox";
import { AdAssetExport } from "@/integrations/google/driveService";

interface AdAssetsEditorProps {
  hooks: AdAsset[];
  headlines: AdAsset[];
  scripts: AdAsset[];
  isLoading: boolean;
  onRegenerateClick?: () => void;
  onExportSelected?: (selectedAssets: AdAssetExport[]) => void;
}

export function AdAssetsEditor({
  hooks,
  headlines,
  scripts,
  isLoading,
  onRegenerateClick,
  onExportSelected
}: AdAssetsEditorProps) {
  const [editedHooks, setEditedHooks] = useState<Record<string, string>>({});
  const [editedHeadlines, setEditedHeadlines] = useState<Record<string, string>>({});
  const [editedScripts, setEditedScripts] = useState<Record<string, string>>({});
  const [selectedAssets, setSelectedAssets] = useState<Record<string, boolean>>({});

  // Initialize selected assets when the component loads with new assets
  useEffect(() => {
    // Create a new record to avoid mutations
    const newSelectedAssets = { ...selectedAssets };
    
    // Add newly added asset IDs with a default of false (unselected)
    [...hooks, ...headlines, ...scripts].forEach(asset => {
      if (newSelectedAssets[asset.id] === undefined) {
        newSelectedAssets[asset.id] = false;
      }
    });
    
    // Update state only if there are changes
    if (Object.keys(newSelectedAssets).length !== Object.keys(selectedAssets).length) {
      setSelectedAssets(newSelectedAssets);
    }
  }, [hooks, headlines, scripts]);

  // Prepare all assets as AdAssetExport objects and call export function when selection changes
  useEffect(() => {
    if (onExportSelected) {
      const allAssets = prepareAssetsForExport();
      onExportSelected(allAssets);
    }
  }, [selectedAssets, editedHooks, editedHeadlines, editedScripts]);

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

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    setSelectedAssets(prev => ({
      ...prev,
      [assetId]: checked
    }));
  };

  const prepareAssetsForExport = (): AdAssetExport[] => {
    // Combine all assets with their edited texts and selected status
    return [
      ...hooks.map(asset => ({
        id: asset.id,
        text: getAssetText(asset, editedHooks),
        type: asset.type,
        selected: !!selectedAssets[asset.id]
      })),
      ...headlines.map(asset => ({
        id: asset.id,
        text: getAssetText(asset, editedHeadlines),
        type: asset.type,
        selected: !!selectedAssets[asset.id]
      })),
      ...scripts.map(asset => ({
        id: asset.id,
        text: getAssetText(asset, editedScripts),
        type: asset.type,
        selected: !!selectedAssets[asset.id]
      }))
    ];
  };

  const handleExportSelected = () => {
    if (!onExportSelected) return;
    const allAssets = prepareAssetsForExport();
    onExportSelected(allAssets);
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              // Select all assets in this category
              const updatedSelections = { ...selectedAssets };
              const allSelected = assets.every(asset => selectedAssets[asset.id]);
              
              assets.forEach(asset => {
                updatedSelections[asset.id] = !allSelected;
              });
              
              setSelectedAssets(updatedSelections);
            }}
          >
            {assets.every(asset => selectedAssets[asset.id]) ? "Unselect All" : "Select All"}
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.id} className={`overflow-hidden ${selectedAssets[asset.id] ? 'border-primary' : ''}`}>
              <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`select-${asset.id}`}
                    checked={!!selectedAssets[asset.id]}
                    onCheckedChange={(checked) => handleSelectAsset(asset.id, !!checked)}
                  />
                  <CardTitle className="text-sm font-medium">Variation {asset.id.split('-').pop()}</CardTitle>
                </div>
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
                  className={`min-h-[100px] resize-none ${selectedAssets[asset.id] ? 'border-primary' : ''}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const selectedCount = Object.values(selectedAssets).filter(Boolean).length;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ad Assets</h2>
        <div className="flex gap-2">
          <Button 
            onClick={onRegenerateClick} 
            size="sm" 
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Generating...' : 'Regenerate'}
          </Button>
          {onExportSelected && (
            <Button
              onClick={handleExportSelected}
              size="sm"
              variant="outline"
              disabled={selectedCount === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="hooks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hooks">Hooks ({hooks.length})</TabsTrigger>
          <TabsTrigger value="headlines">Headlines ({headlines.length})</TabsTrigger>
          <TabsTrigger value="scripts">Scripts ({scripts.length})</TabsTrigger>
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