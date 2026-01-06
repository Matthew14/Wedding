import { useEffect, useRef } from 'react';
import { useTracking } from './useTracking';

export const useScrollDepth = (pageName: string) => {
    const { trackEvent } = useTracking();
    const maxDepthRef = useRef(0);
    const depthMilestonesRef = useRef(new Set<number>());
    const hasSentFinalRef = useRef(false);

    // Use refs to store current values, preventing listener re-registration
    // when trackEvent changes and avoiding potential memory leaks
    const trackEventRef = useRef(trackEvent);
    const pageNameRef = useRef(pageName);

    // Keep refs in sync with current values
    useEffect(() => {
        trackEventRef.current = trackEvent;
        pageNameRef.current = pageName;
    }, [trackEvent, pageName]);

    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const scrollableHeight = documentHeight - windowHeight;

            // If page doesn't scroll (shorter than viewport), user has seen 100%
            const scrollPercent = scrollableHeight > 0
                ? Math.round((scrollTop / scrollableHeight) * 100)
                : 100;

            // Track maximum scroll depth
            if (scrollPercent > maxDepthRef.current) {
                maxDepthRef.current = scrollPercent;
            }

            // Track scroll milestones (25%, 50%, 75%, 100%)
            const milestones = [25, 50, 75, 100];
            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !depthMilestonesRef.current.has(milestone)) {
                    depthMilestonesRef.current.add(milestone);
                    trackEventRef.current('scroll_depth', {
                        page: pageNameRef.current,
                        depth_percent: milestone,
                    });
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []); // Empty deps - listener registered once, uses refs for current values

    // Track final scroll depth on unmount only
    useEffect(() => {
        return () => {
            // Only send final event once to prevent duplicates
            if (maxDepthRef.current > 0 && !hasSentFinalRef.current) {
                hasSentFinalRef.current = true;
                trackEventRef.current('scroll_depth_final', {
                    page: pageNameRef.current,
                    max_depth_percent: maxDepthRef.current,
                });
            }
        };
    }, []); // Empty deps - cleanup runs only on unmount
};
