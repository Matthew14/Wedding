import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

import { vi } from "vitest";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
        prefetch: vi.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
    default: (props: { src: string; alt: string; [key: string]: unknown }) => {
        const { src, alt, ...rest } = props;
        return React.createElement("img", { src, alt, ...rest });
    },
}));

vi.mock("process", () => ({
    env: {
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://test:test@localhost:5432/wedding_test",
        AWS_REGION: "eu-west-1",
        COGNITO_USER_POOL_ID: "eu-west-1_TEST",
        COGNITO_CLIENT_ID: "test-client-id",
        COGNITO_CLIENT_SECRET: "test-client-secret",
    },
}));

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

afterEach(() => {
    cleanup();
});
