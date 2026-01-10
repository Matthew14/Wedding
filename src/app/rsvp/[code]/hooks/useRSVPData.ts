"use client";

import { useState, useEffect } from "react";
import { UseFormReturnType } from "@mantine/form";
import { RSVPFormData, Invitee, DatabaseRSVPResponse } from "@/types";
import { useTracking, RSVPEvents } from "@/hooks";

/**
 * Format guest names with smart surname grouping.
 * Primary guests appear first, and guests with the same surname are grouped together.
 */
function formatGuestNames(invitees: Invitee[]): string {
    if (!invitees || invitees.length === 0) return 'Unknown Guest';

    const sorted = [...invitees].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return 0;
    });

    const surnameGroups = new Map<string, string[]>();
    const surnameOrder: string[] = [];

    for (const inv of sorted) {
        const surname = inv.last_name;
        if (!surnameGroups.has(surname)) {
            surnameGroups.set(surname, []);
            surnameOrder.push(surname);
        }
        surnameGroups.get(surname)!.push(inv.first_name);
    }

    const formattedGroups = surnameOrder.map(surname => {
        const firstNames = surnameGroups.get(surname)!;
        const joinedFirstNames = firstNames.length === 1
            ? firstNames[0]
            : firstNames.length === 2
                ? firstNames.join(' & ')
                : `${firstNames.slice(0, -1).join(', ')} & ${firstNames[firstNames.length - 1]}`;
        return `${joinedFirstNames} ${surname}`;
    });

    if (formattedGroups.length === 1) return formattedGroups[0];
    if (formattedGroups.length === 2) return formattedGroups.join(' & ');
    return `${formattedGroups.slice(0, -1).join(', ')} & ${formattedGroups[formattedGroups.length - 1]}`;
}

interface UseRSVPDataResult {
    loading: boolean;
    error: string;
    guestNames: string;
    villaOffered: boolean;
    infoText: string;
    originalValues: RSVPFormData | null;
    isInitialLoad: boolean;
}

interface UseRSVPDataOptions {
    code: string;
    form: UseFormReturnType<RSVPFormData>;
}

export function useRSVPData({ code, form }: UseRSVPDataOptions): UseRSVPDataResult {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [infoText, setInfoText] = useState("");
    const [originalValues, setOriginalValues] = useState<RSVPFormData | null>(null);
    const [guestNames, setGuestNames] = useState<string>("");
    const [villaOffered, setVillaOffered] = useState<boolean>(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const { trackEvent, identifyUser, setGroup } = useTracking();

    useEffect(() => {
        const fetchRSVPData = async () => {
            try {
                const response = await fetch(`/api/rsvp/${code}`);

                if (response.ok) {
                    const data: DatabaseRSVPResponse = await response.json();
                    const isReturningUser = !!(data && data.updatedAt);
                    const inviteeCount = data.invitees?.length || 0;

                    const names = formatGuestNames(data.invitees || []);

                    setGuestNames(names);
                    setVillaOffered(data.villaOffered ?? true);

                    identifyUser(code, {
                        rsvp_code: code,
                        guest_names: names,
                        invitee_count: inviteeCount,
                        is_returning_user: isReturningUser,
                    });

                    setGroup('invitation', data.invitationId.toString(), {
                        invitee_count: inviteeCount,
                        guest_names: names,
                    });

                    trackEvent(RSVPEvents.FORM_VIEWED, {
                        code,
                        invitee_count: inviteeCount,
                        is_amendment: isReturningUser,
                    });

                    if (isReturningUser && data.updatedAt) {
                        const formattedDate = new Date(data.updatedAt).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        setInfoText("You're amending your RSVP, last updated on " + formattedDate);

                        const isSingleInvitee = data.invitees?.length === 1;
                        const sortedInvitees = [...(data.invitees || [])].sort((a, b) => {
                            if (a.is_primary && !b.is_primary) return -1;
                            if (!a.is_primary && b.is_primary) return 1;
                            return 0;
                        });
                        const inviteesWithResponses = sortedInvitees.map((inv: Invitee & { coming?: boolean }) => ({
                            id: inv.id,
                            name: `${inv.first_name} ${inv.last_name}`,
                            coming: isSingleInvitee && data.accepted ? true : (inv.coming ?? false),
                        }));

                        const loadedValues = {
                            accepted: data.accepted,
                            invitees: inviteesWithResponses,
                            staying_villa: !data.villaOffered ? "no" : (data.stayingVilla ? "yes" : "no"),
                            dietary_restrictions: data.dietaryRestrictions ?? "",
                            song_request: data.songRequest ?? "",
                            travel_plans: data.travelPlans ?? "",
                            message: data.message ?? "",
                        };

                        form.setValues(loadedValues);
                        setOriginalValues(loadedValues);

                        trackEvent(RSVPEvents.FORM_AMENDMENT, {
                            code,
                            previous_acceptance: data.accepted,
                            has_dietary: !!data.dietaryRestrictions,
                            has_song: !!data.songRequest,
                            has_travel: !!data.travelPlans,
                            has_message: !!data.message,
                        });
                    } else {
                        // New RSVP - default all invitees to coming since form defaults to accepted=true
                        const sortedInvitees = [...(data.invitees || [])].sort((a, b) => {
                            if (a.is_primary && !b.is_primary) return -1;
                            if (!a.is_primary && b.is_primary) return 1;
                            return 0;
                        });
                        form.setFieldValue("invitees",
                            sortedInvitees.map((inv: Invitee) => ({
                                id: inv.id,
                                name: `${inv.first_name} ${inv.last_name}`,
                                coming: true,
                            }))
                        );
                        if (!data.villaOffered) {
                            form.setFieldValue("staying_villa", "no");
                        }
                    }

                    setIsInitialLoad(false);
                } else {
                    setError("Failed to load RSVP data");
                    trackEvent(RSVPEvents.FORM_LOAD_ERROR, {
                        code,
                        error: 'Failed to load',
                    });
                }
            } catch (err) {
                setError("Something went wrong while loading the form");
                trackEvent(RSVPEvents.FORM_LOAD_ERROR, {
                    code,
                    error: String(err),
                });
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchRSVPData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    return {
        loading,
        error,
        guestNames,
        villaOffered,
        infoText,
        originalValues,
        isInitialLoad,
    };
}
