export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nick: string; created_at: string; updated_at: string };
        Insert: { id: string; nick: string; created_at?: string; updated_at?: string };
        Update: { nick?: string; updated_at?: string };
        Relationships: [];
      };
      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          share_token: string;
          name: string;
          focus: string;
          source_plan_id: string | null;
          duration: number;
          exercises: string[];
          exercise_configs: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          share_token?: string;
          name: string;
          focus: string;
          source_plan_id?: string | null;
          duration: number;
          exercises: string[];
          exercise_configs?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          share_token?: string;
          name?: string;
          focus?: string;
          duration?: number;
          exercises?: string[];
          exercise_configs?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          focus: string;
          duration: number;
          completed_exercises: number;
          total_exercises: number;
          completed_at: string;
          notes: string | null;
          exercise_performance: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          focus: string;
          duration: number;
          completed_exercises: number;
          total_exercises: number;
          completed_at?: string;
          notes?: string | null;
          exercise_performance?: Json | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          focus?: string;
          duration?: number;
          completed_exercises?: number;
          total_exercises?: number;
          completed_at?: string;
          notes?: string | null;
          exercise_performance?: Json | null;
        };
        Relationships: [];
      };
      user_hidden_starter_plans: {
        Row: { user_id: string; starter_plan_id: string; created_at: string };
        Insert: { user_id: string; starter_plan_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      exercise_catalog: {
        Row: {
          id: string;
          name: string;
          category: string;
          equipment: string;
          level: string;
          image_ref: string;
          description: string;
          steps: string[];
          primary_muscles: string[];
          secondary_muscles: string[];
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          equipment: string;
          level: string;
          image_ref: string;
          description: string;
          steps?: string[];
          primary_muscles?: string[];
          secondary_muscles?: string[];
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          equipment?: string;
          level?: string;
          image_ref?: string;
          description?: string;
          steps?: string[];
          primary_muscles?: string[];
          secondary_muscles?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      diet_profiles: {
        Row: {
          user_id: string;
          sex: 'male' | 'female';
          age: number;
          height_cm: number;
          weight_kg: number;
          activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal: 'cut' | 'maintain' | 'bulk';
          kcal_target: number | null;
          protein_target: number | null;
          carbs_target: number | null;
          fat_target: number | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sex: 'male' | 'female';
          age: number;
          height_cm: number;
          weight_kg: number;
          activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal: 'cut' | 'maintain' | 'bulk';
          kcal_target?: number | null;
          protein_target?: number | null;
          carbs_target?: number | null;
          fat_target?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['diet_profiles']['Insert']>;
        Relationships: [];
      };
      custom_foods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          barcode: string | null;
          kcal_100: number;
          protein_100: number;
          carbs_100: number;
          fat_100: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          barcode?: string | null;
          kcal_100: number;
          protein_100?: number;
          carbs_100?: number;
          fat_100?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['custom_foods']['Insert']>;
        Relationships: [];
      };
      food_cache: {
        Row: {
          barcode: string;
          name: string;
          brand: string | null;
          kcal_100: number;
          protein_100: number;
          carbs_100: number;
          fat_100: number;
          image_url: string | null;
          source: 'off';
          fetched_at: string;
        };
        Insert: {
          barcode: string;
          name: string;
          brand?: string | null;
          kcal_100: number;
          protein_100?: number;
          carbs_100?: number;
          fat_100?: number;
          image_url?: string | null;
          source?: 'off';
          fetched_at?: string;
        };
        Update: Partial<Database['public']['Tables']['food_cache']['Insert']>;
        Relationships: [];
      };
      diet_entries: {
        Row: {
          id: string;
          user_id: string;
          eaten_on: string;
          meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          food_name: string;
          brand: string | null;
          source: 'off' | 'custom';
          source_id: string | null;
          grams: number;
          kcal: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          eaten_on: string;
          meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          food_name: string;
          brand?: string | null;
          source: 'off' | 'custom';
          source_id?: string | null;
          grams: number;
          kcal: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['diet_entries']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_shared_workout_plan: {
        Args: { p_token: string };
        Returns: {
          name: string;
          focus: string;
          duration: number;
          exercises: string[];
          exercise_configs: Json;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
