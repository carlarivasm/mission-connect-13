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
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      authorized_missionaries: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          category: string
          configuration: Json | null
          created_at: string | null
          id: string
          image_url: string | null
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          price: number
          product_id?: string | null
          product_name: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_org_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_banners: {
        Row: {
          active: boolean
          body_text: string | null
          created_at: string
          created_by: string | null
          expire_at: string
          id: string
          media_type: string
          media_url: string
          publish_at: string
          storage_path: string | null
          title: string
        }
        Insert: {
          active?: boolean
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          expire_at: string
          id?: string
          media_type?: string
          media_url: string
          publish_at?: string
          storage_path?: string | null
          title?: string
        }
        Update: {
          active?: boolean
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          expire_at?: string
          id?: string
          media_type?: string
          media_url?: string
          publish_at?: string
          storage_path?: string | null
          title?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          location: string | null
          meeting_link: string | null
          notify_push: boolean
          reminder_10min: boolean
          reminder_24h: boolean
          reminder_30min: boolean
          reminder_5min: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          notify_push?: boolean
          reminder_10min?: boolean
          reminder_24h?: boolean
          reminder_30min?: boolean
          reminder_5min?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          notify_push?: boolean
          reminder_10min?: boolean
          reminder_24h?: boolean
          reminder_30min?: boolean
          reminder_5min?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      family_group_members: {
        Row: {
          created_at: string
          family_group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_group_members_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      formation_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      formation_videos: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          storage_path: string
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          storage_path: string
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          storage_path?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "formation_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          media_type: string
          mission_location: string | null
          storage_path: string
          uploaded_by: string | null
          uploaded_by_name: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          media_type?: string
          mission_location?: string | null
          storage_path: string
          uploaded_by?: string | null
          uploaded_by_name?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          media_type?: string
          mission_location?: string | null
          storage_path?: string
          uploaded_by?: string | null
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_components: {
        Row: {
          component_product_id: string
          created_at: string | null
          id: string
          kit_id: string
          quantity: number | null
        }
        Insert: {
          component_product_id: string
          created_at?: string | null
          id?: string
          kit_id: string
          quantity?: number | null
        }
        Update: {
          component_product_id?: string
          created_at?: string | null
          id?: string
          kit_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_components_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_components_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      location_user_notes: {
        Row: {
          accepts_identification: boolean
          created_at: string
          exact_location_url: string | null
          house_number: string | null
          id: string
          location_id: string
          needs: string | null
          notes: string | null
          resident_name: string | null
          summary: string | null
          updated_at: string
          user_address: string | null
          user_id: string
        }
        Insert: {
          accepts_identification?: boolean
          created_at?: string
          exact_location_url?: string | null
          house_number?: string | null
          id?: string
          location_id: string
          needs?: string | null
          notes?: string | null
          resident_name?: string | null
          summary?: string | null
          updated_at?: string
          user_address?: string | null
          user_id: string
        }
        Update: {
          accepts_identification?: boolean
          created_at?: string
          exact_location_url?: string | null
          house_number?: string | null
          id?: string
          location_id?: string
          needs?: string | null
          notes?: string | null
          resident_name?: string | null
          summary?: string | null
          updated_at?: string
          user_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_user_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "mission_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          file_url: string | null
          id: string
          link_url: string | null
          material_type: string
          sort_order: number
          storage_path: string | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          link_url?: string | null
          material_type?: string
          sort_order?: number
          storage_path?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          link_url?: string | null
          material_type?: string
          sort_order?: number
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      missao_inscricoes: {
        Row: {
          acompanhantes: number
          acompanhantes_detalhes: Json
          created_at: string
          id: string
          missao_id: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          acompanhantes?: number
          acompanhantes_detalhes?: Json
          created_at?: string
          id?: string
          missao_id: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          acompanhantes?: number
          acompanhantes_detalhes?: Json
          created_at?: string
          id?: string
          missao_id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missao_inscricoes_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      missao_visualizacoes: {
        Row: {
          created_at: string
          id: string
          missao_id: string
          user_id: string
          visualizou_popup: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          missao_id: string
          user_id: string
          visualizou_popup?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          missao_id?: string
          user_id?: string
          visualizou_popup?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "missao_visualizacoes_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_locations: {
        Row: {
          address: string
          category: string
          created_at: string
          created_by: string | null
          google_maps_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          needs: string | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          category?: string
          created_at?: string
          created_by?: string | null
          google_maps_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          needs?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string
          created_at?: string
          created_by?: string | null
          google_maps_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          needs?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes: {
        Row: {
          ativa: boolean
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          titulo: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string | null
          id?: string
          titulo: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      needs_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "needs_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "needs_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category: string
          configuration: Json | null
          id: string
          image_url: string | null
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
        }
        Insert: {
          category?: string
          configuration?: Json | null
          id?: string
          image_url?: string | null
          order_id: string
          price?: number
          product_id?: string | null
          product_name: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
        }
        Update: {
          category?: string
          configuration?: Json | null
          id?: string
          image_url?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_location: string | null
          delivery_recipient_name: string | null
          delivery_time: string | null
          id: string
          observation: string | null
          pay_later: boolean | null
          payment_status: string | null
          receipt_url: string | null
          status: string
          total_price: number
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          delivery_location?: string | null
          delivery_recipient_name?: string | null
          delivery_time?: string | null
          id?: string
          observation?: string | null
          pay_later?: boolean | null
          payment_status?: string | null
          receipt_url?: string | null
          status?: string
          total_price?: number
          user_email?: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          delivery_location?: string | null
          delivery_recipient_name?: string | null
          delivery_time?: string | null
          id?: string
          observation?: string | null
          pay_later?: boolean | null
          payment_status?: string | null
          receipt_url?: string | null
          status?: string
          total_price?: number
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      org_positions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          function_name: string | null
          id: string
          parent_id: string | null
          profile_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          function_name?: string | null
          id?: string
          parent_id?: string | null
          profile_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          function_name?: string | null
          id?: string
          parent_id?: string | null
          profile_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_positions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page: string
          page_detail: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page: string
          page_detail?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page?: string
          page_detail?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_stock: {
        Row: {
          color: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          size: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          size?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          created_at: string
          email: string
          family_ages: string[] | null
          family_members_count: number | null
          family_name: string | null
          family_names: string[] | null
          full_name: string
          id: string
          notify_events: boolean
          notify_locations: boolean
          notify_reminder_10min: boolean
          notify_reminder_24h: boolean
          notify_reminder_30min: boolean
          notify_reminder_5min: boolean
          notify_reminders: boolean
          phone: string | null
          show_phone_in_org: boolean
          updated_at: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          family_ages?: string[] | null
          family_members_count?: number | null
          family_name?: string | null
          family_names?: string[] | null
          full_name: string
          id: string
          notify_events?: boolean
          notify_locations?: boolean
          notify_reminder_10min?: boolean
          notify_reminder_24h?: boolean
          notify_reminder_30min?: boolean
          notify_reminder_5min?: boolean
          notify_reminders?: boolean
          phone?: string | null
          show_phone_in_org?: boolean
          updated_at?: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          family_ages?: string[] | null
          family_members_count?: number | null
          family_name?: string | null
          family_names?: string[] | null
          full_name?: string
          id?: string
          notify_events?: boolean
          notify_locations?: boolean
          notify_reminder_10min?: boolean
          notify_reminder_24h?: boolean
          notify_reminder_30min?: boolean
          notify_reminder_5min?: boolean
          notify_reminders?: boolean
          phone?: string | null
          show_phone_in_org?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          scheduled_at: string
          sent: boolean
          source_id: string | null
          source_type: string
          target_info: Json | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          scheduled_at: string
          sent?: boolean
          source_id?: string | null
          source_type?: string
          target_info?: Json | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          scheduled_at?: string
          sent?: boolean
          source_id?: string | null
          source_type?: string
          target_info?: Json | null
          title?: string
        }
        Relationships: []
      }
      scheduled_push: {
        Row: {
          body: string
          create_in_app: boolean
          created_at: string
          id: string
          link: string | null
          scheduled_at: string
          sent: boolean
          title: string
        }
        Insert: {
          body: string
          create_in_app?: boolean
          created_at?: string
          id?: string
          link?: string | null
          scheduled_at: string
          sent?: boolean
          title: string
        }
        Update: {
          body?: string
          create_in_app?: boolean
          created_at?: string
          id?: string
          link?: string | null
          scheduled_at?: string
          sent?: boolean
          title?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          available: boolean
          category: string
          colors: string[] | null
          combo_min_quantity: number | null
          combo_price: number | null
          contact_info: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_combo: boolean | null
          is_kit: boolean | null
          name: string
          price: number
          product_type: string | null
          sizes: string[] | null
          updated_at: string
        }
        Insert: {
          available?: boolean
          category?: string
          colors?: string[] | null
          combo_min_quantity?: number | null
          combo_price?: number | null
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_combo?: boolean | null
          is_kit?: boolean | null
          name: string
          price?: number
          product_type?: string | null
          sizes?: string[] | null
          updated_at?: string
        }
        Update: {
          available?: boolean
          category?: string
          colors?: string[] | null
          combo_min_quantity?: number | null
          combo_price?: number | null
          contact_info?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_combo?: boolean | null
          is_kit?: boolean | null
          name?: string
          price?: number
          product_type?: string | null
          sizes?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_drafts: {
        Row: {
          answers: Json
          created_at: string
          current_step: number
          id: string
          question_path: Json
          survey_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_step?: number
          id?: string
          question_path?: Json
          survey_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_step?: number
          id?: string
          question_path?: Json
          survey_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_drafts_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_options: {
        Row: {
          ends_survey: boolean
          id: string
          next_question_id: string | null
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          ends_survey?: boolean
          id?: string
          next_question_id?: string | null
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          ends_survey?: boolean
          id?: string
          next_question_id?: string | null
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_options_next_question_id_fkey"
            columns: ["next_question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          question_text: string
          question_type: string
          sort_order: number
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_text: string
          question_type?: string
          sort_order?: number
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_text?: string
          question_type?: string
          sort_order?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          id: string
          option_id: string | null
          question_id: string
          response_text: string | null
          survey_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id?: string | null
          question_id: string
          response_text?: string | null
          survey_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string | null
          question_id?: string
          response_text?: string | null
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "survey_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_message: string | null
          id: string
          is_anonymous: boolean
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_message?: string | null
          id?: string
          is_anonymous?: boolean
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_message?: string | null
          id?: string
          is_anonymous?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_org_public: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          show_phone_in_org: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          show_phone_in_org?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          show_phone_in_org?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      user_status: {
        Row: {
          email_confirmed_at: string | null
          id: string | null
          last_sign_in_at: string | null
        }
        Insert: {
          email_confirmed_at?: string | null
          id?: string | null
          last_sign_in_at?: string | null
        }
        Update: {
          email_confirmed_at?: string | null
          id?: string | null
          last_sign_in_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_family_request: { Args: { req_id: string }; Returns: undefined }
      decrease_stock: {
        Args: {
          p_color: string
          p_product_id: string
          p_quantity: number
          p_size: string
        }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_created_family_group_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_family_group_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_authorized: { Args: { p_email: string }; Returns: boolean }
      is_family_group_creator: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reject_family_request: { Args: { req_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "missionary"
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
      app_role: ["admin", "missionary"],
    },
  },
} as const
