interface HighlightedSeat {
    tableNumber: string;
    seatNumber: number;
    isOwn: boolean;
}

interface SeatingMapProps {
    highlightedSeats?: HighlightedSeat[];
}

const R = 14;

const TABLES = [
    { id: "L1", x: 170, y: 112, w: 172, h: 58 },
    { id: "L2", x: 458, y: 112, w: 172, h: 58 },
    { id: "L3", x: 152, y: 192, w: 92, h: 184 },
    { id: "L4", x: 556, y: 192, w: 92, h: 184 },
    { id: "L5", x: 152, y: 400, w: 92, h: 192 },
    { id: "L6", x: 556, y: 400, w: 92, h: 192 },
];

// Seat positions match the physical chart layout.
// L1/L2: seats along north edge. L3/L5: west=outside, east=inside.
// L4/L6: west=inside, east=outside.
const SEATS = [
    { t: "L1", s: 1,  x: 148, y: 90  },
    { t: "L1", s: 2,  x: 213, y: 90  },
    { t: "L1", s: 3,  x: 251, y: 90  },
    { t: "L1", s: 4,  x: 289, y: 90  },
    { t: "L1", s: 5,  x: 327, y: 90  },
    { t: "L2", s: 1,  x: 473, y: 90  },
    { t: "L2", s: 2,  x: 511, y: 90  },
    { t: "L2", s: 3,  x: 549, y: 90  },
    { t: "L2", s: 4,  x: 587, y: 90  },
    { t: "L2", s: 5,  x: 652, y: 90  },
    { t: "L3", s: 1,  x: 120, y: 213 },
    { t: "L3", s: 2,  x: 120, y: 250 },
    { t: "L3", s: 3,  x: 120, y: 287 },
    { t: "L3", s: 4,  x: 120, y: 324 },
    { t: "L3", s: 5,  x: 120, y: 361 },
    { t: "L3", s: 6,  x: 261, y: 228 },
    { t: "L3", s: 7,  x: 261, y: 283 },
    { t: "L3", s: 8,  x: 261, y: 338 },
    { t: "L4", s: 1,  x: 539, y: 228 },
    { t: "L4", s: 2,  x: 539, y: 283 },
    { t: "L4", s: 3,  x: 539, y: 338 },
    { t: "L4", s: 4,  x: 680, y: 213 },
    { t: "L4", s: 5,  x: 680, y: 250 },
    { t: "L4", s: 6,  x: 680, y: 287 },
    { t: "L4", s: 7,  x: 680, y: 324 },
    { t: "L4", s: 8,  x: 680, y: 361 },
    { t: "L5", s: 1,  x: 120, y: 420 },
    { t: "L5", s: 2,  x: 120, y: 459 },
    { t: "L5", s: 3,  x: 120, y: 498 },
    { t: "L5", s: 4,  x: 120, y: 537 },
    { t: "L5", s: 5,  x: 120, y: 576 },
    { t: "L5", s: 6,  x: 261, y: 420 },
    { t: "L5", s: 7,  x: 261, y: 459 },
    { t: "L5", s: 8,  x: 261, y: 498 },
    { t: "L5", s: 9,  x: 261, y: 537 },
    { t: "L5", s: 10, x: 261, y: 576 },
    { t: "L6", s: 1,  x: 539, y: 420 },
    { t: "L6", s: 2,  x: 539, y: 459 },
    { t: "L6", s: 3,  x: 539, y: 498 },
    { t: "L6", s: 4,  x: 539, y: 537 },
    { t: "L6", s: 5,  x: 539, y: 576 },
    { t: "L6", s: 6,  x: 680, y: 420 },
    { t: "L6", s: 7,  x: 680, y: 459 },
    { t: "L6", s: 8,  x: 680, y: 498 },
    { t: "L6", s: 9,  x: 680, y: 537 },
    { t: "L6", s: 10, x: 680, y: 576 },
];

export function SeatingMap({ highlightedSeats = [] }: SeatingMapProps) {
    const highlights = new Map(
        highlightedSeats.map((h) => [`${h.tableNumber}-${h.seatNumber}`, h.isOwn])
    );

    return (
        <svg
            viewBox="0 0 800 610"
            width="100%"
            style={{ display: "block" }}
            aria-label="Venue seating map"
        >
            <rect width="800" height="610" fill="#f0ebe0" rx="8" />

            {TABLES.map((t) => (
                <g key={t.id}>
                    <rect
                        x={t.x} y={t.y} width={t.w} height={t.h}
                        rx={3} fill="white"
                        stroke="rgba(139,115,85,0.4)" strokeWidth={1.5}
                    />
                    <text
                        x={t.x + t.w / 2} y={t.y + t.h / 2 + 6}
                        textAnchor="middle" fontSize={15}
                        fill="rgba(109,90,68,0.65)"
                        fontFamily="Georgia, serif" fontWeight="500"
                    >
                        {t.id}
                    </text>
                </g>
            ))}

            {SEATS.map((seat) => {
                const key = `${seat.t}-${seat.s}`;
                const state = highlights.get(key);
                const isOwn = state === true;
                const isParty = state === false;
                return (
                    <circle
                        key={key}
                        cx={seat.x} cy={seat.y} r={R}
                        fill={isOwn ? "#c9a84c" : isParty ? "rgba(201,168,76,0.4)" : "#e4ddd0"}
                        stroke={isOwn ? "#6d5a44" : isParty ? "#c9a84c" : "rgba(139,115,85,0.3)"}
                        strokeWidth={isOwn ? 2.5 : isParty ? 2 : 1}
                    />
                );
            })}
        </svg>
    );
}
