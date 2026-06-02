import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { vi } from "vitest";

const mockDb = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
};

vi.mock("@/utils/db/client", () => ({
    getDb: () => mockDb,
}));

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <MantineProvider>{children}</MantineProvider>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
    render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
export { mockDb };
