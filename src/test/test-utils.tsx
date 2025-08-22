import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { AuthProvider } from "@/contexts/AuthContext";
import { vi } from "vitest";

// Mock Supabase client for testing
const mockSupabaseClient = {
    auth: {
        getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
        }),
        onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
    },
    from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
    })),
};

vi.mock("@/utils/supabase/client", () => ({
    createClient: () => mockSupabaseClient,
}));

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <MantineProvider>
            <AuthProvider>{children}</AuthProvider>
        </MantineProvider>
    );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
    render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
export { mockSupabaseClient };
