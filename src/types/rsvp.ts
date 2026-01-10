export interface RSVPFormData {
    accepted: boolean;
    invitees: { id: string; name: string; coming: boolean }[];
    staying_villa: string;
    dietary_restrictions: string;
    song_request: string;
    travel_plans: string;
    message: string;
}

export interface Invitee {
    id: string;
    first_name: string;
    last_name: string;
    is_primary: boolean;
}

export interface DatabaseRSVPResponse {
    invitees: Invitee[];
    accepted: boolean;
    rsvpId: string;
    invitationId: string;
    stayingVilla: boolean;
    dietaryRestrictions: string;
    songRequest: string;
    travelPlans: string;
    message: string;
    updatedAt: string | null;
    villaOffered: boolean;
    inviteeResponses?: { [inviteeId: string]: boolean };
}
