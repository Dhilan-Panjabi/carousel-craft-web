import { toast } from "sonner";
import { AdAsset } from "../ai/adAssetsService";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  parents?: string[];
  size?: string;
}

export interface CarouselImageExport {
  url: string;
  name: string;
  index: number;
}

export interface AdAssetExport {
  id: string;
  text: string;
  type: 'hook' | 'headline' | 'script';
  selected: boolean;
}

/**
 * Handles Google OAuth and Drive API integration
 */
class GoogleDriveService {
  private static instance: GoogleDriveService;
  private accessToken: string | null = null;
  private tokenExpiryTime: number | null = null;
  private tokenRefreshAttempt: boolean = false;
  
  // Constants for file types
  private readonly FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
  private readonly IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
  private readonly TEXT_MIME_TYPE = 'text/plain';
  
  private constructor() {
    // This gets called when the class is first instantiated
    this.restoreAuthFromLocalStorage();
  }
  
  /**
   * Restore authentication state from localStorage
   */
  private restoreAuthFromLocalStorage() {
    const savedToken = localStorage.getItem('google_drive_token');
    const savedExpiry = localStorage.getItem('google_drive_token_expiry');
    
    if (savedToken && savedExpiry) {
      const expiryTime = parseInt(savedExpiry);
      // Only restore if token is still valid
      if (expiryTime > Date.now()) {
        this.accessToken = savedToken;
        this.tokenExpiryTime = expiryTime;
      } else {
        // Clear expired tokens
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('google_drive_token_expiry');
      }
    }
  }
  
  /**
   * Singleton pattern to ensure only one instance
   */
  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    } else {
      // Always check localStorage for token updates
      GoogleDriveService.instance.restoreAuthFromLocalStorage();
    }
    return GoogleDriveService.instance;
  }
  
  /**
   * Ensure token is valid before making API requests
   * @returns true if token is valid
   */
  private ensureValidToken(): boolean {
    // First, try to restore from localStorage in case token was updated in another tab
    this.restoreAuthFromLocalStorage();
    
    if (!this.accessToken || !this.tokenExpiryTime) {
      return false;
    }
    
    // Check if token is expired or about to expire (within 5 minutes)
    if (this.tokenExpiryTime < (Date.now() + 5 * 60 * 1000)) {
      // Token is expired or about to expire
      return false;
    }
    
    return true;
  }
  
  /**
   * Initiates Google OAuth flow
   */
  public initiateOAuth(forceConsent: boolean = false): void {
    // Extract the client ID in case it has formatting issues
    let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    // Check if there's a duplication issue (e.g., VITE_GOOGLE_CLIENT_ID=VITE_GOOGLE_CLIENT_ID=actual_id)
    if (clientId && clientId.includes('VITE_GOOGLE_CLIENT_ID=')) {
      // Extract the actual ID part
      const matches = clientId.match(/VITE_GOOGLE_CLIENT_ID=(.+)/);
      if (matches && matches[1]) {
        clientId = matches[1];
      }
    }
    
    // Use the current site's origin instead of hardcoded localhost
    const currentOrigin = window.location.origin;
    // Force using the current origin regardless of environment variable
    const redirectUri = `${currentOrigin}/templates/drive-callback`;
    
    if (!clientId) {
      toast.error("Google Client ID not configured", {
        description: "Please check your environment variables"
      });
      return;
    }
    
    // Don't clear tokens on initiating OAuth
    // Only clear expired tokens in restoreAuthFromLocalStorage
    
    // Display a reminder toast about Google Cloud Console configuration
    toast.info("Connecting to Google Drive", {
      description: "You'll be redirected to Google to authorize access"
    });
    
    // Clear any previous auth completion flag
    localStorage.removeItem('drive_auth_completed');
    localStorage.removeItem('drive_auth_completed_time');
    
    // Save current URL to return after auth
    localStorage.setItem('google_drive_auth_redirect', window.location.href);
    
    // Create and open OAuth URL
    // Updated scope to include drive.file which gives more permissions
    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file");
    
    // Generate a state parameter with timestamp to prevent CSRF attacks and help with redirect loop prevention
    const stateObj = {
      timestamp: Date.now(),
      originPath: window.location.pathname,
      nonce: Math.random().toString(36).substring(2, 15)
    };
    const state = encodeURIComponent(JSON.stringify(stateObj));
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}` +
      `&response_type=token` +
      `&include_granted_scopes=true` +
      `&state=${state}` +
      `&prompt=${forceConsent ? 'consent' : 'select_account'}`;  // Only force consent when needed
    
    // Navigate to auth URL
    window.location.href = authUrl;
  }
  
  /**
   * Handles the OAuth callback
   * @param hash URL hash fragment containing the access token
   * @returns true if successful
   */
  public handleOAuthCallback(hash: string): boolean {
    if (!hash) {
      console.error("No hash provided to handleOAuthCallback");
      return false;
    }
    
    console.log("Processing OAuth callback with hash", hash.substring(0, 20) + "...");
    
    // Extract hash parameters including access_token
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    
    if (!accessToken || !expiresIn) {
      console.error("Missing token or expiry in callback:", { hasToken: !!accessToken, hasExpiry: !!expiresIn });
      return false;
    }
    
    console.log("Received valid token with expiry:", expiresIn);
    
    // Calculate expiry time (reducing by 5 minutes for safety)
    const expirySeconds = parseInt(expiresIn);
    const safeExpirySeconds = Math.max(expirySeconds - 300, 0); // 5 minutes safety buffer
    const tokenExpiryTime = Date.now() + (safeExpirySeconds * 1000);
    
    // Save token with expiry time
    this.accessToken = accessToken;
    this.tokenExpiryTime = tokenExpiryTime;
    
    // Force persistence to localStorage immediately
    try {
      localStorage.setItem('google_drive_token', accessToken);
      localStorage.setItem('google_drive_token_expiry', tokenExpiryTime.toString());
      console.log("Token saved to localStorage successfully. Expires in:", Math.floor(safeExpirySeconds/60), "minutes");
      
      // Verify token was saved
      const savedToken = localStorage.getItem('google_drive_token');
      if (savedToken !== accessToken) {
        console.error("Token verification failed - localStorage didn't save properly");
      }
    } catch (error) {
      console.error("Failed to save token to localStorage:", error);
    }
    
    return true;
  }
  
  /**
   * Check if user is authenticated with Google Drive
   */
  public isAuthenticated(): boolean {
    try {
      console.log("Checking auth status...");
      
      // First check instance variables (for current session)
      if (this.accessToken && this.tokenExpiryTime && this.tokenExpiryTime > Date.now()) {
        console.log("Authenticated via instance token");
        return true;
      }
      
      // If instance variables don't have valid token, try localStorage
      // This helps when page refreshes have happened
      const savedToken = localStorage.getItem('google_drive_token');
      const savedExpiry = localStorage.getItem('google_drive_token_expiry');
      
      if (savedToken && savedExpiry) {
        const expiryTime = parseInt(savedExpiry);
        
        // If savedToken exists and hasn't expired, we're authenticated
        if (expiryTime > Date.now()) {
          console.log("Authenticated via localStorage token, expires in", 
            Math.floor((expiryTime - Date.now()) / 60000), "minutes");
          
          // Restore token to instance
          this.accessToken = savedToken;
          this.tokenExpiryTime = expiryTime;
          return true;
        } else {
          console.error("Token expired, clearing localStorage", {
            expiryTime,
            currentTime: Date.now(),
            diffMinutes: Math.floor((Date.now() - expiryTime) / 60000)
          });
          // Clean up expired tokens
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
        }
      } else {
        console.log("No token found in localStorage");
      }
      
      return false;
    } catch (error) {
      console.error("Error in isAuthenticated:", error);
      return false;
    }
  }
  
  /**
   * Clears authentication
   */
  public logout(): void {
    this.accessToken = null;
    this.tokenExpiryTime = null;
    localStorage.removeItem('google_drive_token');
    localStorage.removeItem('google_drive_token_expiry');
  }
  
  /**
   * List files in Google Drive
   * @param folderId Folder ID to list (use 'root' for root folder)
   * @param searchQuery Optional search query
   * @returns Array of files and folders
   */
  public async listFiles(folderId: string = 'root', searchQuery: string = ''): Promise<GoogleDriveFile[]> {
    // Validate the token before making the API call
    if (!this.ensureValidToken()) {
      console.error("Token validation failed when trying to list files");
      throw new Error("Not authenticated with Google Drive");
    }
    
    let query = searchQuery
      ? `name contains '${searchQuery}'`
      : `'${folderId}' in parents`;
    
    // For root folder, use special query
    if (folderId === 'root' && !searchQuery) {
      query = "'root' in parents";
    }
    
    // Skip trashed files
    query += " and trashed = false";
    
    // Include filtering for common file types
    if (searchQuery) {
      // For search queries, don't restrict to current folder
      // but prioritize images
      query += ` and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`;
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=${encodeURIComponent(query)}` +
        `&fields=files(id,name,mimeType,thumbnailLink,webContentLink,size,parents)` +
        `&pageSize=100`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          console.error("Google Drive token expired or invalid");
          this.accessToken = null;
          this.tokenExpiryTime = null;
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
          throw new Error("Authentication expired. Please reconnect to Google Drive.");
        }
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("Error listing Google Drive files:", error);
      throw error;
    }
  }
  
  /**
   * Lists image files from Google Drive (for backward compatibility)
   */
  public async listImageFiles(): Promise<GoogleDriveFile[]> {
    const files = await this.listFiles();
    return files.filter(file => 
      this.IMAGE_MIME_TYPES.some(type => file.mimeType.startsWith(type))
    );
  }
  
  /**
   * Get folder path information
   * @param folderId The folder ID to get path for
   */
  public async getFolderPath(folderId: string): Promise<{ id: string, name: string }[]> {
    if (folderId === 'root') {
      return [{ id: 'root', name: 'My Drive' }];
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,parents`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to get folder info");
      }
      
      const folder = await response.json();
      const path = [{ id: folder.id, name: folder.name }];
      
      // If folder has parents, recursively get the parent path
      if (folder.parents && folder.parents.length > 0) {
        const parentPath = await this.getFolderPath(folder.parents[0]);
        return [...parentPath, ...path];
      }
      
      return path;
    } catch (error) {
      console.error("Error getting folder path:", error);
      // Return just the current folder if we can't get the path
      return [{ id: folderId, name: "Current Folder" }];
    }
  }
  
  /**
   * Checks if a file is a folder
   */
  public isFolder(file: GoogleDriveFile): boolean {
    return file.mimeType === this.FOLDER_MIME_TYPE;
  }
  
  /**
   * Checks if a file is an image
   */
  public isImage(file: GoogleDriveFile): boolean {
    return this.IMAGE_MIME_TYPES.some(type => file.mimeType.startsWith(type));
  }
  
  /**
   * Downloads a file from Google Drive by ID
   * @param fileId Google Drive file ID
   * @returns File as Blob with proper filename
   */
  public async downloadFile(fileId: string): Promise<{ blob: Blob, fileName: string }> {
    // Validate the token before making the API call
    if (!this.ensureValidToken()) {
      console.error("Token validation failed when trying to download file");
      throw new Error("Not authenticated with Google Drive");
    }
    
    try {
      // First, get the file metadata to retrieve the name
      const metadataResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!metadataResponse.ok) {
        if (metadataResponse.status === 401) {
          // Token expired or invalid
          console.error("Google Drive token expired or invalid");
          this.accessToken = null;
          this.tokenExpiryTime = null;
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
          throw new Error("Authentication expired. Please reconnect to Google Drive.");
        }
        throw new Error(`Failed to get file metadata: ${metadataResponse.status} ${metadataResponse.statusText}`);
      }
      
      const metadata = await metadataResponse.json();
      const fileName = metadata.name;
      
      // Now download the actual file
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!fileResponse.ok) {
        if (fileResponse.status === 401) {
          // Token expired or invalid
          console.error("Google Drive token expired or invalid");
          this.accessToken = null;
          this.tokenExpiryTime = null;
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
          throw new Error("Authentication expired. Please reconnect to Google Drive.");
        }
        throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`);
      }
      
      const blob = await fileResponse.blob();
      return { blob, fileName };
    } catch (error) {
      console.error("Error downloading file from Google Drive:", error);
      throw error;
    }
  }
  
  /**
   * Get a direct download URL for a file
   * @param fileId Google Drive file ID
   * @returns Direct download URL
   */
  public getDirectDownloadUrl(fileId: string): string {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated with Google Drive");
    }
    
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${this.accessToken}`;
  }
  
  /**
   * Creates a folder in Google Drive
   * @param folderName Name of the folder to create
   * @param parentFolderId Optional parent folder ID
   * @returns The created folder's ID
   */
  public async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated with Google Drive");
    }
    
    try {
      const metadata = {
        name: folderName,
        mimeType: this.FOLDER_MIME_TYPE,
        parents: parentFolderId ? [parentFolderId] : undefined
      };
      
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create folder");
      }
      
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder in Google Drive", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  
  /**
   * Uploads a file to Google Drive
   * @param file The file to upload (Blob or File)
   * @param fileName Name to give the file in Drive
   * @param folderId Optional folder ID to place the file in
   * @returns The uploaded file's ID
   */
  public async uploadFile(file: Blob | File, fileName: string, folderId?: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated with Google Drive");
    }
    
    try {
      // First create the file metadata
      const metadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      };
      
      // Create the multipart request
      const boundary = 'carousel_gen_boundary';
      const delimiter = `--${boundary}`;
      const closeDelimiter = `--${boundary}--`;
      
      // Build the multipart body
      let requestBody = '';
      
      // Add the metadata part
      requestBody += delimiter + '\r\n';
      requestBody += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
      requestBody += JSON.stringify(metadata) + '\r\n';
      
      // Add the file part
      requestBody += delimiter + '\r\n';
      requestBody += `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
      
      // Convert the text to ArrayBuffer
      const requestBodyStart = new TextEncoder().encode(requestBody);
      const requestBodyEnd = new TextEncoder().encode('\r\n' + closeDelimiter);
      
      // Get file content as ArrayBuffer
      const fileArrayBuffer = await file.arrayBuffer();
      
      // Combine all parts
      const combinedBuffer = new Uint8Array(
        requestBodyStart.byteLength + fileArrayBuffer.byteLength + requestBodyEnd.byteLength
      );
      combinedBuffer.set(requestBodyStart, 0);
      combinedBuffer.set(new Uint8Array(fileArrayBuffer), requestBodyStart.byteLength);
      combinedBuffer.set(requestBodyEnd, requestBodyStart.byteLength + fileArrayBuffer.byteLength);
      
      // Send the request
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': combinedBuffer.byteLength.toString()
          },
          body: combinedBuffer
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to upload file");
      }
      
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file to Google Drive", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  
  /**
   * Fetches an image from a URL and returns it as a Blob
   * @param imageUrl URL of the image to fetch
   * @returns Image as a Blob
   */
  private async fetchImageAsBlob(imageUrl: string): Promise<Blob> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  
  /**
   * Exports a carousel to Google Drive
   * @param carouselName Name of the carousel (will be used as folder name)
   * @param images Array of carousel images with URLs and names
   * @returns The ID of the created folder
   */
  public async exportCarouselToDrive(carouselName: string, images: CarouselImageExport[]): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated with Google Drive");
    }
    
    if (images.length === 0) {
      throw new Error("No images to export");
    }
    
    try {
      // Create a folder for the carousel
      const folderName = `Carousel - ${carouselName} - ${new Date().toISOString().split('T')[0]}`;
      const folderId = await this.createFolder(folderName);
      
      // Track progress for toast updates
      let uploadedCount = 0;
      const totalImages = images.length;
      
      // Show initial toast
      toast.promise(
        Promise.resolve(true),
        {
          loading: `Creating carousel in Google Drive (0/${totalImages})`,
          success: `Created carousel folder: ${folderName}`,
          error: "Failed to create carousel folder"
        }
      );
      
      // Process each image in sequence
      for (const image of images) {
        // Format the filename with padding for sequence
        const paddedIndex = String(image.index + 1).padStart(2, '0');
        const fileName = `${paddedIndex}_${image.name || 'Image'}.png`;
        
        // Fetch the image
        const imageBlob = await this.fetchImageAsBlob(image.url);
        
        // Upload to Drive
        await this.uploadFile(imageBlob, fileName, folderId);
        
        // Update progress
        uploadedCount++;
        
        // Update toast for every 3rd image or the last one
        if (uploadedCount === totalImages || uploadedCount % 3 === 0) {
          toast.info(`Uploading carousel to Google Drive`, {
            description: `Progress: ${uploadedCount}/${totalImages} images uploaded`
          });
        }
      }
      
      // Final success toast
      toast.success(`Carousel exported to Google Drive`, {
        description: `Successfully uploaded ${totalImages} images to folder "${folderName}"`
      });
      
      return folderId;
    } catch (error) {
      console.error("Error exporting carousel to Drive:", error);
      toast.error("Failed to export carousel to Google Drive", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  
  /**
   * Formats file size for display
   * @param sizeInBytes Size in bytes as string
   */
  public formatFileSize(sizeInBytes?: string): string {
    if (!sizeInBytes) return 'Unknown size';
    
    const bytes = parseInt(sizeInBytes);
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  
  /**
   * Creates a text file from string content
   * @param content Text content to convert to a file
   * @returns Blob with text/plain MIME type
   */
  private createTextFileBlob(content: string): Blob {
    return new Blob([content], { type: this.TEXT_MIME_TYPE });
  }
  
  /**
   * Exports ad assets (hooks, headlines, scripts) to Google Drive
   * @param carouselName Name of the carousel
   * @param adAssets Array of ad assets to export
   * @returns The ID of the created folder
   */
  public async exportAdAssetsToDrive(
    carouselName: string, 
    adAssets: AdAssetExport[]
  ): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated with Google Drive");
    }
    
    // Filter only selected assets
    const selectedAssets = adAssets.filter(asset => asset.selected);
    
    if (selectedAssets.length === 0) {
      throw new Error("No ad assets selected for export");
    }
    
    try {
      // Create a folder for the ad assets
      const folderName = `Carousel Assets - ${carouselName} - ${new Date().toISOString().split('T')[0]}`;
      const folderId = await this.createFolder(folderName);
      
      // Group assets by type
      const assetsByType: Record<string, AdAssetExport[]> = {
        hook: selectedAssets.filter(a => a.type === 'hook'),
        headline: selectedAssets.filter(a => a.type === 'headline'),
        script: selectedAssets.filter(a => a.type === 'script')
      };
      
      // Create a single file for each type with all content
      const typeLabels: Record<string, string> = {
        hook: 'Hooks',
        headline: 'Headlines',
        script: 'Scripts'
      };
      
      // Show initial toast
      toast.promise(
        Promise.resolve(true),
        {
          loading: `Creating asset files in Google Drive`,
          success: `Created assets folder: ${folderName}`,
          error: "Failed to create assets folder"
        }
      );
      
      // Process each asset type
      for (const [type, assets] of Object.entries(assetsByType)) {
        if (assets.length === 0) continue;
        
        // Create content with numbered assets
        let content = `# ${typeLabels[type]} for ${carouselName}\n`;
        content += `Generated on ${new Date().toLocaleString()}\n\n`;
        
        assets.forEach((asset, index) => {
          content += `## ${typeLabels[type].slice(0, -1)} ${index + 1}\n`;
          content += `${asset.text}\n\n`;
        });
        
        // Create file name
        const fileName = `${typeLabels[type]} - ${carouselName}.txt`;
        
        // Create text file blob
        const textBlob = this.createTextFileBlob(content);
        
        // Upload to Drive
        await this.uploadFile(textBlob, fileName, folderId);
      }
      
      // Create a combined file with all assets
      let combinedContent = `# All Ad Assets for ${carouselName}\n`;
      combinedContent += `Generated on ${new Date().toLocaleString()}\n\n`;
      
      for (const [type, assets] of Object.entries(assetsByType)) {
        if (assets.length === 0) continue;
        
        combinedContent += `# ${typeLabels[type]}\n\n`;
        
        assets.forEach((asset, index) => {
          combinedContent += `## ${typeLabels[type].slice(0, -1)} ${index + 1}\n`;
          combinedContent += `${asset.text}\n\n`;
        });
        
        combinedContent += '\n---\n\n';
      }
      
      // Upload combined file
      const combinedFileName = `All Assets - ${carouselName}.txt`;
      const combinedBlob = this.createTextFileBlob(combinedContent);
      await this.uploadFile(combinedBlob, combinedFileName, folderId);
      
      // Final success toast
      toast.success(`Ad assets exported to Google Drive`, {
        description: `Successfully exported ${selectedAssets.length} assets to folder "${folderName}"`
      });
      
      return folderId;
    } catch (error) {
      console.error("Error exporting ad assets to Drive:", error);
      toast.error("Failed to export ad assets to Google Drive", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  
  /**
   * Exports carousel content (both images and ad assets) to Google Drive
   * @param carouselName Name of the carousel
   * @param images Array of carousel images
   * @param adAssets Array of ad assets
   * @returns The ID of the created parent folder
   */
  public async exportCompleteCarouselToDrive(
    carouselName: string,
    images: CarouselImageExport[],
    adAssets: AdAssetExport[]
  ): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated with Google Drive");
    }
    
    try {
      // Create a parent folder for all carousel content
      const parentFolderName = `Complete Carousel - ${carouselName} - ${new Date().toISOString().split('T')[0]}`;
      const parentFolderId = await this.createFolder(parentFolderName);
      
      // Show initial toast
      toast.promise(
        Promise.resolve(true),
        {
          loading: `Creating complete carousel in Google Drive`,
          success: `Created parent folder: ${parentFolderName}`,
          error: "Failed to create parent folder"
        }
      );
      
      // Create subfolder for images
      if (images.length > 0) {
        const imagesFolderName = "Images";
        const imagesFolderId = await this.createFolder(imagesFolderName, parentFolderId);
        
        // Track progress for toast updates
        let uploadedCount = 0;
        const totalImages = images.length;
        
        // Process each image in sequence
        for (const image of images) {
          // Format the filename with padding for sequence
          const paddedIndex = String(image.index + 1).padStart(2, '0');
          const fileName = `${paddedIndex}_${image.name || 'Image'}.png`;
          
          // Fetch the image
          const imageBlob = await this.fetchImageAsBlob(image.url);
          
          // Upload to Drive
          await this.uploadFile(imageBlob, fileName, imagesFolderId);
          
          // Update progress
          uploadedCount++;
          
          // Update toast for every 3rd image or the last one
          if (uploadedCount === totalImages || uploadedCount % 3 === 0) {
            toast.info(`Uploading carousel images to Google Drive`, {
              description: `Progress: ${uploadedCount}/${totalImages} images uploaded`
            });
          }
        }
      }
      
      // Create subfolder for ad assets if there are selected assets
      const selectedAssets = adAssets.filter(asset => asset.selected);
      if (selectedAssets.length > 0) {
        const assetsFolderName = "Ad Assets";
        const assetsFolderId = await this.createFolder(assetsFolderName, parentFolderId);
        
        // Group assets by type
        const assetsByType: Record<string, AdAssetExport[]> = {
          hook: selectedAssets.filter(a => a.type === 'hook'),
          headline: selectedAssets.filter(a => a.type === 'headline'),
          script: selectedAssets.filter(a => a.type === 'script')
        };
        
        // Create a single file for each type with all content
        const typeLabels: Record<string, string> = {
          hook: 'Hooks',
          headline: 'Headlines',
          script: 'Scripts'
        };
        
        // Process each asset type
        for (const [type, assets] of Object.entries(assetsByType)) {
          if (assets.length === 0) continue;
          
          // Create content with numbered assets
          let content = `# ${typeLabels[type]} for ${carouselName}\n`;
          content += `Generated on ${new Date().toLocaleString()}\n\n`;
          
          assets.forEach((asset, index) => {
            content += `## ${typeLabels[type].slice(0, -1)} ${index + 1}\n`;
            content += `${asset.text}\n\n`;
          });
          
          // Create file name
          const fileName = `${typeLabels[type]} - ${carouselName}.txt`;
          
          // Create text file blob
          const textBlob = this.createTextFileBlob(content);
          
          // Upload to Drive
          await this.uploadFile(textBlob, fileName, assetsFolderId);
        }
        
        // Create a combined file with all assets
        let combinedContent = `# All Ad Assets for ${carouselName}\n`;
        combinedContent += `Generated on ${new Date().toLocaleString()}\n\n`;
        
        for (const [type, assets] of Object.entries(assetsByType)) {
          if (assets.length === 0) continue;
          
          combinedContent += `# ${typeLabels[type]}\n\n`;
          
          assets.forEach((asset, index) => {
            combinedContent += `## ${typeLabels[type].slice(0, -1)} ${index + 1}\n`;
            combinedContent += `${asset.text}\n\n`;
          });
          
          combinedContent += '\n---\n\n';
        }
        
        // Upload combined file
        const combinedFileName = `All Assets - ${carouselName}.txt`;
        const combinedBlob = this.createTextFileBlob(combinedContent);
        await this.uploadFile(combinedBlob, combinedFileName, assetsFolderId);
      }
      
      // Final success toast
      toast.success(`Complete carousel exported to Google Drive`, {
        description: `Successfully exported carousel to folder "${parentFolderName}"`
      });
      
      return parentFolderId;
    } catch (error) {
      console.error("Error exporting complete carousel to Drive:", error);
      toast.error("Failed to export complete carousel to Google Drive", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
}

export default GoogleDriveService.getInstance();