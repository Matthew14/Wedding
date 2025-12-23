'use client';

import { Button, Menu } from "@mantine/core";
import { IconCalendar, IconChevronDown } from "@tabler/icons-react";
import { useTracking, RSVPEvents } from "@/hooks";

interface AddToCalendarButtonProps {
    rsvpCode: string | null;
}

const WEDDING_EVENT = {
    title: "Rebecca & Matthew's Wedding",
    description: "Wedding celebration at Gran Villa Rosa, Vilanova i la Geltrú, Spain.",
    location: "Gran Villa Rosa, Vilanova i la Geltrú, Spain",
    url: "https://maps.google.com/?q=Gran+Villa+Rosa,+Vilanova+i+la+Geltrú,+Spain",
    // Friday May 22 to Sunday May 24, 2026 (all-day event)
    // Note: iCal end dates are exclusive, so May 25 means "through May 24"
    startDate: "20260522",
    endDate: "20260525",
};

export function AddToCalendarButton({ rsvpCode }: AddToCalendarButtonProps) {
    const { trackEvent } = useTracking();

    // Don't render if no RSVP code available
    if (!rsvpCode) {
        return null;
    }

    const generateGoogleCalendarUrl = () => {
        const params = new URLSearchParams({
            action: "TEMPLATE",
            text: WEDDING_EVENT.title,
            dates: `${WEDDING_EVENT.startDate}/${WEDDING_EVENT.endDate}`,
            details: WEDDING_EVENT.description,
            location: WEDDING_EVENT.location,
            ctz: "Europe/Madrid",
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    };

    const handleIcsDownload = async (calendarType: string) => {
        if (!rsvpCode) {
            console.error('No RSVP code available');
            trackEvent(RSVPEvents.CALENDAR_DOWNLOAD_ERROR, {
                code: rsvpCode,
                calendar_type: calendarType,
                error: 'No RSVP code',
            });
            return;
        }

        try {
            const response = await fetch(`/api/calendar/${rsvpCode}`);
            if (!response.ok) {
                throw new Error(`Failed to download calendar: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rebecca-matthew-wedding.ics';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            trackEvent(RSVPEvents.CALENDAR_DOWNLOADED, {
                code: rsvpCode,
                calendar_type: calendarType,
            });
        } catch (error) {
            console.error('Error downloading calendar file:', error);
            trackEvent(RSVPEvents.CALENDAR_DOWNLOAD_ERROR, {
                code: rsvpCode,
                calendar_type: calendarType,
                error: String(error),
            });
        }
    };

    return (
        <Menu shadow="md" width={250}>
            <Menu.Target>
                <Button
                    variant="light"
                    leftSection={<IconCalendar size={20} />}
                    rightSection={<IconChevronDown size={16} />}
                    size="lg"
                    fullWidth
                    style={{
                        backgroundColor: "rgba(139, 115, 85, 0.1)",
                        color: "var(--gold-dark)",
                        fontWeight: 500,
                    }}
                    onClick={() => {
                        trackEvent(RSVPEvents.CALENDAR_CLICKED, {
                            code: rsvpCode,
                        });
                    }}
                >
                    Add to Calendar
                </Button>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>Choose your calendar</Menu.Label>
                <Menu.Item
                    leftSection={<IconCalendar size={16} />}
                    onClick={() => {
                        window.open(generateGoogleCalendarUrl(), '_blank');
                        trackEvent(RSVPEvents.CALENDAR_DOWNLOADED, {
                            code: rsvpCode,
                            calendar_type: 'google',
                        });
                    }}
                >
                    Google Calendar
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconCalendar size={16} />}
                    onClick={() => handleIcsDownload('apple')}
                >
                    Apple Calendar
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconCalendar size={16} />}
                    onClick={() => handleIcsDownload('outlook')}
                >
                    Outlook
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                    leftSection={<IconCalendar size={16} />}
                    onClick={() => handleIcsDownload('ics')}
                >
                    Download .ics File
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
