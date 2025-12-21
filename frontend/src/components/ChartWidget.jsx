import React from 'react';

export default function ChartWidget({ title, children, dark = false, action }) {
    const baseClasses = dark ? 'glass-panel-dark' : 'glass-panel';
    const textPrimary = dark ? 'text-white' : 'text-gray-800';
    const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`${baseClasses} p-6 flex flex-col h-full relative overflow-hidden`}>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                    <h3 className={`font-bold text-lg ${textPrimary}`}>
                        {title}
                    </h3>
                    {action && (
                        <p className={`text-xs ${textSecondary}`}>Updated recently</p>
                    )}
                </div>
                {action}
            </div>

            <div className="flex-1 w-full min-h-[200px] relative z-10">
                {children}
            </div>

            {/* Subtle glow */}
            <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br from-transparent to-black/5 pointer-events-none ${dark ? 'opacity-40' : 'opacity-5'}`} />
        </div>
    );
}
