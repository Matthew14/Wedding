import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "../../test/test-utils";
import userEvent from "@testing-library/user-event";

vi.mock("../Navigation.module.css", () => ({
    default: {
        header: "header",
        inner: "inner",
    },
}));

const route = vi.hoisted(() => ({ pathname: "/" }));
const galleryFlag = vi.hoisted(() => ({ value: "on" as "on" | "off" | "loading" }));
vi.mock("@/hooks/useGalleryFlag", () => ({
    useGalleryFlag: () => galleryFlag.value,
}));
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
    }),
    usePathname: () => route.pathname,
    useSearchParams: () => new URLSearchParams(),
}));

import { Navigation } from "../Navigation";

const mockFetch = vi.fn();

function stubSession(loggedIn: boolean) {
    mockFetch.mockImplementation((url: string) => {
        if (url === "/api/auth/me") {
            return Promise.resolve(new Response(null, { status: loggedIn ? 200 : 401 }));
        }
        if (url === "/api/auth/logout") {
            loggedIn = false;
            return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
}

describe("Navigation", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", mockFetch);
        stubSession(false);
        route.pathname = "/";
        galleryFlag.value = "on";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        mockFetch.mockReset();
    });

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

    it("hides Dashboard and Logout when logged out", async () => {
        render(<Navigation />);
        await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/auth/me"));
        expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
    });

    it("shows Dashboard and Logout when logged in", async () => {
        stubSession(true);
        render(<Navigation />);
        const dashboard = await screen.findByRole("link", { name: "Dashboard" });
        expect(dashboard).toHaveAttribute("href", "/dashboard");
        expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    });

    it("hides on the homepage when the gallery flag is off and logged out", async () => {
        galleryFlag.value = "off";
        render(<Navigation />);
        await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/auth/me"));
        expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });

    it("shows on the homepage when the gallery flag is off but logged in", async () => {
        galleryFlag.value = "off";
        stubSession(true);
        render(<Navigation />);
        expect(await screen.findByRole("banner")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Gallery" })).not.toBeInTheDocument();
    });

    it("shows on non-home pages even when the gallery flag is off", () => {
        galleryFlag.value = "off";
        route.pathname = "/rsvp";
        render(<Navigation />);
        expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("renders nothing on dashboard routes (dashboard has its own header)", () => {
        stubSession(true);
        route.pathname = "/dashboard/photos";
        render(<Navigation />);
        expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });

    it("keeps the buttons and shows an error when logout fails", async () => {
        mockFetch.mockImplementation((url: string) => {
            if (url === "/api/auth/me") {
                return Promise.resolve(new Response(null, { status: 200 }));
            }
            if (url === "/api/auth/logout") {
                return Promise.resolve(new Response(null, { status: 500 }));
            }
            return Promise.reject(new Error(`Unexpected fetch: ${url}`));
        });
        render(<Navigation />);
        const logout = await screen.findByRole("button", { name: "Logout" });

        await userEvent.click(logout);

        expect(await screen.findByRole("alert")).toHaveTextContent("Logout failed — please try again");
        expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    });

    it("removes Dashboard and Logout after logging out", async () => {
        stubSession(true);
        render(<Navigation />);
        const logout = await screen.findByRole("button", { name: "Logout" });

        await userEvent.click(logout);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
            expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
        });
    });
});
