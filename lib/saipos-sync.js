import { getCompaniesWithSaiposToken, getWeeklyMetrics, syncShiftRevenueAndMetrics } from './db.js';
import { getMonday, formatDateForInput } from './dateUtils.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchSalesForDateWithRetry(token, dateStr, maxRetries = 2) {
    const allSales = [];
    let offset = 0;
    const limit = 300;

    while (true) {
        const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${dateStr}T00:00:00&p_filter_date_end=${dateStr}T23:59:59&p_limit=${limit}&p_offset=${offset}`;
        let response = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'accept': 'application/json'
                    }
                });
                if (response.ok || (response.status < 500 && response.status !== 429)) {
                    break;
                }
            } catch (err) {
                if (attempt === maxRetries) throw err;
            }
            await sleep(800 * (attempt + 1));
        }

        if (!response || !response.ok) {
            const errorText = response ? await response.text() : 'Network error';
            throw new Error(`Status ${response?.status}: ${errorText.substring(0, 120)}`);
        }

        const page = await response.json();
        if (!Array.isArray(page) || page.length === 0) break;

        allSales.push(...page);
        if (page.length < limit) break;
        offset += limit;
    }

    return allSales;
}

async function syncAllCompanies() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
    const [hrs, mins] = timeStr.split(':').map(Number);
    const currentMins = hrs * 60 + mins;

    // Permite rodar das 08:00 às 23:59 e das 00:00 às 01:30 (para fechamento noturno)
    if (currentMins > 90 && currentMins < 480) {
        console.log(`[${new Date().toISOString()}] Sync Saipos pulado (fora do horário: ${timeStr})`);
        return;
    }

    console.log(`[${new Date().toISOString()}] Executando Sincronização Saipos (${timeStr})...`);

    try {
        const companies = await getCompaniesWithSaiposToken();

        const today = formatDateForInput(now);
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = formatDateForInput(yesterdayDate);

        for (const company of companies) {
            // Sincroniza ontem (para garantir fechamento completo do turno da noite) e hoje
            await syncCompanyRevenueForDate(company, yesterday);
            await sleep(400);
            await syncCompanyRevenueForDate(company, today);
            await sleep(400);
        }
    } catch (error) {
        console.error('Erro ao buscar empresas para sync:', error);
    }
}

export async function syncCompanyRevenueForDate(company, targetDate) {
    try {
        const sales = await fetchSalesForDateWithRetry(company.saipos_token, targetDate);
        if (!Array.isArray(sales)) return;

        let dayRevenue = 0;
        let nightRevenue = 0;

        sales.forEach(sale => {
            // Ignorar vendas canceladas na Saipos
            if (sale.canceled === 'Y') {
                return;
            }

            // Ignore sales of type FICHA/SENHA (id_sale_type 4) if configured
            if (company.ignore_ficha_venda === 1 && sale.id_sale_type === 4) {
                return;
            }

            const amount = parseFloat(sale.total_amount) || 0;
            let shiftType = null;

            if (sale.store_shift && sale.store_shift.desc_store_shift) {
                const desc = sale.store_shift.desc_store_shift.toLowerCase();
                if (desc.includes('dia')) shiftType = 'DAY';
                else if (desc.includes('noite')) shiftType = 'NIGHT';
            }

            if (!shiftType && sale.created_at) {
                // Forçar timezone de São Paulo para a divisão de turnos (18:00)
                const saleDate = new Date(sale.created_at);
                const hourFormatted = parseInt(saleDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
                shiftType = hourFormatted < 18 ? 'DAY' : 'NIGHT';
            }

            if (shiftType === 'DAY') dayRevenue += amount;
            else if (shiftType === 'NIGHT') nightRevenue += amount;
        });

        dayRevenue = Math.round(dayRevenue * 100) / 100;
        nightRevenue = Math.round(nightRevenue * 100) / 100;

        // Buscar métricas semanais para o início da semana (segunda-feira)
        const weeklyMetrics = await getWeeklyMetrics(getMonday(targetDate), company.id);

        // Update or Create DB shifts (terça a domingo sempre existem DIA e NOITE)
        await updateShiftData(company.id, targetDate, 'DAY', dayRevenue, weeklyMetrics);
        await updateShiftData(company.id, targetDate, 'NIGHT', nightRevenue, weeklyMetrics);

        return { dayRevenue, nightRevenue, count: sales.length };
    } catch (error) {
        console.error(`[Sync Error] ${company.name} (${targetDate}):`, error.message);
        return null;
    }
}

async function updateShiftData(companyId, date, type, revenue, weeklyMetrics) {
    const result = await syncShiftRevenueAndMetrics(companyId, date, type, revenue, weeklyMetrics);

    if (result.updated) {
        console.log(`[Sync] Sucesso (${date}): ${type} - R$ ${revenue.toFixed(2)} ${result.created ? '(Turno Criado)' : ''} ${result.metricsApplied ? '(+ Métricas)' : ''}`);
    }
}

// Global flag to avoid multiple intervals in Next.js dev/HMR
let syncStarted = false;

export function initSaiposSync() {
    if (syncStarted) return;
    syncStarted = true;

    console.log('🚀 Inicializando Loop de Sincronização Saipos (15 min)');

    // Run immediately on start
    syncAllCompanies();

    // Schedule every 15 minutes
    setInterval(syncAllCompanies, 15 * 60 * 1000);
}

export { syncAllCompanies };
