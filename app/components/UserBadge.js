
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';

export default function UserBadge({ user, userId, onClick }) { // userId passed if user object is not fully ready or for navigation
    const router = useRouter();

    if (!user || !user.trainingLevelName) return null;

    const IconComp = Icons[user.trainingLevelIcon] || Icons.Circle;

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            router.push('/training');
        }
    };

    return (
        <div
            onClick={handleClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#e2e8f0',
                padding: '4px 8px',
                borderRadius: 16,
                cursor: 'pointer',
                border: '1px solid #e2e8f0',
                transition: 'background 0.2s',
                width: 'fit-content'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = '#e2e8f0'}
        >
            <IconComp size={16} color="var(--accent-gold, #fbbf24)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.trainingLevelName}
            </span>
        </div>
    );
}
