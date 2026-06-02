import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test/test-utils";

vi.mock("next/navigation", () => ({
    usePathname: vi.fn(() => "/"),
    useRouter: vi.fn(() => ({
        push: vi.fn(),
        replace: vi.fn(),
    })),
}));

vi.mock("../Navigation.module.css", () => ({
    default: {
        header: "header",
        link: "link",
        inner: "inner",
        dropdown: "dropdown",
    },
}));

import { Navigation } from "../Navigation";

describe("Navigation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders navigation links", () => {
        render(<Navigation />);
        expect(screen.getByRole("link", { name: "Location" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Schedule" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "FAQs" })).toBeInTheDocument();
    });

    it("does not render RSVP link", () => {
        render(<Navigation />);
        expect(screen.queryByRole("link", { name: "RSVP" })).not.toBeInTheDocument();
    });

    it("has correct href attributes", () => {
        render(<Navigation />);
        expect(screen.getByRole("link", { name: "Location" })).toHaveAttribute("href", "/location");
        expect(screen.getByRole("link", { name: "Schedule" })).toHaveAttribute("href", "/schedule");
        expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "/faqs");
    });

    it("has proper banner role for accessibility", () => {
        render(<Navigation />);
        expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("renders mobile menu button", () => {
        render(<Navigation />);
        expect(screen.getByRole("button", { name: /open navigation menu/i })).toBeInTheDocument();
    });

    it("renders wedding title", () => {
        render(<Navigation />);
        expect(screen.getByRole("link", { name: "Rebecca & Matthew" })).toBeInTheDocument();
    });

    it("renders skip link for accessibility", () => {
        render(<Navigation />);
        const skipLink = screen.getByRole("link", { name: "Skip to main content" });
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    it("does not render a Dashboard button (admin-only, bookmarked directly)", () => {
        render(<Navigation />);
        expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    });
});
