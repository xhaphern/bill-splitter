export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          currency: string | null;
          total: number | null;
          payload: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          currency?: string | null;
          total?: number | null;
          payload?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          currency?: string | null;
          total?: number | null;
          payload?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      friends: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          account: string | null;
          phone: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          account?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          account?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      friend_circles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      friend_circle_members: {
        Row: {
          id: string;
          user_id: string;
          circle_id: string;
          friend_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          circle_id: string;
          friend_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          circle_id?: string;
          friend_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
