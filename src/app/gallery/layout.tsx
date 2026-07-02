import { GalleryGate } from "@/components/GalleryGate";

// Gates every /gallery route (gallery, upload) behind the show-gallery flag.
export default function GalleryLayout({ children }: { children: React.ReactNode }) {
    return <GalleryGate>{children}</GalleryGate>;
}
