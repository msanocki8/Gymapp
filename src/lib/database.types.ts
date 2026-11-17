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
