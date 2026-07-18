// Rekognition-relative bounding box: all values are fractions of the image
// dimensions, so a crop computed from the thumbnail needs no unit conversion.
export interface FaceBoundingBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

// One row per face Rekognition detected in a photo. Cluster assignment
// (invitee_id / invitation_id / ignored) is denormalized onto every face row.
export interface PhotoFace {
    face_id: string;
    photo_id: string;
    cluster_id: string;
    invitee_id?: number;
    invitation_id?: number;
    ignored?: boolean;
    bounding_box: FaceBoundingBox;
    confidence: number;
    indexed_at: string;
}

// What the admin PATCH route applies to every face in a cluster.
export type ClusterAssignment =
    | { invitee_id: number; invitation_id: number }
    | { ignored: true }
    | null; // clear assignment
