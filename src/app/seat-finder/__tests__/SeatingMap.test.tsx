import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SeatingMap } from "../SeatingMap";

const renderMap = (props: React.ComponentProps<typeof SeatingMap> = {}) =>
    render(
        <MantineProvider>
            <SeatingMap {...props} />
        </MantineProvider>
    );

describe("SeatingMap", () => {
    describe("rendering", () => {
        it("renders an SVG element", () => {
            renderMap();
            expect(document.querySelector("svg")).toBeInTheDocument();
        });

        it("renders table labels 1 through 6", () => {
            renderMap();
            for (const label of ["1", "2", "3", "4", "5", "6"]) {
                // There will be text nodes with the table number inside the SVG
                const nodes = document.querySelectorAll("text");
                const found = Array.from(nodes).some((n) => n.textContent === label);
                expect(found, `Table label "${label}" should be present`).toBe(true);
            }
        });

        it("renders the correct number of regular seat rects", () => {
            renderMap();
            const svg = document.querySelector("svg")!;
            // Count all <rect> children inside the SVG (background + tables + seats + couple seats)
            // We just verify the SVG itself has multiple rects rendered
            const rects = svg.querySelectorAll("rect");
            // background(1) + 6 tables + 46 SEATS + 2 couple seats = 55 minimum
            expect(rects.length).toBeGreaterThanOrEqual(55);
        });

        it("renders bride and groom couple seats", () => {
            const onSeatClick = vi.fn();
            renderMap({ onSeatClick });

            // The couple seats are always rendered with cursor:pointer and fire onSeatClick
            // Click all pointer-cursor rects — the bride/groom ones will call onSeatClick
            // with tableNumber="" and seatNumber=0
            const svg = document.querySelector("svg")!;
            const pointerRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.style.cursor === "pointer"
            );

            // There should be at least 2 couple seats with cursor:pointer even with no props
            expect(pointerRects.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("seat highlighting", () => {
        it("applies gold fill (#c9a84c) to an own seat", () => {
            renderMap({
                highlightedSeats: [
                    { tableNumber: "1", seatNumber: 1, isOwn: true, name: "Alice Smith" },
                ],
            });

            const svg = document.querySelector("svg")!;
            const goldRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.getAttribute("fill") === "#c9a84c"
            );
            expect(goldRects.length).toBe(1);
        });

        it("applies translucent gold fill to a party (non-own) seat", () => {
            renderMap({
                highlightedSeats: [
                    { tableNumber: "1", seatNumber: 2, isOwn: false, name: "Bob Smith" },
                ],
            });

            const svg = document.querySelector("svg")!;
            const partyRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.getAttribute("fill") === "rgba(201,168,76,0.4)"
            );
            expect(partyRects.length).toBe(1);
        });

        it("renders multiple highlighted seats with correct fills", () => {
            renderMap({
                highlightedSeats: [
                    { tableNumber: "1", seatNumber: 1, isOwn: true,  name: "Alice Smith" },
                    { tableNumber: "1", seatNumber: 2, isOwn: false, name: "Bob Smith" },
                    { tableNumber: "1", seatNumber: 3, isOwn: false, name: "Carol Smith" },
                ],
            });

            const svg = document.querySelector("svg")!;
            const ownRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.getAttribute("fill") === "#c9a84c"
            );
            const partyRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.getAttribute("fill") === "rgba(201,168,76,0.4)"
            );
            expect(ownRects.length).toBe(1);
            expect(partyRects.length).toBe(2);
        });
    });

    describe("seat click interactions", () => {
        it("calls onSeatClick with correct info when clicking a highlighted seat", async () => {
            const user = userEvent.setup();
            const onSeatClick = vi.fn();

            renderMap({
                highlightedSeats: [
                    { tableNumber: "1", seatNumber: 1, isOwn: true, name: "Alice Smith" },
                ],
                onSeatClick,
            });

            const svg = document.querySelector("svg")!;
            // The own seat has fill="#c9a84c"
            const ownRect = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).find(
                (r) => r.getAttribute("fill") === "#c9a84c"
            )!;

            await user.click(ownRect);

            expect(onSeatClick).toHaveBeenCalledOnce();
            expect(onSeatClick).toHaveBeenCalledWith({
                name: "Alice Smith",
                tableNumber: "1",
                seatNumber: 1,
            });
        });

        it("calls onSeatClick with correct info when clicking an allSeats seat", async () => {
            const user = userEvent.setup();
            const onSeatClick = vi.fn();

            renderMap({
                allSeats: [{ tableNumber: "2", seatNumber: 1, name: "Venue Guest" }],
                onSeatClick,
            });

            const svg = document.querySelector("svg")!;
            // allSeats seats get cursor:pointer but keep the default fill (#e4ddd0)
            const pointerRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.style.cursor === "pointer" && r.getAttribute("fill") === "#e4ddd0"
            );

            // Click the first one that corresponds to table 2, seat 1
            // Since we only have one allSeats entry, only that rect should be pointer+default-fill
            expect(pointerRects.length).toBeGreaterThanOrEqual(1);
            await user.click(pointerRects[0]);

            expect(onSeatClick).toHaveBeenCalledWith({
                name: "Venue Guest",
                tableNumber: "2",
                seatNumber: 1,
            });
        });

        it("does not call onSeatClick when clicking an unoccupied seat", async () => {
            const user = userEvent.setup();
            const onSeatClick = vi.fn();

            renderMap({ onSeatClick });

            const svg = document.querySelector("svg")!;
            // Seats with no allSeats/highlighted entry have no onClick handler
            const plainRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) =>
                    r.getAttribute("fill") === "#e4ddd0" &&
                    r.style.cursor !== "pointer"
            );

            if (plainRects.length > 0) {
                await user.click(plainRects[0]);
                expect(onSeatClick).not.toHaveBeenCalled();
            }
        });

        it("calls onSeatClick with Bride info when clicking the bride couple seat", async () => {
            const user = userEvent.setup();
            const onSeatClick = vi.fn();

            renderMap({ onSeatClick });

            // Both couple seats are rendered with cursor:pointer (no allSeats data means
            // only the couple seats have cursor:pointer in a bare render)
            const svg = document.querySelector("svg")!;
            const coupleRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.style.cursor === "pointer"
            );

            // Bride is rendered first (lower x value — 378 vs 423)
            expect(coupleRects.length).toBeGreaterThanOrEqual(2);
            await user.click(coupleRects[0]);

            expect(onSeatClick).toHaveBeenCalledWith({
                name: "Bride",
                tableNumber: "",
                seatNumber: 0,
            });
        });

        it("calls onSeatClick with Groom info when clicking the groom couple seat", async () => {
            const user = userEvent.setup();
            const onSeatClick = vi.fn();

            renderMap({ onSeatClick });

            const svg = document.querySelector("svg")!;
            const coupleRects = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).filter(
                (r) => r.style.cursor === "pointer"
            );

            expect(coupleRects.length).toBeGreaterThanOrEqual(2);
            await user.click(coupleRects[1]);

            expect(onSeatClick).toHaveBeenCalledWith({
                name: "Groom",
                tableNumber: "",
                seatNumber: 0,
            });
        });
    });

    describe("default props", () => {
        it("renders without crashing when no props are supplied", () => {
            expect(() => renderMap()).not.toThrow();
        });

        it("renders without crashing when onSeatClick is not provided", async () => {
            const user = userEvent.setup();

            renderMap({
                highlightedSeats: [
                    { tableNumber: "1", seatNumber: 1, isOwn: true, name: "Alice" },
                ],
            });

            const svg = document.querySelector("svg")!;
            const ownRect = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).find(
                (r) => r.getAttribute("fill") === "#c9a84c"
            )!;

            // Clicking should not throw even without onSeatClick
            await expect(user.click(ownRect)).resolves.not.toThrow();
        });
    });
});
