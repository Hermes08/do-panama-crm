export interface Client {
    id: string; // UUID
    legacy_id?: string;
    full_name: string;
    origin?: string;
    type?: string;
    status?: string;
    interest_category?: string;
    zone_project?: string;
    budget?: string;
    closure_probability?: string;
    tag?: string;
    last_contact_date?: string;
    next_action?: string;
    next_action_date?: string;
    assigned_to?: string;
    estimated_travel_date?: string;
    internal_notes?: string;
    detailed_notes?: string;
    created_at?: string;
    updated_at?: string;
    // Additional fields for AI logic and data completeness
    email?: string;
    phone?: string;
    notes?: string;
    country?: string;
}

export interface ClientVersion {
    id: string;
    client_id: string;
    changed_by?: string;
    change_type: 'manual' | 'ai_edit';
    change_summary?: string;
    snapshot_data: Client;
    created_at: string;
}

export interface PropertyData {
    title: string;
    price: string;
    location: string;
    bedrooms?: string;
    bathrooms?: string;
    area?: string;
    description: string;
    features: string[];
    images: string[];
    source: string;
}

export interface PropertyPresentation {
    id: string;
    user_id: string | null;
    title: string;
    slug: string;
    data: PropertyData;
    views: number;
    created_at: string;
    updated_at: string;
    is_public: boolean;
    password: string | null;
    expires_at: string | null;
}
