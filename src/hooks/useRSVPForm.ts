import { useForm } from "@mantine/form";
import { RSVPFormData } from "@/types";

export const useRSVPForm = () => {
    const form = useForm<RSVPFormData>({
        initialValues: {
            accepted: true,
            invitees: [],
            staying_villa: "yes",
            dietary_restrictions: "",
            song_request: "",
            travel_plans: "",
            message: "",
        },
        validate: {
            accepted: (value) => (value === undefined ? "Please select whether you're coming" : null),
            invitees: (value, values) => {
                // Only validate if they're accepting the invitation
                if (values.accepted) {
                    const anyoneComing = value?.some(inv => inv.coming);
                    if (!anyoneComing) {
                        return "Please select at least one guest who will be attending";
                    }
                }
                return null;
            },
            staying_villa: (value) => (value === undefined ? "Please select accommodation preference" : null),
            dietary_restrictions: (value) => (value && value.length > 500 ? "Dietary restrictions must be less than 500 characters" : null),
            song_request: (value) => (value && value.length > 200 ? "Song request must be less than 200 characters" : null),
            travel_plans: (value) => (value && value.length > 500 ? "Travel plans must be less than 500 characters" : null),
            message: (value) => (value && value.length > 1000 ? "Message must be less than 1000 characters" : null),
        },
    });

    return form;
};
