import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "../../test/test-utils";

const galleryFlag = vi.hoisted(() => ({ value: "on" as "on" | "off" | "loading" }));
vi.mock("@/hooks/useGalleryFlag", () => ({
    useGalleryFlag: () => galleryFlag.value,
}));

const session = vi.hoisted(() => ({
    value: "unauthenticated" as "loading" | "authenticated" | "unauthenticated",
}));
vi.mock("@/hooks/useSession", () => ({
    useSession: () => ({ status: session.value, refresh: vi.fn() }),
}));

const mockNotFound = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
    notFound: () => {
        mockNotFound();
        throw new Error("NEXT_NOT_FOUND");
    },
}));

import { GalleryGate } from "../GalleryGate";

describe("GalleryGate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        galleryFlag.value = "on";
        session.value = "unauthenticated";
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders children when the flag is on", () => {
        render(<GalleryGate>gallery-content</GalleryGate>);
        expect(screen.getByText("gallery-content")).toBeInTheDocument();
    });

    it("404s for guests when the flag is off", () => {
        galleryFlag.value = "off";
        expect(() => render(<GalleryGate>gallery-content</GalleryGate>)).toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
    });

    it("renders children for a logged-in admin even with the flag off", () => {
        galleryFlag.value = "off";
        session.value = "authenticated";
        render(<GalleryGate>gallery-content</GalleryGate>);
        expect(screen.getByText("gallery-content")).toBeInTheDocument();
        expect(mockNotFound).not.toHaveBeenCalled();
    });

    it("shows a loader while the flag resolves", () => {
        galleryFlag.value = "loading";
        render(<GalleryGate>gallery-content</GalleryGate>);
        expect(screen.queryByText("gallery-content")).not.toBeInTheDocument();
        expect(mockNotFound).not.toHaveBeenCalled();
    });

    it("waits for the session before 404ing when the flag is off", () => {
        galleryFlag.value = "off";
        session.value = "loading";
        render(<GalleryGate>gallery-content</GalleryGate>);
        expect(mockNotFound).not.toHaveBeenCalled();
    });

    it("404s instead of spinning forever when the flag never resolves", () => {
        vi.useFakeTimers();
        galleryFlag.value = "loading";
        render(<GalleryGate>gallery-content</GalleryGate>);
        expect(mockNotFound).not.toHaveBeenCalled();

        // A stuck PostHog SDK (e.g. blocked by a content blocker) leaves the
        // flag in "loading" — after the timeout the gate must give up and 404.
        expect(() => {
            act(() => {
                vi.advanceTimersByTime(5001);
            });
        }).toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
    });
});
