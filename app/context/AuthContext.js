'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

const getCompanyIds = (companyIdStr) => {
    if (!companyIdStr) return [];
    return String(companyIdStr).split(',').map(id => id.trim()).filter(Boolean);
};

const processUserData = (dbUser, activeCompanyId, allCompanies = []) => {
    if (!dbUser) return null;
    if (dbUser.id === 'super-admin-id' || dbUser.id === 'delivery-manager-id') {
        const fallbackCompany = activeCompanyId || dbUser.company_id || (allCompanies[0]?.id ?? null);
        return {
            ...dbUser,
            company_ids: allCompanies.map(c => c.id),
            company_id: fallbackCompany
        };
    }
    const companyIds = getCompanyIds(dbUser.company_id);

    let finalActiveId = null;

    if (activeCompanyId) {
        finalActiveId = activeCompanyId;
    } else if (companyIds.length > 0) {
        finalActiveId = companyIds[0];
    }

    return {
        ...dbUser,
        company_ids: companyIds,
        company_id: finalActiveId
    };
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const getSessionCookie = () => {
        try {
            const matches = document.cookie.match(new RegExp(
                "(?:^|; )" + "session".replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ));
            if (!matches) return undefined;
            try {
                return decodeURIComponent(matches[1]);
            } catch (e) {
                return matches[1];
            }
        } catch (e) {
            return undefined;
        }
    };

    const setSessionCookie = (userData) => {
        if (!userData) return;
        const essentialData = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            company_id: userData.company_id,
            company_ids: userData.company_ids,
        };
        document.cookie = `session=${encodeURIComponent(JSON.stringify(essentialData))}; path=/; max-age=172800; SameSite=Lax`;
        try {
            localStorage.setItem('user', JSON.stringify(essentialData));
        } catch (e) {}
    };

    const removeSessionCookie = () => {
        document.cookie = 'session=; path=/; max-age=0';
        try {
            localStorage.removeItem('user');
        } catch (e) {}
    };

    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            let loadedCompanies = [];
            try {
                const cRes = await fetch('/api/companies');
                const cData = await cRes.json();
                if (Array.isArray(cData)) {
                    loadedCompanies = cData;
                    if (mounted) setCompanies(cData);
                }
            } catch (err) {
                console.error('Error fetching companies:', err);
            }

            try {
                const sessionJson = getSessionCookie();
                if (sessionJson) {
                    const sessionData = JSON.parse(sessionJson);
                    if (sessionData && sessionData.id) {
                        if (sessionData.id === 'super-admin-id') {
                            const superUser = processUserData({
                                id: 'super-admin-id',
                                name: 'Super Admin',
                                email: 'superadm@jalapeno.com',
                                role: 'superadmin'
                            }, sessionData.company_id, loadedCompanies);
                            if (mounted) {
                                setUser(superUser);
                                setSessionCookie(superUser);
                                setLoading(false);
                            }
                            return;
                        }

                        if (sessionData.id === 'delivery-manager-id') {
                            const delivUser = processUserData({
                                id: 'delivery-manager-id',
                                name: 'Gerente de Entregadores',
                                email: 'entregadores@jalapeno.com',
                                role: 'manager'
                            }, sessionData.company_id, loadedCompanies);
                            if (mounted) {
                                setUser(delivUser);
                                setSessionCookie(delivUser);
                                setLoading(false);
                            }
                            return;
                        }

                        const uRes = await fetch(`/api/users?id=${sessionData.id}`);
                        const users = await uRes.json();
                        const foundUser = Array.isArray(users) ? users.find(u => u.id === sessionData.id) : null;
                        if (foundUser) {
                            const processed = processUserData(foundUser, sessionData.company_id, loadedCompanies);
                            if (mounted) {
                                setUser(processed);
                                setSessionCookie(processed);
                            }
                        } else {
                            removeSessionCookie();
                        }
                    }
                }
            } catch (e) {
                console.error('Session recovery error:', e);
                removeSessionCookie();
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!loading) {
            const publicRoutes = ['/login', '/reset-password', '/auth/link-account'];
            const isPublicRoute = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

            if (!user && !isPublicRoute) {
                router.push('/login');
            }
        }
    }, [user, loading, pathname, router]);

    const login = (userData) => {
        const processed = processUserData(userData, userData.company_id, companies);
        setUser(processed);
        setSessionCookie(processed);
    };

    const logout = () => {
        setUser(null);
        removeSessionCookie();
        router.push('/login');
    };

    const switchCompany = (companyId) => {
        if (!user) return;
        const processed = processUserData(user, companyId, companies);
        setUser(processed);
        setSessionCookie(processed);
        if (pathname?.startsWith('/equipe/') || pathname?.startsWith('/admin/users/')) {
            window.location.href = '/equipe';
        } else {
            window.location.reload();
        }
    };

    const allowedCompanies = user ?
        (user.role === 'superadmin' || user.id === 'delivery-manager-id' ? companies : companies.filter(c =>
            (user.company_ids && user.company_ids.includes(c.id)) ||
            (c.adminEmail && c.adminEmail.toLowerCase() === user.email?.toLowerCase())
        ))
        : [];

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, switchCompany, allowedCompanies, companies }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
