import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test/test-utils";

vi.mock("../Navigation.module.css", () => ({
    default: {
        header: "header",
        inner: "inner",
    },
}));

import { Navigation } from "../Navigation";

describe("Navigation", () => {
    it("renders wedding title linking to home", () => {
        render(<Navigation />);
        const link = screen.getByRole("link", { name: "Rebecca & Matthew" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/");
    });

    it("has proper banner role for accessibility", () => {
        render(<Navigation />);
        expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("renders skip link for accessibility", () => {
        render(<Navigation />);
        const skipLink = screen.getByRole("link", { name: "Skip to main content" });
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    it("does not render removed page links", () => {
        render(<Navigation />);
        expect(screen.queryByRole("link", { name: "Location" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Schedule" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "FAQs" })).not.toBeInTheDocument();
    });

    it("does not render mobile menu button", () => {
        render(<Navigation />);
        expect(screen.queryByRole("button", { name: /navigation menu/i })).not.toBeInTheDocument();
    });
});
