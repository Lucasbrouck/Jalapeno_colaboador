'use client';

import { useState } from 'react';

export default function Tabs({ children, defaultTab = 0 }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const tabs = Array.isArray(children) ? children : [children];

    return (
        <div style={{ width: '100%' }}>
            {/* Tab Headers */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '0'
            }}>
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(index)}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: activeTab === index ? '#e2e8f0' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === index ? '3px solid var(--accent-orange)' : '3px solid transparent',
                            color: activeTab === index ? 'white' : 'var(--text-secondary)',
                            fontWeight: activeTab === index ? 700 : 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            borderRadius: '8px 8px 0 0',
                            marginBottom: '-2px'
                        }}
                    >
                        {tab.props.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                {tabs[activeTab]}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export function TabPanel({ label, children }) {
    return <div>{children}</div>;
}
