import React from 'react';

export default function StatsCard({
    title,
    value,
    icon: Icon,
    subtitle,
    trend,
    color = 'bg-white',
    dark = false,
    className = ''
}) {
    const baseClasses = dark ? 'glass-panel-dark' : 'glass-panel';
    const textPrimary = dark ? 'text-white' : 'text-gray-800';
    const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`${baseClasses} p-6 relative overflow-hidden ${className}`}>
            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex justify-between items-start">
                    {Icon && (
                        <div className={`p-3 rounded-2xl ${dark ? 'bg-white/10 text-white' : 'bg-crm-background text-crm-purple'}`}>
                            <Icon size={24} />
                        </div>
                    )}
                    {trend && (
                        <div className="flex flex-col items-end">
                            <span className="flex items-center text-crm-green font-bold text-sm">
                                +{trend}% ↗
                            </span>
                            <span className={`text-xs ${textSecondary}`}>vs last month</span>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h3 className={`${textSecondary} font-medium text-sm mb-1`}>{title}</h3>
                    <p className={`${textPrimary} text-3xl font-bold tracking-tight`}>{value}</p>
                    {subtitle && (
                        <p className={`text-xs ${textSecondary} mt-2`}>{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Decorative background element */}
            <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-20 ${dark ? 'bg-crm-purple' : 'bg-crm-green'}`} />
        </div>
    );
}
