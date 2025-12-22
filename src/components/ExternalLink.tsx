'use client';

import { Anchor } from '@mantine/core';
import { useTracking, SiteEvents } from '@/hooks';

interface ExternalLinkProps {
    href: string;
    children: React.ReactNode;
    label?: string;
    style?: React.CSSProperties;
    className?: string;
}

export function ExternalLink({ href, children, label, style, className }: ExternalLinkProps) {
    const { trackEvent } = useTracking();

    const handleClick = () => {
        trackEvent(SiteEvents.EXTERNAL_LINK_CLICK, {
            url: href,
            label: label || children?.toString() || 'Unknown',
        });
    };

    return (
        <Anchor
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            style={style}
            className={className}
        >
            {children}
        </Anchor>
    );
}
