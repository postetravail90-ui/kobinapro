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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          commerce_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          commerce_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          commerce_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      commandes: {
        Row: {
          created_at: string
          id: string
          prix_unitaire: number
          produit_id: string
          quantite: number
          session_id: string
          total_ligne: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          prix_unitaire: number
          produit_id: string
          quantite?: number
          session_id: string
          total_ligne?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          prix_unitaire?: number
          produit_id?: string
          quantite?: number
          session_id?: string
          total_ligne?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commandes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_top_produits"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "commandes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "vue_sessions_longues"
            referencedColumns: ["session_id"]
          },
        ]
      }
      commerce_branding: {
        Row: {
          address: string | null
          commerce_id: string
          display_name: string | null
          footer_message: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          commerce_id: string
          display_name?: string | null
          footer_message?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          commerce_id?: string
          display_name?: string | null
          footer_message?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_branding_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: true
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_branding_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: true
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      commerces: {
        Row: {
          adresse: string | null
          created_at: string
          id: string
          nom: string
          proprietaire_id: string
          statut: Database["public"]["Enums"]["commerce_statut"]
          type: Database["public"]["Enums"]["commerce_type"]
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          id?: string
          nom: string
          proprietaire_id: string
          statut?: Database["public"]["Enums"]["commerce_statut"]
          type?: Database["public"]["Enums"]["commerce_type"]
        }
        Update: {
          adresse?: string | null
          created_at?: string
          id?: string
          nom?: string
          proprietaire_id?: string
          statut?: Database["public"]["Enums"]["commerce_statut"]
          type?: Database["public"]["Enums"]["commerce_type"]
        }
        Relationships: []
      }
      credits: {
        Row: {
          client_name: string
          created_at: string
          created_by: string | null
          created_by_name: string
          date_echeance: string | null
          facture_id: string
          id: string
          montant_restant: number
          promise_date: string | null
          statut: Database["public"]["Enums"]["credit_statut"]
          total_amount: number
          total_paid: number
        }
        Insert: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          date_echeance?: string | null
          facture_id: string
          id?: string
          montant_restant: number
          promise_date?: string | null
          statut?: Database["public"]["Enums"]["credit_statut"]
          total_amount?: number
          total_paid?: number
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          date_echeance?: string | null
          facture_id?: string
          id?: string
          montant_restant?: number
          promise_date?: string | null
          statut?: Database["public"]["Enums"]["credit_statut"]
          total_amount?: number
          total_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "credits_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales_summary: {
        Row: {
          commerce_id: string
          created_at: string
          date: string
          id: string
          total_expenses: number
          total_sales: number
          transactions_count: number
          updated_at: string
        }
        Insert: {
          commerce_id: string
          created_at?: string
          date?: string
          id?: string
          total_expenses?: number
          total_sales?: number
          transactions_count?: number
          updated_at?: string
        }
        Update: {
          commerce_id?: string
          created_at?: string
          date?: string
          id?: string
          total_expenses?: number
          total_sales?: number
          transactions_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_summary_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_summary_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      depenses: {
        Row: {
          commerce_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          montant: number
          titre: string
        }
        Insert: {
          commerce_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          montant?: number
          titre: string
        }
        Update: {
          commerce_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          montant?: number
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      error_logs: {
        Row: {
          commerce_id: string | null
          context: string | null
          created_at: string
          error_code: string | null
          id: string
          message: string
          metadata: Json | null
          severity: string
          source: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          commerce_id?: string | null
          context?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          message: string
          metadata?: Json | null
          severity?: string
          source: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          commerce_id?: string | null
          context?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          source?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      extra_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          owner_id: string
          paystack_reference: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          owner_id: string
          paystack_reference?: string | null
          status?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          owner_id?: string
          paystack_reference?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      factures: {
        Row: {
          created_at: string
          id: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement"]
          session_id: string
          statut: Database["public"]["Enums"]["facture_statut"]
          total_final: number
        }
        Insert: {
          created_at?: string
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement"]
          session_id: string
          statut?: Database["public"]["Enums"]["facture_statut"]
          total_final: number
        }
        Update: {
          created_at?: string
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement"]
          session_id?: string
          statut?: Database["public"]["Enums"]["facture_statut"]
          total_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "factures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "vue_sessions_longues"
            referencedColumns: ["session_id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          commerce_id: string | null
          created_at: string
          device_info: string | null
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commerce_id?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commerce_id?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fcm_tokens_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fcm_tokens_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          commerce_id: string | null
          created_at: string
          gerant_id: string | null
          id: string
          metadata: Json | null
          niveau_risque: Database["public"]["Enums"]["niveau_risque"]
          resolved: boolean
          type_alerte: string
        }
        Insert: {
          commerce_id?: string | null
          created_at?: string
          gerant_id?: string | null
          id?: string
          metadata?: Json | null
          niveau_risque?: Database["public"]["Enums"]["niveau_risque"]
          resolved?: boolean
          type_alerte: string
        }
        Update: {
          commerce_id?: string | null
          created_at?: string
          gerant_id?: string | null
          id?: string
          metadata?: Json | null
          niveau_risque?: Database["public"]["Enums"]["niveau_risque"]
          resolved?: boolean
          type_alerte?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
          {
            foreignKeyName: "fraud_alerts_gerant_id_fkey"
            columns: ["gerant_id"]
            isOneToOne: false
            referencedRelation: "gerants"
            referencedColumns: ["id"]
          },
        ]
      }
      gerants: {
        Row: {
          actif: boolean
          commerce_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          commerce_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          commerce_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gerants_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gerants_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      loyalty_cards: {
        Row: {
          card_code: string
          client_name: string
          client_phone: string | null
          commerce_id: string
          created_at: string
          id: string
          points: number
          total_spent: number
        }
        Insert: {
          card_code: string
          client_name?: string
          client_phone?: string | null
          commerce_id: string
          created_at?: string
          id?: string
          points?: number
          total_spent?: number
        }
        Update: {
          card_code?: string
          client_name?: string
          client_phone?: string | null
          commerce_id?: string
          created_at?: string
          id?: string
          points?: number
          total_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          commerce_id: string
          created_at: string
          id: string
          points_per_fcfa: number
          reward_threshold: number
          reward_value: number
        }
        Insert: {
          commerce_id: string
          created_at?: string
          id?: string
          points_per_fcfa?: number
          reward_threshold?: number
          reward_value?: number
        }
        Update: {
          commerce_id?: string
          created_at?: string
          id?: string
          points_per_fcfa?: number
          reward_threshold?: number
          reward_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_settings_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: true
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_settings_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: true
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      manager_permissions: {
        Row: {
          can_add_expenses: boolean
          can_add_products: boolean
          can_add_stock: boolean
          can_manage_products: boolean
          can_print_receipt: boolean
          can_scan_barcode: boolean
          can_sell: boolean
          can_use_credit: boolean
          can_use_messaging: boolean
          can_use_sessions: boolean
          can_view_sales_history: boolean
          id: string
          manager_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_add_expenses?: boolean
          can_add_products?: boolean
          can_add_stock?: boolean
          can_manage_products?: boolean
          can_print_receipt?: boolean
          can_scan_barcode?: boolean
          can_sell?: boolean
          can_use_credit?: boolean
          can_use_messaging?: boolean
          can_use_sessions?: boolean
          can_view_sales_history?: boolean
          id?: string
          manager_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_add_expenses?: boolean
          can_add_products?: boolean
          can_add_stock?: boolean
          can_manage_products?: boolean
          can_print_receipt?: boolean
          can_scan_barcode?: boolean
          can_sell?: boolean
          can_use_credit?: boolean
          can_use_messaging?: boolean
          can_use_sessions?: boolean
          can_view_sales_history?: boolean
          id?: string
          manager_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_permissions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: true
            referencedRelation: "gerants"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          active: boolean | null
          commerce_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          commerce_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          commerce_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managers_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
          {
            foreignKeyName: "managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          commerce_id: string
          created_at: string
          id: string
          media_url: string | null
          message: string
          receiver_id: string
          sender_id: string
          status: string
          type: string
        }
        Insert: {
          commerce_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          message?: string
          receiver_id: string
          sender_id: string
          status?: string
          type?: string
        }
        Update: {
          commerce_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          message?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          title: string | null
          token: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          title?: string | null
          token?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          title?: string | null
          token?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          notify_expenses: boolean
          notify_messages: boolean
          notify_sales: boolean
          notify_security: boolean
          notify_stock: boolean
          notify_subscription: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notify_expenses?: boolean
          notify_messages?: boolean
          notify_sales?: boolean
          notify_security?: boolean
          notify_stock?: boolean
          notify_subscription?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notify_expenses?: boolean
          notify_messages?: boolean
          notify_sales?: boolean
          notify_security?: boolean
          notify_stock?: boolean
          notify_subscription?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          commerce_id: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          route: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          commerce_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          route?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          commerce_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          route?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempts_count: number
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          otp_hash: string | null
          phone: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts_count?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code: string
          otp_hash?: string | null
          phone: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts_count?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          otp_hash?: string | null
          phone?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      paid_actions: {
        Row: {
          id: string
          label: string
          plan_code: string
          price: number
        }
        Insert: {
          id: string
          label: string
          plan_code: string
          price: number
        }
        Update: {
          id?: string
          label?: string
          plan_code?: string
          price?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          duration_months: number
          id: string
          metadata: Json | null
          owner_id: string
          payment_method: string | null
          payment_type: string
          paystack_access_code: string | null
          paystack_reference: string | null
          plan: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          duration_months?: number
          id?: string
          metadata?: Json | null
          owner_id: string
          payment_method?: string | null
          payment_type?: string
          paystack_access_code?: string | null
          paystack_reference?: string | null
          plan: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          duration_months?: number
          id?: string
          metadata?: Json | null
          owner_id?: string
          payment_method?: string | null
          payment_type?: string
          paystack_access_code?: string | null
          paystack_reference?: string | null
          plan?: string
          status?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          benefice: boolean
          credit_module: boolean
          favoris: boolean
          fidelite: boolean
          max_commerces: number
          max_managers: number
          max_products: number
          messagerie: boolean
          plan: string
          plan_code: string | null
          price: number
          rapport_avance: boolean
          scanner: boolean
          session_module: boolean
        }
        Insert: {
          benefice?: boolean
          credit_module?: boolean
          favoris?: boolean
          fidelite?: boolean
          max_commerces?: number
          max_managers?: number
          max_products?: number
          messagerie?: boolean
          plan: string
          plan_code?: string | null
          price?: number
          rapport_avance?: boolean
          scanner?: boolean
          session_module?: boolean
        }
        Update: {
          benefice?: boolean
          credit_module?: boolean
          favoris?: boolean
          fidelite?: boolean
          max_commerces?: number
          max_managers?: number
          max_products?: number
          messagerie?: boolean
          plan?: string
          plan_code?: string | null
          price?: number
          rapport_avance?: boolean
          scanner?: boolean
          session_module?: boolean
        }
        Relationships: []
      }
      produits: {
        Row: {
          actif: boolean
          categorie: string | null
          code_barre: string | null
          commerce_id: string
          created_at: string
          favori: boolean
          id: string
          nom: string
          prix: number
          prix_achat: number
          stock: number
          unite: string | null
        }
        Insert: {
          actif?: boolean
          categorie?: string | null
          code_barre?: string | null
          commerce_id: string
          created_at?: string
          favori?: boolean
          id?: string
          nom: string
          prix?: number
          prix_achat?: number
          stock?: number
          unite?: string | null
        }
        Update: {
          actif?: boolean
          categorie?: string | null
          code_barre?: string | null
          commerce_id?: string
          created_at?: string
          favori?: boolean
          id?: string
          nom?: string
          prix?: number
          prix_achat?: number
          stock?: number
          unite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      profiles: {
        Row: {
          commune: string | null
          country_code: string | null
          created_at: string
          currency_code: string | null
          id: string
          is_verified: boolean | null
          nom: string
          numero: string | null
          photo_url: string | null
        }
        Insert: {
          commune?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          id: string
          is_verified?: boolean | null
          nom?: string
          numero?: string | null
          photo_url?: string | null
        }
        Update: {
          commune?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          id?: string
          is_verified?: boolean | null
          nom?: string
          numero?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_montant: number
          created_at: string
          filleul_id: string | null
          id: string
          parrain_id: string
          paye: boolean
          referral_code: string
          statut: Database["public"]["Enums"]["referral_statut"]
        }
        Insert: {
          bonus_montant?: number
          created_at?: string
          filleul_id?: string | null
          id?: string
          parrain_id: string
          paye?: boolean
          referral_code: string
          statut?: Database["public"]["Enums"]["referral_statut"]
        }
        Update: {
          bonus_montant?: number
          created_at?: string
          filleul_id?: string | null
          id?: string
          parrain_id?: string
          paye?: boolean
          referral_code?: string
          statut?: Database["public"]["Enums"]["referral_statut"]
        }
        Relationships: []
      }
      sessions: {
        Row: {
          commerce_id: string
          date_fermeture: string | null
          date_ouverture: string
          gerant_id: string
          id: string
          numero_table: string | null
          statut: Database["public"]["Enums"]["session_statut"]
          total_actuel: number
        }
        Insert: {
          commerce_id: string
          date_fermeture?: string | null
          date_ouverture?: string
          gerant_id: string
          id?: string
          numero_table?: string | null
          statut?: Database["public"]["Enums"]["session_statut"]
          total_actuel?: number
        }
        Update: {
          commerce_id?: string
          date_fermeture?: string | null
          date_ouverture?: string
          gerant_id?: string
          id?: string
          numero_table?: string | null
          statut?: Database["public"]["Enums"]["session_statut"]
          total_actuel?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
          {
            foreignKeyName: "sessions_gerant_id_fkey"
            columns: ["gerant_id"]
            isOneToOne: false
            referencedRelation: "gerants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          montant: number
          payment_method: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          proprietaire_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end_date: string | null
          validated_by_admin: boolean
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          montant?: number
          payment_method?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          proprietaire_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end_date?: string | null
          validated_by_admin?: boolean
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          montant?: number
          payment_method?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          proprietaire_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end_date?: string | null
          validated_by_admin?: boolean
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_agent: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          message: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agent?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_agent: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_agent?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_agent?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          amount_fcfa: number | null
          created_at: string
          currency_code: string
          id: string
          metadata: Json | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_fcfa?: number | null
          created_at?: string
          currency_code?: string
          id?: string
          metadata?: Json | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_fcfa?: number | null
          created_at?: string
          currency_code?: string
          id?: string
          metadata?: Json | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      admin_staff_scopes: {
        Row: {
          user_id: string
          scope_dashboard: boolean
          scope_users: boolean
          scope_commerces: boolean
          scope_billing: boolean
          scope_analytics: boolean
          scope_fraude: boolean
          scope_security: boolean
          scope_support: boolean
          scope_logs: boolean
          scope_settings: boolean
          scope_monitoring: boolean
          granted_by: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          scope_dashboard?: boolean
          scope_users?: boolean
          scope_commerces?: boolean
          scope_billing?: boolean
          scope_analytics?: boolean
          scope_fraude?: boolean
          scope_security?: boolean
          scope_support?: boolean
          scope_logs?: boolean
          scope_settings?: boolean
          scope_monitoring?: boolean
          granted_by?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          scope_dashboard?: boolean
          scope_users?: boolean
          scope_commerces?: boolean
          scope_billing?: boolean
          scope_analytics?: boolean
          scope_fraude?: boolean
          scope_security?: boolean
          scope_support?: boolean
          scope_logs?: boolean
          scope_settings?: boolean
          scope_monitoring?: boolean
          granted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_suspended: boolean
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          suspended_at: string | null
          suspended_by: string | null
        }
        Insert: {
          account_suspended?: boolean
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
        }
        Update: {
          account_suspended?: boolean
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      produits_public: {
        Row: {
          actif: boolean | null
          categorie: string | null
          code_barre: string | null
          commerce_id: string | null
          created_at: string | null
          favori: boolean | null
          id: string | null
          nom: string | null
          prix: number | null
          stock: number | null
          unite: string | null
        }
        Insert: {
          actif?: boolean | null
          categorie?: string | null
          code_barre?: string | null
          commerce_id?: string | null
          created_at?: string | null
          favori?: boolean | null
          id?: string | null
          nom?: string | null
          prix?: number | null
          stock?: number | null
          unite?: string | null
        }
        Update: {
          actif?: boolean | null
          categorie?: string | null
          code_barre?: string | null
          commerce_id?: string | null
          created_at?: string | null
          favori?: boolean | null
          id?: string | null
          nom?: string | null
          prix?: number | null
          stock?: number | null
          unite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      vue_abonnements_expiration: {
        Row: {
          end_date: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          proprietaire_id: string | null
          proprietaire_nom: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: string | null
          trial_end_date: string | null
        }
        Relationships: []
      }
      vue_risque_fraude: {
        Row: {
          commerce_id: string | null
          commerce_nom: string | null
          created_at: string | null
          id: string | null
          niveau_risque: Database["public"]["Enums"]["niveau_risque"] | null
          resolved: boolean | null
          type_alerte: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      vue_sessions_longues: {
        Row: {
          commerce_id: string | null
          commerce_nom: string | null
          date_ouverture: string | null
          heures_ouvertes: number | null
          numero_table: string | null
          session_id: string | null
          total_actuel: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      vue_top_produits: {
        Row: {
          commerce_id: string | null
          commerce_nom: string | null
          nombre_commandes: number | null
          produit_id: string | null
          produit_nom: string | null
          total_quantite: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "commerces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_commerce_id_fkey"
            columns: ["commerce_id"]
            isOneToOne: false
            referencedRelation: "vue_total_ventes"
            referencedColumns: ["commerce_id"]
          },
        ]
      }
      vue_total_ventes: {
        Row: {
          commerce_id: string | null
          commerce_nom: string | null
          nombre_factures: number | null
          proprietaire_id: string | null
          total_ventes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_subscription_status: { Args: { _user_id: string }; Returns: Json }
      close_session: {
        Args: {
          _mode?: Database["public"]["Enums"]["mode_paiement"]
          _session_id: string
        }
        Returns: string
      }
      downgrade_expired_subscriptions: { Args: never; Returns: number }
      get_commerce_owner: { Args: { _commerce_id: string }; Returns: string }
      get_plan_max_commerces: {
        Args: { _plan: Database["public"]["Enums"]["plan_type"] }
        Returns: number
      }
      get_profit_report: {
        Args: {
          _commerce_ids: string[]
          _date_from?: string
          _date_to?: string
        }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      admin_remove_staff_member: { Args: { _user_id: string }; Returns: undefined }
      admin_upsert_staff_member: {
        Args: {
          _scope_analytics?: boolean
          _scope_billing?: boolean
          _scope_commerces?: boolean
          _scope_dashboard?: boolean
          _scope_fraude?: boolean
          _scope_logs?: boolean
          _scope_monitoring?: boolean
          _scope_security?: boolean
          _scope_settings?: boolean
          _scope_support?: boolean
          _scope_users?: boolean
          _user_id: string
        }
        Returns: undefined
      }
      platform_may: { Args: { p_scope: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_commerce_member: { Args: { p_commerce_id: string }; Returns: boolean }
      is_gerant_of_commerce: {
        Args: { _commerce_id: string; _user_id: string }
        Returns: boolean
      }
      log_activity: {
        Args: { _action: string; _metadata?: Json; _user_id: string }
        Returns: undefined
      }
      process_sale: {
        Args: {
          p_client_mutation_id?: string
          p_client_name?: string
          p_commerce_id: string
          p_gerant_id: string
          p_items: Database["public"]["CompositeTypes"]["sale_item"][]
          p_mode: Database["public"]["Enums"]["mode_paiement"]
          p_partial_amount?: number
          p_promise_date?: string
          p_user_name?: string
        }
        Returns: string
      }
      verify_otp: {
        Args: { _otp_code: string; _phone: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin_staff" | "proprietaire" | "gerant"
      commerce_statut: "actif" | "suspendu"
      commerce_type:
        | "restaurant"
        | "boutique"
        | "bar"
        | "superette"
        | "pharmacie"
        | "autre"
      credit_statut: "en_cours" | "paye" | "en_retard"
      facture_statut: "payee" | "credit"
      mode_paiement: "cash" | "mobile_money" | "credit"
      niveau_risque: "faible" | "moyen" | "eleve" | "critique"
      plan_type: "free" | "commerce_1" | "multi_3" | "multi_6" | "multi_10"
      referral_statut: "inscrit" | "paye" | "valide"
      session_statut: "ouverte" | "fermee"
      subscription_status: "active" | "expired" | "pending"
      ticket_category:
        | "technical_issue"
        | "payment_issue"
        | "account_problem"
        | "bug_report"
        | "general_question"
      ticket_priority: "critical" | "high" | "normal" | "low"
      ticket_status: "open" | "pending" | "in_progress" | "resolved" | "closed"
    }
    CompositeTypes: {
      sale_item: {
        produit_id: string | null
        quantite: number | null
        prix_unitaire: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["super_admin", "admin_staff", "proprietaire", "gerant"],
      commerce_statut: ["actif", "suspendu"],
      commerce_type: [
        "restaurant",
        "boutique",
        "bar",
        "superette",
        "pharmacie",
        "autre",
      ],
      credit_statut: ["en_cours", "paye", "en_retard"],
      facture_statut: ["payee", "credit"],
      mode_paiement: ["cash", "mobile_money", "credit"],
      niveau_risque: ["faible", "moyen", "eleve", "critique"],
      plan_type: ["free", "commerce_1", "multi_3", "multi_6", "multi_10"],
      referral_statut: ["inscrit", "paye", "valide"],
      session_statut: ["ouverte", "fermee"],
      subscription_status: ["active", "expired", "pending"],
      ticket_category: [
        "technical_issue",
        "payment_issue",
        "account_problem",
        "bug_report",
        "general_question",
      ],
      ticket_priority: ["critical", "high", "normal", "low"],
      ticket_status: ["open", "pending", "in_progress", "resolved", "closed"],
    },
  },
} as const
