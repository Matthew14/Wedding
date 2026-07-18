declare module "heic-convert" {
    interface HeicConvertOptions {
        buffer: Buffer | Uint8Array;
        format: "JPEG" | "PNG";
        quality?: number; // 0–1, JPEG only
    }
    export default function convert(options: HeicConvertOptions): Promise<ArrayBuffer>;
}
