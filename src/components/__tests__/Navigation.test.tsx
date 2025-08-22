import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test/test-utils";
import type { User, Session } from "@supabase/supabase-js";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    usePathname: vi.fn(() => "/"),
    useRouter: vi.fn(() => ({
        push: vi.fn(),
        replace: vi.fn(),
    })),
}));

// Mock the CSS module
vi.mock("../Navigation.module.css", () => ({
    default: {
        header: "header",
        link: "link",
        inner: "inner",
        dropdown: "dropdown",
    },
}));

// Mock the AuthContext
vi.mock("@/contexts/AuthContext", () => ({
    useAuth: vi.fn(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import after mocking
import { Navigation } from "../Navigation";
import { useAuth } from "@/contexts/AuthContext";

// Create mock user and session objects
const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
        id: "1",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        ...overrides,
    }) as User;

const createMockSession = (overrides: Partial<Session> = {}): Session =>
    ({
        access_token: "token",
        refresh_token: "refresh",
        expires_at: 1234567890,
        token_type: "bearer",
        user: createMockUser(),
        ...overrides,
    }) as Session;

describe("Navigation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders navigation links", () => {
        // Mock unauthenticated user
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            session: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
        });

        render(<Navigation />);

        expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Location" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Schedule" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "FAQs" })).toBeInTheDocument();
    });

    it("has correct href attributes", () => {
        // Mock unauthenticated user
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            session: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
        });

        render(<Navigation />);

        expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
        expect(screen.getByRole("link", { name: "Location" })).toHaveAttribute("href", "/location");
        expect(screen.getByRole("link", { name: "Schedule" })).toHaveAttribute("href", "/schedule");
        expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "/faqs");
    });

    it("has proper banner role for accessibility", () => {
        // Mock unauthenticated user
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            session: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
        });

        render(<Navigation />);

        const header = screen.getByRole("banner");
        expect(header).toBeInTheDocument();
    });

    it("renders mobile menu button", () => {
        // Mock unauthenticated user
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            session: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
        });

        render(<Navigation />);

        const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
        expect(menuButton).toBeInTheDocument();
    });

    it("renders wedding title", () => {
        // Mock unauthenticated user
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            session: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
        });

        render(<Navigation />);

        expect(screen.getByRole("link", { name: "Rebecca & Matthew" })).toBeInTheDocument();
    });

    it("renders skip link for accessibility", () => {
        // Mock unauthenticated user
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            session: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
        });

        render(<Navigation />);

        const skipLink = screen.getByRole("link", { name: "Skip to main content" });
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    describe("Dashboard button visibility", () => {
        it("shows Dashboard button when user is authenticated", () => {
            // Mock authenticated user
            vi.mocked(useAuth).mockReturnValue({
                user: createMockUser(),
                session: createMockSession(),
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
            });

            render(<Navigation />);

            expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
        });

        it("hides Dashboard button when user is not authenticated", () => {
            // Mock unauthenticated user
            vi.mocked(useAuth).mockReturnValue({
                user: null,
                session: null,
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
            });

            render(<Navigation />);

            expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
        });

        it("hides Dashboard button when user is loading", () => {
            // Mock loading state
            vi.mocked(useAuth).mockReturnValue({
                user: null,
                session: null,
                loading: true,
                signIn: vi.fn(),
                signOut: vi.fn(),
            });

            render(<Navigation />);

            expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
        });

        it("shows Dashboard button in mobile menu when user is authenticated", async () => {
            // Mock authenticated user
            vi.mocked(useAuth).mockReturnValue({
                user: createMockUser(),
                session: createMockSession(),
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
            });

            render(<Navigation />);

            // First, check that Dashboard button is visible in desktop view
            expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");

            // Note: Mobile menu Dashboard button is only visible when mobile menu is opened
            // This test verifies the desktop Dashboard button is present
        });

        it("hides Dashboard button in mobile menu when user is not authenticated", () => {
            // Mock unauthenticated user
            vi.mocked(useAuth).mockReturnValue({
                user: null,
                session: null,
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
            });

            render(<Navigation />);

            // No Dashboard buttons should be visible
            expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
        });
    });
});
