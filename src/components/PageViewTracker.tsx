'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTracking } from '@/hooks';

export function PageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { trackPageView } = useTracking();

    useEffect(() => {
        // Track page view whenever pathname or search params change
        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

        // Map pathname to friendly page name
        let pageName = 'Unknown';
        if (pathname === '/') pageName = 'Home';
        else if (pathname === '/rsvp') pageName = 'RSVP Code Entry';
        else if (pathname.startsWith('/rsvp/success')) pageName = 'RSVP Success';
        else if (pathname.startsWith('/rsvp/')) pageName = 'RSVP Form';
        else if (pathname === '/location') pageName = 'Location';
        else if (pathname === '/schedule') pageName = 'Schedule';
        else if (pathname === '/faqs') pageName = 'FAQs';
        else if (pathname === '/login') pageName = 'Login';
        else if (pathname === '/dashboard') pageName = 'Dashboard';
        else if (pathname.startsWith('/dashboard/')) {
            const parts = pathname.split('/');
            pageName = `Dashboard - ${parts[2]?.replace('-', ' ') || 'Unknown'}`;
        }

        trackPageView(pageName, {
            path: pathname,
            url,
        });
    }, [pathname, searchParams, trackPageView]);

    return null; // This component doesn't render anything
}
