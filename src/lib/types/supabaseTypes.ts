export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cb_schedule_associations: {
        Row: {
          custom_block_id: number
          schedule_id: number
        }
        Insert: {
          custom_block_id: number
          schedule_id: number
        }
        Update: {
          custom_block_id?: number
          schedule_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cb_schedule_associations_custom_block_id_fkey"
            columns: ["custom_block_id"]
            isOneToOne: false
            referencedRelation: "custom_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cb_schedule_associations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedule_associations: {
        Row: {
          course_id: number
          metadata: Json | null
          schedule_id: number
        }
        Insert: {
          course_id: number
          metadata?: Json | null
          schedule_id: number
        }
        Update: {
          course_id?: number
          metadata?: Json | null
          schedule_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_schedule_associations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_schedule_associations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      courselist_program_associations: {
        Row: {
          courselist_id: number
          program_id: number
        }
        Insert: {
          courselist_id: number
          program_id: number
        }
        Update: {
          courselist_id?: number
          program_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "courselist_program_associations_courselist_id_fkey"
            columns: ["courselist_id"]
            isOneToOne: false
            referencedRelation: "courselists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courselist_program_associations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      courselists: {
        Row: {
          id: number
          plan_id: number
          slot: number | null
          term: number | null
          title: string
          user_id: string
        }
        Insert: {
          id?: never
          plan_id: number
          slot?: number | null
          term?: number | null
          title: string
          user_id: string
        }
        Update: {
          id?: never
          plan_id?: number
          slot?: number | null
          term?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courselists_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courselists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          basis: string | null
          code: string
          dists: string[] | null
          emplids: string[]
          has_final: boolean | null
          id: number
          instructors: string[] | null
          listing_id: string
          num_evals: number | null
          rating: number | null
          status: number
          term: number
          title: string
        }
        Insert: {
          basis?: string | null
          code: string
          dists?: string[] | null
          emplids?: string[]
          has_final?: boolean | null
          id?: never
          instructors?: string[] | null
          listing_id: string
          num_evals?: number | null
          rating?: number | null
          status?: number
          term: number
          title: string
        }
        Update: {
          basis?: string | null
          code?: string
          dists?: string[] | null
          emplids?: string[]
          has_final?: boolean | null
          id?: never
          instructors?: string[] | null
          listing_id?: string
          num_evals?: number | null
          rating?: number | null
          status?: number
          term?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_blocks: {
        Row: {
          description: string | null
          id: number
          is_public: boolean | null
          times: Json
          title: string
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: never
          is_public?: boolean | null
          times: Json
          title: string
          user_id: string
        }
        Update: {
          description?: string | null
          id?: never
          is_public?: boolean | null
          times?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          course_id: number
          listing_id: string
          num_evals: number | null
          rating: number
        }
        Insert: {
          course_id: number
          listing_id: string
          num_evals?: number | null
          rating: number
        }
        Update: {
          course_id?: number
          listing_id?: string
          num_evals?: number | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: number
          resolved: boolean
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: number
          resolved?: boolean
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: number
          resolved?: boolean
        }
        Relationships: []
      }
      icals: {
        Row: {
          id: string
          schedule_id: number | null
          user_id: string
        }
        Insert: {
          id: string
          schedule_id?: number | null
          user_id: string
        }
        Update: {
          id?: string
          schedule_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "icals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_icals_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          emplid: string
          name: string
          rating: number | null
        }
        Insert: {
          emplid: string
          name: string
          rating?: number | null
        }
        Update: {
          emplid?: string
          name?: string
          rating?: number | null
        }
        Relationships: []
      }
      listing_courselist_associations: {
        Row: {
          courselist_id: number
          listing_id: string
        }
        Insert: {
          courselist_id: number
          listing_id: string
        }
        Update: {
          courselist_id?: number
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_courselist_associations_courselist_id_fkey"
            columns: ["courselist_id"]
            isOneToOne: false
            referencedRelation: "courselists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_courselist_associations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          aka: string[] | null
          code: string
          id: string
          pen_term: number | null
          prev_code: string[] | null
          title: string
          ult_term: number | null
        }
        Insert: {
          aka?: string[] | null
          code: string
          id: string
          pen_term?: number | null
          prev_code?: string[] | null
          title: string
          ult_term?: number | null
        }
        Update: {
          aka?: string[] | null
          code?: string
          id?: string
          pen_term?: number | null
          prev_code?: string[] | null
          title?: string
          ult_term?: number | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: number
          title: string
          user_id: string
        }
        Insert: {
          id?: never
          title: string
          user_id: string
        }
        Update: {
          id?: never
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prereqs: {
        Row: {
          course_id: string
          prereq_id: string
        }
        Insert: {
          course_id: string
          prereq_id: string
        }
        Update: {
          course_id?: string
          prereq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prereqs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prereqs_prereq_id_fkey"
            columns: ["prereq_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      private_profiles: {
        Row: {
          id: string
          is_admin: boolean
        }
        Insert: {
          id: string
          is_admin?: boolean
        }
        Update: {
          id?: string
          is_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "private_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          doneFeedback: boolean
          id: string
          year: number | null
        }
        Insert: {
          doneFeedback?: boolean
          id: string
          year?: number | null
        }
        Update: {
          doneFeedback?: boolean
          id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          abv: string
          category: string
          description: string | null
          id: number
          is_active: boolean
          is_ind: boolean | null
          requirements: Json | null
          title: string
          website: string | null
        }
        Insert: {
          abv: string
          category: string
          description?: string | null
          id?: never
          is_active?: boolean
          is_ind?: boolean | null
          requirements?: Json | null
          title: string
          website?: string | null
        }
        Update: {
          abv?: string
          category?: string
          description?: string | null
          id?: never
          is_active?: boolean
          is_ind?: boolean | null
          requirements?: Json | null
          title?: string
          website?: string | null
        }
        Relationships: []
      }
      schedule_courselist_associations: {
        Row: {
          courselist_id: number
          schedule_id: number
        }
        Insert: {
          courselist_id: number
          schedule_id: number
        }
        Update: {
          courselist_id?: number
          schedule_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_courselist_associations_courselist_id_fkey"
            columns: ["courselist_id"]
            isOneToOne: false
            referencedRelation: "courselists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_courselist_associations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          id: number
          is_public: boolean | null
          term: number
          title: string
          user_id: string
        }
        Insert: {
          id?: never
          is_public?: boolean | null
          term: number
          title: string
          user_id: string
        }
        Update: {
          id?: never
          is_public?: boolean | null
          term?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          cap: number | null
          category: string
          course_id: number
          days: number | null
          end_time: number | null
          id: number
          num: number
          room: string | null
          start_time: number | null
          status: number | null
          title: string
          tot: number | null
        }
        Insert: {
          cap?: number | null
          category: string
          course_id: number
          days?: number | null
          end_time?: number | null
          id?: never
          num: number
          room?: string | null
          start_time?: number | null
          status?: number | null
          title: string
          tot?: number | null
        }
        Update: {
          cap?: number | null
          category?: string
          course_id?: number
          days?: number | null
          end_time?: number | null
          id?: never
          num?: number
          room?: string | null
          start_time?: number | null
          status?: number | null
          title?: string
          tot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never