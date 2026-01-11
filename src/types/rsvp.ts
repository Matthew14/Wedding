export interface RSVPFormData {
    accepted: boolean;
    invitees: { id: number; name: string; coming: boolean }[];
    staying_villa: string;
    dietary_restrictions: string;
    song_request: string;
    travel_plans: string;
    message: string;
}

export interface Invitee {
    id: number;
    first_name: string;
    last_name: string;
    is_primary: boolean;
}

export interface DatabaseRSVPResponse {
    invitees: Invitee[];
    accepted: boolean;
    rsvpId: number;
    invitationId: number;
    stayingVilla: boolean;
    dietaryRestrictions: string;
    songRequest: string;
    travelPlans: string;
    message: string;
    updatedAt: string | null;
    villaOffered: boolean;
    inviteeResponses?: { [inviteeId: number]: boolean };
}
