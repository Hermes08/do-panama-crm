export interface Client {
    id: number;
    created_at: string;
    full_name: string;
    status: string;
    tag: string;
    budget: number;
    notes: string;
    country: string;
    interest_category: string;
    assigned_to: string;
    zone_project: string;
    last_contact_date?: string;
    next_action_date?: string;
    next_action?: string;
    estimated_travel_date?: string;
    detailed_notes?: string;
    email?: string;
    phone?: string;
}
