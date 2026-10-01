export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          birthday: string | null
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      fee_settings: {
        Row: {
          created_at: string
          credit: number
          debit: number
          id: number
          installment_base: number
          installment_per: number
          pix: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit?: number
          debit?: number
          id?: number
          installment_base?: number
          installment_per?: number
          pix?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit?: number
          debit?: number
          id?: number
          installment_base?: number
          installment_per?: number
          pix?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          cost: number
          created_at: string
          id: string
          min_stock: number
          name: string
          photo: string | null
          price: number
          purchase_extra: number
          purchase_qty: number
          real_cost: number
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string
          cost?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          photo?: string | null
          price?: number
          purchase_extra?: number
          purchase_qty?: number
          real_cost?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          photo?: string | null
          price?: number
          purchase_extra?: number
          purchase_qty?: number
          real_cost?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          fee_rate: number
          fee_value: number
          id: string
          installments: number
          payment: string
          product_id: string | null
          product_name: string
          qty: number
          shipping_cost: number
          shipping_paid_by: string | null
          unit_cost: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          fee_rate?: number
          fee_value?: number
          id?: string
          installments?: number
          payment: string
          product_id?: string | null
          product_name: string
          qty: number
          shipping_cost?: number
          shipping_paid_by?: string | null
          unit_cost: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          fee_rate?: number
          fee_value?: number
          id?: string
          installments?: number
          payment?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          shipping_cost?: number
          shipping_paid_by?: string | null
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catalog: {
        Args: never
        Returns: {
          category: string
          id: string
          min_stock: number
          name: string
          photo: string
          price: number
          stock: number
        }[]
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      customer_history: {
        Args: { _customer_id: string }
        Returns: {
          channel: string
          created_at: string
          id: string
          payment: string
          product_name: string
          qty: number
          unit_price: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      register_sale: {
        Args: {
          _channel: string
          _customer_id?: string
          _fee_rate: number
          _installments: number
          _payment: string
          _product_id: string
          _qty: number
          _shipping_cost: number
          _shipping_paid_by: string
        }
        Returns: string
      }
      today_sales: {
        Args: never
        Returns: {
          channel: string
          created_at: string
          id: string
          installments: number
          payment: string
          product_name: string
          qty: number
          unit_price: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "vendedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendedor"],
    },
  },
} as const
