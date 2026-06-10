export interface Photo {
    id: string;
    invitation_code: string;
    s3_key: string;
    thumbnail_key: string | null;
    file_name: string;
    width: number | null;
    height: number | null;
    size_bytes: number | null;
    taken_at: string | null;
    category_id: string | null;
    status: "pending" | "approved" | "rejected";
    uploaded_at: string;
    approved_at: string | null;
    approved_by: string | null;
}

export interface PhotoCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    event_day: "friday" | "saturday" | "sunday" | null;
    cover_photo_id: string | null;
    sort_order: number;
    cover_thumbnail_url: string | null;
}

export interface UploadUrlRequest {
    code: string;
    fileName: string;
    contentType: "image/jpeg" | "image/png" | "image/heic";
    sizeBytes: number;
}

export interface UploadUrlResponse {
    uploadUrl: string;
    photoId: string;
    key: string;
}
