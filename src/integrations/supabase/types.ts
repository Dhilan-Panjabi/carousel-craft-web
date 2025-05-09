export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          thumbnail_url: string | null
          yaml_config: string | null
          slides: Json | null
          additional_images: Json | null
          created_at: string
          updated_at: string
          favorite: boolean | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          thumbnail_url?: string | null
          yaml_config?: string | null
          slides?: Json | null
          additional_images?: Json | null
          created_at?: string
          updated_at?: string
          favorite?: boolean | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          thumbnail_url?: string | null
          yaml_config?: string | null
          slides?: Json | null
          additional_images?: Json | null
          created_at?: string
          updated_at?: string
          favorite?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          avatar_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string
          full_name?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          avatar_url?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          name: string
          template_id: string
          template_name: string
          template_description: string | null
          template_image_url: string | null
          status: string
          progress: number
          message: string | null
          image_urls: string[] | null
          prompts: Json | null
          data_type: string
          data_content: Json | null
          created_at: string | null
          updated_at: string | null
          variants: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          template_id: string
          template_name: string
          status?: string
          progress?: number
          message?: string | null
          image_urls?: string[] | null
          prompts?: Json | null
          data_type: string
          data_content?: Json | null
          created_at?: string | null
          updated_at?: string | null
          variants?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          template_id?: string
          template_name?: string
          status?: string
          progress?: number
          message?: string | null
          image_urls?: string[] | null
          prompts?: Json | null
          data_type?: string
          data_content?: Json | null
          created_at?: string | null
          updated_at?: string | null
          variants?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      carousel_prompts: {
        Row: {
          id: string
          job_id: string
          prompt_text: string
          data_variables: Json | null
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          job_id: string
          prompt_text: string
          data_variables?: Json | null
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          prompt_text?: string
          data_variables?: Json | null
          created_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      carousel_images: {
        Row: {
          id: string
          job_id: string
          prompt_id: string
          image_url: string
          width: number
          height: number
          created_at: string | null
          b64_json: string | null
          revised_prompt: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          job_id: string
          prompt_id: string
          image_url: string
          width: number
          height: number
          created_at?: string | null
          b64_json?: string | null
          revised_prompt?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          prompt_id?: string
          image_url?: string
          width?: number
          height?: number
          created_at?: string | null
          b64_json?: string | null
          revised_prompt?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
