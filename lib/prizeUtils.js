import { getMonday, formatDateForInput, parseLocalDate } from './dateUtils';

/**
 * Given a Monday YYYY-MM-DD string, returns the operational week dates:
 * - tuesday: Terça-feira (início da semana operacional)
 * - sunday: Domingo (fim da semana operacional)
 * - apuracaoMonday: Segunda-feira seguinte (dia de apuração das métricas da semana)
 */
export function getOperationalWeekInfo(mondayStr) {
    if (!mondayStr) return null;
    const mon = parseLocalDate(mondayStr);

    const tue = new Date(mon);
    tue.setDate(mon.getDate() + 1);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const nextMon = new Date(mon);
    nextMon.setDate(mon.getDate() + 7);

    const fmtShort = (d) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const toISO = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
        monday: mondayStr,
        tuesday: toISO(tue),
        sunday: toISO(sun),
        apuracaoMonday: toISO(nextMon),
        operationalLabel: `Ter ${fmtShort(tue)} a Dom ${fmtShort(sun)}`,
        shortRangeLabel: `${fmtShort(tue)} a ${fmtShort(sun)}`,
        apuracaoLabel: `Seg ${fmtShort(nextMon)}`
    };
}

/**
 * Evaluates a single metric against its goal configuration.
 * Returns 0, 0.8, or 1.0.
 */
export function evaluateMetricMultiplier(val, config) {
    const num = Number(val || 0);
    if (!config) return 0;
    const goal = Number(config.goal || 0);
    const superGoal = Number(config.superGoal || 0);
    if (goal <= 0 && superGoal <= 0) return 0.8;

    if (config.type === 'desc') {
        // Lower is better (e.g. CMV), must be > 0 to be valid
        if (num <= 0) return 0;
        if (superGoal > 0 && num <= superGoal) return 1.0;
        if (num <= goal) return 0.8;
        return 0;
    } else {
        // Higher is better (REVENUE, RATING, OPS)
        if (superGoal > 0 && num >= superGoal) return 1.0;
        if (num >= goal) return 0.8;
        return 0;
    }
}

/**
 * Core Weekly Prize Calculation Engine.
 *
 * Rules:
 * 1. Pote do Turno (`maxPot`):
 *    - Turno DIA = 1.5% (0.015) do faturamento do turno
 *    - Turno NOITE = 0.8% (0.008) do faturamento do turno
 * 2. Prêmio Máximo Individual (`maxPrizePerPerson`):
 *    - Pote do Turno dividido pelo número de pessoas que foram no turno (`maxPot / workerCount`),
 *      sem multiplicar pelos multiplicadores das métricas.
 * 3. Apuração Semanal (Segunda-feira referente à semana anterior Terça a Domingo):
 *    - Pote Consolidado (`actualPot`) = `maxPot * mRev * mCMV * mRating * mOps`
 *    - Dividido pelas cotas de presença do turno: quem chegou no horário tem multiplicador `1.0`
 *      e quem chegou atrasado (`status === 'LATE'`) tem multiplicador `0.5`.
 */
export function calculateWeeklyPrizeEngine(shifts = [], goalConfig = null, weeklyMetricsList = [], referenceDateStr = null) {
    const todayStr = referenceDateStr || formatDateForInput();
    const currentWeekMonday = getMonday(todayStr);

    // Index weekly_metrics by Monday date
    const metricsByMonday = {};
    if (Array.isArray(weeklyMetricsList)) {
        weeklyMetricsList.forEach(wm => {
            if (wm && wm.date) {
                metricsByMonday[wm.date] = wm;
            }
        });
    }

    // Group shifts by operational week (Monday key)
    const weeksMap = {};
    shifts.forEach(shift => {
        if (!shift || !shift.date) return;
        const weekMonday = getMonday(shift.date);
        if (!weeksMap[weekMonday]) {
            weeksMap[weekMonday] = {
                weekMonday,
                ...getOperationalWeekInfo(weekMonday),
                shifts: [],
                weekRevenue: 0,
                cmv: 0,
                rating: 0,
                ops: 0,
                hasLaunchedMetrics: false
            };
        }
        weeksMap[weekMonday].shifts.push(shift);
        weeksMap[weekMonday].weekRevenue += Number(shift.revenue || 0);
    });

    // Resolve metrics and multipliers for each week
    Object.values(weeksMap).forEach(week => {
        const wm = metricsByMonday[week.weekMonday];
        const shiftWithMetrics = week.shifts.find(s =>
            Number(s.metricCMV || 0) > 0 || Number(s.metricRATING || 0) > 0 || Number(s.metricOPS || 0) > 0 ||
            Number(s.metrics?.CMV || 0) > 0 || Number(s.metrics?.RATING || 0) > 0 || Number(s.metrics?.OPS || 0) > 0
        );

        const cmv = wm
            ? Number(wm.cmv || 0)
            : Number(shiftWithMetrics?.metrics?.CMV ?? shiftWithMetrics?.metricCMV ?? 0);
        const rating = wm
            ? Number(wm.rating || 0)
            : Number(shiftWithMetrics?.metrics?.RATING ?? shiftWithMetrics?.metricRATING ?? 0);
        const ops = wm
            ? Number(wm.ops || 0)
            : Number(shiftWithMetrics?.metrics?.OPS ?? shiftWithMetrics?.metricOPS ?? 0);

        week.cmv = cmv;
        week.rating = rating;
        week.ops = ops;

        const hasMetrics = cmv > 0 || rating > 0 || ops > 0;
        week.hasLaunchedMetrics = hasMetrics;

        // Current week is ALWAYS in apuração (closes on the following Monday)
        week.isCurrentWeek = week.weekMonday >= currentWeekMonday;
        week.isPendingApuracao = week.isCurrentWeek || !hasMetrics;

        // Multipliers for consolidated state
        week.mRev = evaluateMetricMultiplier(week.weekRevenue, goalConfig?.REVENUE);
        week.mCMV = evaluateMetricMultiplier(cmv, goalConfig?.CMV);
        week.mRating = evaluateMetricMultiplier(rating, goalConfig?.RATING);
        week.mOps = evaluateMetricMultiplier(ops, goalConfig?.OPS);
        week.consolidatedMultiplier = week.mRev * week.mCMV * week.mRating * week.mOps;
    });

    // Calculate shift-level pots and shares
    const shiftsMap = {};
    shifts.forEach(shift => {
        if (!shift || !shift.date) return;
        const weekMonday = getMonday(shift.date);
        const week = weeksMap[weekMonday];
        const rev = Number(shift.revenue || 0);
        const maxPercent = shift.type === 'DAY' ? 0.015 : 0.008;
        const maxPot = rev * maxPercent;

        const consolidatedPot = maxPot * (week?.consolidatedMultiplier ?? 0);

        const workers = shift.workers || [];
        const workerCount = workers.length;

        // Prêmio Máximo = Pote do Turno dividido pelo número de pessoas (sem multiplicador de métricas)
        const maxPrizePerPerson = workerCount > 0 ? maxPot / workerCount : 0;

        // Cotas para o rateio consolidado (1.0 no horário, 0.5 atrasado)
        const totalShares = workers.reduce((acc, w) => acc + (w.status === 'LATE' ? 0.5 : 1.0), 0);
        const valuePerShare = totalShares > 0 ? consolidatedPot / totalShares : 0;

        shiftsMap[shift.id] = {
            shiftId: shift.id,
            weekMonday,
            weekInfo: week,
            isPendingApuracao: week?.isPendingApuracao ?? true,
            isCurrentWeek: week?.isCurrentWeek ?? false,
            weekRevenue: week?.weekRevenue ?? rev,
            maxPercent,
            maxPot,
            actualPot: consolidatedPot,
            workerCount,
            maxPrizePerPerson,
            totalShares,
            valuePerShare,
            mRev: week?.mRev ?? 0,
            mCMV: week?.mCMV ?? 0,
            mRating: week?.mRating ?? 0,
            mOps: week?.mOps ?? 0
        };
    });

    return {
        currentWeekMonday,
        weeksMap,
        shiftsMap
    };
}
