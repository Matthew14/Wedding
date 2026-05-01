interface HighlightedSeat {
    tableNumber: string;
    seatNumber: number;
    isOwn: boolean;
    name: string;
}

interface SeatClickInfo {
    name: string;
    tableNumber: string;
    seatNumber: number;
}

interface SeatingMapProps {
    allSeats?: SeatClickInfo[];
    highlightedSeats?: HighlightedSeat[];
    onSeatClick?: (info: SeatClickInfo) => void;
}

// Bride at right end of table 1, groom at left end of table 2, adjacent at the shared edge
// Positions 6 and 7 in the 12-seat row (45px spacing from 153)
const COUPLE_SEATS = [
    { key: "bride", x: 378, y: 88, label: "Bride" },
    { key: "groom", x: 423, y: 88, label: "Groom" },
];

// Layout constants — edges meet to form a connected U-shape
const LX   = 148;   // left outer edge (L1 left, L3/L5 left)
const RX   = 652;   // right outer edge (L2 right, L4/L6 right)
const SW   = 108;   // side table column width
const TY   = 110;   // top of L1/L2
const TH   = 72;    // height of L1/L2
const SY   = TY + TH;   // 182 — side tables start here
const DY   = 400;   // dividing line between L3/L4 and L5/L6
const BY   = 616;   // bottom of L5/L6
const GAP  = 0;     // tables 1 and 2 share an edge
const MID  = (LX + RX) / 2;  // 400

// Pill dimensions: "v" = tall (top-row seats), "h" = wide (side seats)
const VW = 26, VH = 36;
const HW = 36, HH = 26;

const TABLES = [
    { id: "1", x: LX,        y: TY, w: MID - LX - GAP / 2,   h: TH },
    { id: "2", x: MID + GAP / 2, y: TY, w: RX - MID - GAP / 2, h: TH },
    { id: "3", x: LX,        y: SY, w: SW, h: DY - SY },
    { id: "4", x: RX - SW,   y: SY, w: SW, h: DY - SY },
    { id: "5", x: LX,        y: DY, w: SW, h: BY - DY },
    { id: "6", x: RX - SW,   y: DY, w: SW, h: BY - DY },
];

const SEATS = [
    // 1 — 12-seat row at 45px spacing across both tables; T1 seats occupy positions 1-5
    { t: "1", s: 1,  x: 153, y: 88,  o: "v" },
    { t: "1", s: 2,  x: 198, y: 88,  o: "v" },
    { t: "1", s: 3,  x: 243, y: 88,  o: "v" },
    { t: "1", s: 4,  x: 288, y: 88,  o: "v" },
    { t: "1", s: 5,  x: 333, y: 88,  o: "v" },
    // 2 — T2 seats occupy positions 8-12; s1 is groom (couple seat), guests start at s2
    { t: "2", s: 2,  x: 468, y: 88,  o: "v" },
    { t: "2", s: 3,  x: 513, y: 88,  o: "v" },
    { t: "2", s: 4,  x: 558, y: 88,  o: "v" },
    { t: "2", s: 5,  x: 603, y: 88,  o: "v" },
    { t: "2", s: 6,  x: 648, y: 88,  o: "v" },
    // 3 — west (outer) and east (inner)
    { t: "3", s: 1,  x: 128, y: 208, o: "h" },
    { t: "3", s: 2,  x: 128, y: 248, o: "h" },
    { t: "3", s: 3,  x: 128, y: 291, o: "h" },
    { t: "3", s: 4,  x: 128, y: 338, o: "h" },
    { t: "3", s: 5,  x: 128, y: 376, o: "h" },
    { t: "3", s: 6,  x: 276, y: 291, o: "h" },
    { t: "3", s: 7,  x: 276, y: 338, o: "h" },
    { t: "3", s: 8,  x: 276, y: 376, o: "h" },
    // 4 — west (inner) and east (outer)
    { t: "4", s: 1,  x: 524, y: 291, o: "h" },
    { t: "4", s: 2,  x: 524, y: 338, o: "h" },
    { t: "4", s: 3,  x: 524, y: 376, o: "h" },
    { t: "4", s: 4,  x: 672, y: 208, o: "h" },
    { t: "4", s: 5,  x: 672, y: 248, o: "h" },
    { t: "4", s: 6,  x: 672, y: 291, o: "h" },
    { t: "4", s: 7,  x: 672, y: 338, o: "h" },
    { t: "4", s: 8,  x: 672, y: 376, o: "h" },
    // 5 — west (outer) and east (inner)
    { t: "5", s: 1,  x: 128, y: 418, o: "h" },
    { t: "5", s: 2,  x: 128, y: 460, o: "h" },
    { t: "5", s: 3,  x: 128, y: 504, o: "h" },
    { t: "5", s: 4,  x: 128, y: 550, o: "h" },
    { t: "5", s: 5,  x: 128, y: 590, o: "h" },
    { t: "5", s: 6,  x: 276, y: 418, o: "h" },
    { t: "5", s: 7,  x: 276, y: 460, o: "h" },
    { t: "5", s: 8,  x: 276, y: 504, o: "h" },
    { t: "5", s: 9,  x: 276, y: 550, o: "h" },
    { t: "5", s: 10, x: 276, y: 590, o: "h" },
    // 6 — west (inner) and east (outer)
    { t: "6", s: 1,  x: 524, y: 418, o: "h" },
    { t: "6", s: 2,  x: 524, y: 460, o: "h" },
    { t: "6", s: 3,  x: 524, y: 504, o: "h" },
    { t: "6", s: 4,  x: 524, y: 550, o: "h" },
    { t: "6", s: 5,  x: 524, y: 590, o: "h" },
    { t: "6", s: 6,  x: 672, y: 418, o: "h" },
    { t: "6", s: 7,  x: 672, y: 460, o: "h" },
    { t: "6", s: 8,  x: 672, y: 504, o: "h" },
    { t: "6", s: 9,  x: 672, y: 550, o: "h" },
    { t: "6", s: 10, x: 672, y: 590, o: "h" },
];

export function SeatingMap({ allSeats = [], highlightedSeats = [], onSeatClick }: SeatingMapProps) {
    const all = new Map(
        allSeats.map((s) => [`${s.tableNumber}-${s.seatNumber}`, s])
    );
    const highlights = new Map(
        highlightedSeats.map((h) => [`${h.tableNumber}-${h.seatNumber}`, h])
    );

    return (
        <svg
            viewBox="0 0 800 640"
            width="100%"
            style={{ display: "block" }}
            aria-label="Venue seating map"
        >
            <rect width="800" height="640" fill="#f0ebe0" rx="8" />

            {TABLES.map((t) => (
                <g key={t.id}>
                    <rect
                        x={t.x} y={t.y} width={t.w} height={t.h}
                        fill="white"
                        stroke="rgba(139,115,85,0.4)" strokeWidth={1.5}
                    />
                    <text
                        x={t.x + t.w / 2} y={t.y + t.h / 2 + 8}
                        textAnchor="middle" fontSize={22}
                        fill="rgba(109,90,68,0.65)"
                        fontFamily="Georgia, serif" fontWeight="500"
                    >
                        {t.id}
                    </text>
                </g>
            ))}

            {SEATS.map((seat) => {
                const key = `${seat.t}-${seat.s}`;
                const highlight = highlights.get(key);
                const isOwn   = highlight?.isOwn === true;
                const isParty = highlight !== undefined && !isOwn;

                const w = seat.o === "v" ? VW : HW;
                const h = seat.o === "v" ? VH : HH;
                const r = Math.min(w, h) / 2;

                const clickable = highlight ?? all.get(key);

                return (
                    <rect
                        key={key}
                        x={seat.x - w / 2} y={seat.y - h / 2}
                        width={w} height={h} rx={r}
                        fill={isOwn ? "#c9a84c" : isParty ? "rgba(201,168,76,0.4)" : "#e4ddd0"}
                        stroke={isOwn ? "#6d5a44" : isParty ? "#c9a84c" : "rgba(139,115,85,0.3)"}
                        strokeWidth={isOwn ? 2.5 : isParty ? 2 : 1}
                        style={clickable ? { cursor: "pointer" } : undefined}
                        onClick={clickable ? () => onSeatClick?.({
                            name: clickable.name,
                            tableNumber: clickable.tableNumber,
                            seatNumber: clickable.seatNumber,
                        }) : undefined}
                    />
                );
            })}

            {/* Bride & groom — positioned in the gap between tables 1 and 2 */}
            {COUPLE_SEATS.map((s) => (
                <rect
                    key={s.key}
                    x={s.x - VW / 2} y={s.y - VH / 2}
                    width={VW} height={VH} rx={VW / 2}
                    fill="#e4ddd0"
                    stroke="rgba(139,115,85,0.3)"
                    strokeWidth={1}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSeatClick?.({ name: s.label, tableNumber: "", seatNumber: 0 })}
                />
            ))}
        </svg>
    );
}
