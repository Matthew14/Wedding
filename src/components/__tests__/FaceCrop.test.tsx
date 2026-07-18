import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FaceCrop } from "../FaceCrop";

const box = { left: 0.4, top: 0.2, width: 0.2, height: 0.3 };

describe("FaceCrop", () => {
    it("scales and offsets the image so the padded box fills the frame", () => {
        const { container } = render(
            <FaceCrop src="https://cdn/t.jpg" box={box} imgWidth={1000} imgHeight={800} size={100} />
        );
        const img = container.querySelector("img")!;

        // Longest padded side: max(0.2*1000, 0.3*800) = 240px * 1.4 = 336px
        // crop window; scale = 100/336.
        const scale = 100 / 336;
        expect(img).not.toBeNull();
        expect(img.style.width).toBe(`${1000 * scale}px`);
        expect(img.style.height).toBe(`${800 * scale}px`);
        // Face centre (500, 280) maps to the frame centre (50, 50).
        expect(parseFloat(img.style.left)).toBeCloseTo(50 - 500 * scale, 5);
        expect(parseFloat(img.style.top)).toBeCloseTo(50 - 280 * scale, 5);
    });

    it("renders an empty placeholder without src or dimensions", () => {
        const { container } = render(
            <FaceCrop src={null} box={box} imgWidth={null} imgHeight={null} />
        );
        expect(container.querySelector("img")).toBeNull();
    });

    it("renders an empty placeholder for a degenerate bounding box", () => {
        const { container } = render(
            <FaceCrop
                src="https://cdn/t.jpg"
                box={{ left: 0.5, top: 0.5, width: 0, height: 0.2 }}
                imgWidth={1000}
                imgHeight={800}
            />
        );
        expect(container.querySelector("img")).toBeNull();
    });
});
