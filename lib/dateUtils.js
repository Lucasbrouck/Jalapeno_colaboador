// Date utility functions to handle timezone issues

/**
 * Converts a YYYY-MM-DD string to a Date object in local timezone
 * Prevents the "one day behind" bug when parsing date strings
 */
export function parseLocalDate(dateString) {
    if (!dateString) return new Date();
    // Add T12:00:00 to force local timezone interpretation at noon
    return new Date(dateString + 'T12:00:00');
}

/**
 * Formats a date to YYYY-MM-DD in local timezone
 */
export function formatDateForInput(date = new Date()) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date).split('/').reverse().join('-');
}

/**
 * Formats a YYYY-MM-DD string to localized date string
 */
export function formatLocalDate(dateString, locale = 'pt-BR', options = {}) {
    if (!dateString) return '';
    // If it's a full timestamp, just use it directly
    if (dateString.includes('T') || dateString.includes(' ')) {
        return new Date(dateString).toLocaleDateString(locale, options);
    }
    return parseLocalDate(dateString).toLocaleDateString(locale, options);
}

/**
 * Formats a timestamp or date string to HH:MM
 */
export function formatLocalTime(dateString, locale = 'pt-BR') {
    if (!dateString) return '';
    const date = new Date(dateString.includes('-') && !dateString.includes('T') && !dateString.includes(' ') ? dateString + 'T12:00:00' : dateString);
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

/**
 * Returns the YYYY-MM-DD string for the Monday of the week containing the given date
 */
export function getMonday(dateInput) {
    const d = typeof dateInput === 'string' ? parseLocalDate(dateInput) : new Date(dateInput);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate how many days to go back to reach Monday
    let diff = day - 1; // Monday is 1
    if (day === 0) diff = 6; // If Sunday, go back 6 days

    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    return formatDateForInput(monday);
}

/**
 * Returns the current date and time in ISO format (YYYY-MM-DDTHH:mm:ss) 
 * adjusted to America/Sao_Paulo timezone.
 */
export function getCurrentLocalISO() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
}
