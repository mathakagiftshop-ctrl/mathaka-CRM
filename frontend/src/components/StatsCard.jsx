import React from 'react';

export default function StatsCard({
    title,
    value,
    icon: Icon,
    subtitle,
    trend,
    className = ''
}) {
    return (
        <div className={`panel p-6 relative overflow-hidden flex flex-col justify-between h-full bg-white ${className}`}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <h3 className="text-crm-secondary font-medium text-sm mb-1">{title}</h3>
                    <p className="text-crm-primary text-3xl font-bold tracking-tight">{value}</p>
                </div>
                {Icon && (
                    <div className="p-3 rounded-lg bg-crm-background text-crm-primary border border-crm-border">
                        <Icon size={20} />
                    </div>
                )}
            </div>

            {(trend || subtitle) && (
                <div className="mt-4 flex items-center gap-2">
                    {trend && (
                        <span className="flex items-center text-crm-success font-semibold text-xs bg-crm-success/10 px-2 py-1 rounded-full">
                            +{trend}% ↗
                        </span>
                    )}
                    {subtitle && (
                        <p className="text-xs text-crm-secondary">{subtitle}</p>
                    )}
                </div>
            )}
        </div>
    );
}
