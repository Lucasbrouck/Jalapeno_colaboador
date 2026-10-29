'use client';

import { useEffect } from 'react';

export default function GlobalErrorLogger() {
    useEffect(() => {
        const handleGlobalError = async (message, source, lineno, colno, error) => {
            try {
                await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: typeof message === 'string' ? message : message?.type || 'Unknown error',
                        stack: error?.stack || 'No stack trace',
                        url: window.location.href,
                        userAgent: navigator.userAgent
                    })
                });
            } catch (e) {
                console.error('Failed to send error log:', e);
            }
        };

        const handleUnhandledRejection = async (event) => {
            try {
                await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: `Unhandled Promise Rejection: ${event.reason}`,
                        stack: event.reason?.stack || 'No stack trace',
                        url: window.location.href,
                        userAgent: navigator.userAgent
                    })
                });
            } catch (e) {
                console.error('Failed to send error log:', e);
            }
        };

        window.onerror = handleGlobalError;
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.onerror = null;
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null; // This component doesn't render anything
}
