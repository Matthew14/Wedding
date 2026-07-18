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
    // People an admin has explicitly said this face is NOT (via the By
    // Person reject button). Automated re-matching must never re-attach the
    // face to anyone on this list.
    rejected_invitee_ids?: number[];
    bounding_box: FaceBoundingBox;
    confidence: number;
    indexed_at: string;
}

// What the admin PATCH route applies to every face in a cluster.
export type ClusterAssignment =
    | { invitee_id: number; invitation_id: number }
    | { ignored: true }
    | null; // clear assignment

// A face as rendered by the admin UI: enough to CSS-crop it out of the
// photo's thumbnail (width/height are the thumbnail's dimensions, which is
// what the relative bounding box was measured against).
export interface FaceView {
    face_id: string;
    photo_id: string;
    thumbnail_url: string | null;
    thumbnail_width: number | null;
    thumbnail_height: number | null;
    bounding_box: FaceBoundingBox;
    confidence: number;
}

export interface ClusterSummary {
    cluster_id: string;
    face_count: number;
    invitee_id: number | null;
    invitee_name: string | null;
    ignored: boolean;
    rep_face: FaceView;
}

export interface ClustersResponse {
    clusters: ClusterSummary[];
    progress: {
        total: number; // clusters with a face, excluding ignored
        assigned: number;
        ignored: number;
        unclustered_faces: number; // rows awaiting the clustering phase
    };
}

// A searchable person in the public gallery: anyone (or the dog) with at
// least one assigned face. The face is their highest-confidence detection,
// CSS-cropped as a headshot in the search dropdown.
export interface GalleryPerson {
    invitee_id: number;
    name: string;
    photo_count: number;
    face: FaceView;
}

export interface ClusterDetailResponse {
    cluster_id: string;
    invitee_id: number | null;
    invitee_name: string | null;
    ignored: boolean;
    faces: FaceView[];
}
