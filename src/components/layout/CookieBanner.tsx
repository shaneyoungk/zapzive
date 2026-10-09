import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMetrics } from '@/hooks/useMetrics';
import { useAuth } from '@/contexts/AuthContext';

export const CookieBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { trackEvent } = useMetrics();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            setIsVisible(false);
            return;
        }
        const consent = localStorage.getItem('zapzive-consent') ?? localStorage.getItem('gp-consent');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated]);

    const handleAccept = () => {
        localStorage.setItem('zapzive-consent', 'true');
        setIsVisible(false);
        trackEvent({
            category: 'Compliance',
            action: 'Cookies Accepted',
            label: 'Full Consent'
        });
    };

    const handleDecline = () => {
        localStorage.setItem('zapzive-consent', 'false');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-[100] w-full"
                >
                    <div className="relative flex flex-col items-start justify-between gap-5 border-t border-[#d9d6cd] bg-[#fffdf8] px-5 py-5 shadow-[0_-12px_28px_rgba(32,33,30,.08)] sm:px-8 md:flex-row md:items-center">

                        <div className="flex items-start gap-4 flex-1">
                            <div className="space-y-1">
                                <h4 className="text-[#20211e] font-semibold text-base tracking-tight">Cookie preferences</h4>
                                <p className="max-w-3xl text-[13px] leading-relaxed text-[#77766e]">
                                    We use essential local storage for consent and product preferences. Read our <Link to="/privacy" className="font-semibold text-[#087f5b] underline-offset-4 hover:underline">Privacy Policy</Link>.
                                </p>
                            </div>
                        </div>

                        <div className="mt-2 flex w-full items-center gap-3 md:mt-0 md:w-auto">
                            <button
                                onClick={() => setIsVisible(false)}
                                className="px-4 py-2 text-[13px] font-semibold text-[#77766e] transition-colors hover:text-[#20211e]"
                            >
                                Decline
                            </button>

                            <Button
                                onClick={handleAccept}
                                className="h-auto flex-1 whitespace-nowrap rounded-full bg-[#20211e] px-6 py-2.5 text-[13px] font-bold text-[#f5f3ee] transition-all hover:bg-[#11a879] hover:text-[#20211e] md:flex-none"
                            >
                                Accept All
                            </Button>
                        </div>

                        {/* Tactile Noise Texture Overlay */}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
