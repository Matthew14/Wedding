import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTracking } from './useTracking';

export const useUTMTracking = () => {
    const searchParams = useSearchParams();
    const { trackEvent, setUserProperties } = useTracking();

    useEffect(() => {
        // Extract UTM parameters
        const utmSource = searchParams.get('utm_source');
        const utmMedium = searchParams.get('utm_medium');
        const utmCampaign = searchParams.get('utm_campaign');
        const utmTerm = searchParams.get('utm_term');
        const utmContent = searchParams.get('utm_content');

        // Track if any UTM parameters are present
        if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
            const utmParams = {
                utm_source: utmSource || undefined,
                utm_medium: utmMedium || undefined,
                utm_campaign: utmCampaign || undefined,
                utm_term: utmTerm || undefined,
                utm_content: utmContent || undefined,
            };

            // Track the UTM parameters as an event
            trackEvent('utm_parameters_detected', utmParams);

            // Set as user properties for attribution
            setUserProperties({
                initial_utm_source: utmSource || undefined,
                initial_utm_medium: utmMedium || undefined,
                initial_utm_campaign: utmCampaign || undefined,
            });
        }

        // Also track referrer if present
        if (document.referrer) {
            try {
                const referrerUrl = new URL(document.referrer);
                const referrerDomain = referrerUrl.hostname;

                trackEvent('referrer_detected', {
                    referrer_domain: referrerDomain,
                    referrer_url: document.referrer,
                });

                setUserProperties({
                    initial_referrer: referrerDomain,
                });
            } catch {
                // Invalid referrer URL, ignore
            }
        }
    }, [searchParams, trackEvent, setUserProperties]);
};
