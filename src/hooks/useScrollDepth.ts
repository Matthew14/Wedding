import { useEffect, useRef } from 'react';
import { useTracking } from './useTracking';

export const useScrollDepth = (pageName: string) => {
    const { trackEvent } = useTracking();
    const maxDepthRef = useRef(0);
    const depthMilestonesRef = useRef(new Set<number>());

    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

            // Track maximum scroll depth
            if (scrollPercent > maxDepthRef.current) {
                maxDepthRef.current = scrollPercent;
            }

            // Track scroll milestones (25%, 50%, 75%, 100%)
            const milestones = [25, 50, 75, 100];
            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !depthMilestonesRef.current.has(milestone)) {
                    depthMilestonesRef.current.add(milestone);
                    trackEvent('scroll_depth', {
                        page: pageName,
                        depth_percent: milestone,
                    });
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [pageName, trackEvent]);

    // Track final scroll depth on unmount
    useEffect(() => {
        return () => {
            if (maxDepthRef.current > 0) {
                trackEvent('scroll_depth_final', {
                    page: pageName,
                    max_depth_percent: maxDepthRef.current,
                });
            }
        };
    }, [pageName, trackEvent]);
};
