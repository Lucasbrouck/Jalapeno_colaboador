import { NextResponse } from 'next/server';
import { getCompanies, createCompany, createUser, getUserByEmail, updateUser } from '@/lib/db';

export async function GET() {
    try {
        const companies = await getCompanies();
        return NextResponse.json(companies);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, adminName, adminEmail, latitude, longitude, checkinRadius } = body;

        if (!name || !adminName || !adminEmail) {
            return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
        }

        // 1. Create Company
        const newCompany = await createCompany({
            name,
            adminName,
            adminEmail,
            latitude,
            longitude,
            checkinRadius
        });

        // Check if user already exists
        const existingUser = await getUserByEmail(adminEmail);
        let adminUser = null;

        if (existingUser) {
            // User exists. Append new company ID to existing list
            const currentCompanyIds = existingUser.company_id ? 
                String(existingUser.company_id).split(',').map(id => id.trim()).filter(Boolean) : [];
            
            if (!currentCompanyIds.includes(newCompany.id)) {
                currentCompanyIds.push(newCompany.id);
            }
            
            // Update user in DB
            await updateUser(existingUser.id, {
                company_id: currentCompanyIds.join(','),
                role: existingUser.role === 'worker' ? 'admin' : existingUser.role // Upgrade to admin if they were worker
            });
            
            adminUser = {
                ...existingUser,
                company_id: currentCompanyIds.join(',')
            };
        } else {
            // Create a brand new admin user
            adminUser = await createUser({
                name: adminName,
                email: adminEmail,
                role: 'admin',
                password: 'PENDING_FIRST_ACCESS_' + Math.random().toString(36).substring(7),
                isFirstAccess: 1,
                company_id: newCompany.id
            });
        }

        return NextResponse.json({ company: newCompany, admin: adminUser });
    } catch (error) {
        console.error('Create Company Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
