"use client";

import type { FaceBoundingBox } from "@/types/faces";

interface FaceCropProps {
    src: string | null;
    box: FaceBoundingBox;
    // Natural dimensions of the image at src (the photo's stored thumbnail
    // width/height — the same image the bounding box was measured on).
    imgWidth: number | null;
    imgHeight: number | null;
    size?: number;
}

// Crop a face out of an existing thumbnail with pure CSS — no server-side
// crop pipeline. The image is absolutely positioned and scaled inside a
// fixed square so the (padded) bounding box fills the frame.
export function FaceCrop({ src, box, imgWidth, imgHeight, size = 96 }: FaceCropProps) {
    const frame: React.CSSProperties = {
        width: size,
        height: size,
        overflow: "hidden",
        position: "relative",
        borderRadius: 8,
        backgroundColor: "var(--mantine-color-gray-2)",
        flexShrink: 0,
    };

    if (!src || !imgWidth || !imgHeight) {
        return <div style={frame} />;
    }

    // Pixel-space centre of the face, and a square crop window around it 40%
    // larger than the box's longest side so faces aren't tight-cropped.
    const cx = (box.left + box.width / 2) * imgWidth;
    const cy = (box.top + box.height / 2) * imgHeight;
    const half = (Math.max(box.width * imgWidth, box.height * imgHeight) / 2) * 1.4;
    const scale = size / (2 * half);

    return (
        <div style={frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt=""
                style={{
                    position: "absolute",
                    width: imgWidth * scale,
                    height: imgHeight * scale,
                    left: size / 2 - cx * scale,
                    top: size / 2 - cy * scale,
                    maxWidth: "none",
                }}
            />
        </div>
    );
}
