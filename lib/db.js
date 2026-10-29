import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomUUID } from 'crypto';
import pg from 'pg';
import { formatDateForInput, parseLocalDate, getMonday, getCurrentLocalISO } from './dateUtils.js';

const __filename = fileURLToPath(import.meta.url);

// Database file path (also used by document/absence upload routes to locate the persistent directory)
const DEFAULT_DB_PATH = join(process.cwd(), 'database', 'app.db');
const DB_PATH = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
const SCHEMA_PATH = join(process.cwd(), 'lib', 'schema.sql');
const PG_SCHEMA_PATH = join(process.cwd(), 'lib', 'schema-postgres.sql');

// Ensure database directory exists (for uploads & local SQLite fallback)
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
    try {
        mkdirSync(dbDir, { recursive: true });
    } catch (e) {
        console.error(`Error creating database directory ${dbDir}:`, e);
    }
}

// Determine database mode: PostgreSQL if DATABASE_URL or DATABASE_PUBLIC_URL is set, otherwise SQLite
const PG_CONNECTION_STRING = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';
const USE_POSTGRES = Boolean(PG_CONNECTION_STRING);

// Configure pg BIGINT (OID 20, e.g. COUNT(*)) and NUMERIC (OID 1700) to return JS numbers like better-sqlite3
pg.types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));
pg.types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));

// Map PostgreSQL folded lowercase column names / aliases back to exact camelCase expected by the app
const LOWER_TO_CAMEL_MAP = {
    userid: 'userId',
    createdat: 'createdAt',
    adminname: 'adminName',
    adminemail: 'adminEmail',
    checkinradius: 'checkinRadius',
    revenuegoal: 'revenueGoal',
    revenuesupergoal: 'revenueSuperGoal',
    cmvgoal: 'cmvGoal',
    cmvsupergoal: 'cmvSuperGoal',
    ratinggoal: 'ratingGoal',
    ratingsupergoal: 'ratingSuperGoal',
    opsgoal: 'opsGoal',
    opssupergoal: 'opsSuperGoal',
    updatedat: 'updatedAt',
    questionid: 'questionId',
    selfscore: 'selfScore',
    selfcomment: 'selfComment',
    admscore: 'admScore',
    admcomment: 'admComment',
    fromuserid: 'fromUserId',
    touserid: 'toUserId',
    shiftid: 'shiftId',
    metriccmv: 'metricCMV',
    metricrating: 'metricRATING',
    metricops: 'metricOPS',
    itemid: 'itemId',
    priceatpurchase: 'priceAtPurchase',
    shifttype: 'shiftType',
    checkinentry: 'checkinEntry',
    checkoutbreak: 'checkoutBreak',
    checkinbreak: 'checkinBreak',
    checkoutexit: 'checkoutExit',
    isdouble: 'isDouble',
    checkindouble: 'checkinDouble',
    checkoutexit2: 'checkoutExit2',
    platabalance: 'plataBalance',
    isfirstaccess: 'isFirstAccess',
    resettoken: 'resetToken',
    resettokenexpires: 'resetTokenExpires',
    pdfobs: 'pdfObs',
    maquininhaonboarding: 'maquininhaOnboarding',
    recebejae: 'recebeJae',
    elegivelpremio: 'elegivelPremio',
    hiringdate: 'hiringDate',
    cajauserid: 'cajaUserId',
    cajarole: 'cajaRole',
    timesheetheader: 'timesheetHeader',
    traininglevelname: 'trainingLevelName',
    traininglevelicon: 'trainingLevelIcon',
    traininglevelorder: 'trainingLevelOrder',
    traininggroupname: 'trainingGroupName',
    trainingprogramname: 'trainingProgramName',
    questiontext: 'questionText',
    questioncategory: 'questionCategory',
    fromusername: 'fromUserName',
    tousername: 'toUserName',
    itemname: 'itemName',
    itemicon: 'itemIcon',
    itemdescription: 'itemDescription',
    username: 'userName'
};

function normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const key of Object.keys(row)) {
        const mappedKey = LOWER_TO_CAMEL_MAP[key] || key;
        out[mappedKey] = row[key];
    }
    return out;
}

function toPgSql(sql) {
    // Translate SQLite functions to PostgreSQL equivalents
    let converted = sql
        .replace(/\binstr\s*\(/gi, 'strpos(')
        .replace(/datetime\s*\(\s*'now'\s*\)/gi, '(CURRENT_TIMESTAMP::TEXT)');

    // Replace ? placeholders outside single-quoted literals with $1, $2, ...
    let paramIndex = 0;
    let inSingleQuote = false;
    let result = '';

    for (let i = 0; i < converted.length; i++) {
        const ch = converted[i];
        if (ch === "'") {
            if (inSingleQuote && converted[i + 1] === "'") {
                result += "''";
                i++;
                continue;
            }
            inSingleQuote = !inSingleQuote;
            result += ch;
        } else if (ch === '?' && !inSingleQuote) {
            paramIndex++;
            result += `$${paramIndex}`;
        } else {
            result += ch;
        }
    }

    return result;
}

let db = null;
let pgPool = null;

if (USE_POSTGRES) {
    const isInternalRailway = PG_CONNECTION_STRING.includes('.railway.internal');
    pgPool = new pg.Pool({
        connectionString: PG_CONNECTION_STRING,
        ssl: isInternalRailway ? false : { rejectUnauthorized: false },
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
    pgPool.on('error', err => {
        console.error('Unexpected PostgreSQL pool error:', err);
    });
    console.log('🐘 Database mode: PostgreSQL');
} else {
    const Database = (await import('better-sqlite3')).default;
    db = new Database(DB_PATH, { timeout: 15000 });
    try {
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 15000');
        db.pragma('foreign_keys = ON');
    } catch (err) {
        if (err.code === 'SQLITE_BUSY') {
            console.warn('Database locked during PRAGMA setup, skipping for this worker.');
        } else {
            console.error('Error setting PRAGMAs:', err);
        }
    }
    console.log('📁 Database mode: SQLite (' + DB_PATH + ')');
}

// Unified query helpers (work identically on PostgreSQL and SQLite)
async function queryAll(sql, params = [], pgClient = null) {
    if (USE_POSTGRES) {
        const runner = pgClient || pgPool;
        const res = await runner.query(toPgSql(sql), params);
        return res.rows.map(normalizeRow);
    }
    return db.prepare(sql).all(...params);
}

async function queryGet(sql, params = [], pgClient = null) {
    if (USE_POSTGRES) {
        const runner = pgClient || pgPool;
        const res = await runner.query(toPgSql(sql), params);
        return res.rows.length > 0 ? normalizeRow(res.rows[0]) : undefined;
    }
    return db.prepare(sql).get(...params);
}

async function queryRun(sql, params = [], pgClient = null) {
    if (USE_POSTGRES) {
        const runner = pgClient || pgPool;
        const res = await runner.query(toPgSql(sql), params);
        const firstRow = res.rows && res.rows[0] ? normalizeRow(res.rows[0]) : null;
        return {
            changes: res.rowCount || 0,
            lastInsertRowid: firstRow?.id ?? null
        };
    }
    return db.prepare(sql).run(...params);
}

async function runInTransaction(workFn) {
    if (USE_POSTGRES) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            const tx = {
                all: (sql, params = []) => queryAll(sql, params, client),
                get: (sql, params = []) => queryGet(sql, params, client),
                run: (sql, params = []) => queryRun(sql, params, client)
            };
            const result = await workFn(tx);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            throw err;
        } finally {
            client.release();
        }
    } else {
        db.prepare('BEGIN IMMEDIATE').run();
        try {
            const tx = {
                all: (sql, params = []) => queryAll(sql, params),
                get: (sql, params = []) => queryGet(sql, params),
                run: (sql, params = []) => queryRun(sql, params)
            };
            const result = await workFn(tx);
            db.prepare('COMMIT').run();
            return result;
        } catch (err) {
            try { db.prepare('ROLLBACK').run(); } catch (_) {}
            throw err;
        }
    }
}

// Helper function to generate ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

let _userColumnsReady = false;
async function ensureUserColumnsAsync() {
    if (_userColumnsReady) return;
    try {
        await queryRun('ALTER TABLE users ADD COLUMN elegivelPremio INTEGER DEFAULT 1');
    } catch (_) {
        // Column already exists
    }
    _userColumnsReady = true;
}

// Initialize PostgreSQL schema & defaults when running in Postgres mode
async function initPostgresDatabase() {
    try {
        if (existsSync(PG_SCHEMA_PATH)) {
            const schemaSql = readFileSync(PG_SCHEMA_PATH, 'utf-8');
            await pgPool.query(schemaSql);
        }
        await ensureUserColumnsAsync();
        await ensureDefaultGoalsAsync();
        await ensureDefaultDisciplinaryRulesAsync();
        await queryRun("UPDATE users SET role = 'admin' WHERE email LIKE 'lucas@jalapeno%' OR email LIKE 'tati@jalapeno%' OR email LIKE 'admin@jalapeno%'");
        console.log('✅ PostgreSQL schema and defaults verified');
    } catch (err) {
        console.error('Error initializing PostgreSQL database:', err);
    }
}

async function ensureDefaultDisciplinaryRulesAsync(force = false) {
    try {
        const officialSeeded = await queryGet("SELECT id FROM disciplinary_rules WHERE id = 'ri-12-4-11' AND active = 1");
        if (officialSeeded && !force) return;

        // Remove old generic 10-rule placeholders if present
        await queryRun("DELETE FROM disciplinary_rules WHERE id LIKE 'rule-%'");

        const officialRules = [
            // 12.1 Condutas Proibidas — Leves (6 itens)
            {
                id: 'ri-12-1-01',
                code: 'Item 12.1.1',
                category: '12.1 Conduta Leve',
                title: 'Atraso eventual dentro do razoável, sem aviso',
                description: 'Descumprimento do dever de pontualidade e aviso prévio à liderança (Seção 5.2 e Seção 6.2 do Regimento Interno).'
            },
            {
                id: 'ri-12-1-02',
                code: 'Item 12.1.2',
                category: '12.1 Conduta Leve',
                title: 'Uniforme sujo ou incompleto (ex.: sem boné) de forma pontual',
                description: 'Descumprimento do padrão de apresentação pessoal e uso completo do kit de uniforme: camisa, calça, boné e sapatilha (Seção 5.3 e Seção 7.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-1-03',
                code: 'Item 12.1.3',
                category: '12.1 Conduta Leve',
                title: 'Desorganização pontual do posto de trabalho ou da estação',
                description: 'Descumprimento do dever de organização da estação e da regra de ouro da limpeza: "terminou de usar, limpou" (Seção 5.6 do Regimento Interno).'
            },
            {
                id: 'ri-12-1-04',
                code: 'Item 12.1.4',
                category: '12.1 Conduta Leve',
                title: 'Esquecimento isolado de um item de baixo risco de checklist, corrigido por conta própria antes do fim do turno',
                description: 'Falha pontual na execução e marcação dos checklists operacionais obrigatórios da estação (Seção 5.9 e Seção 5.9.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-1-05',
                code: 'Item 12.1.5',
                category: '12.1 Conduta Leve',
                title: 'Uso do celular no horário de expediente e em área de manipulação de alimentos',
                description: 'Violação da proibição expressa de utilização de aparelho celular durante o horário de expediente e nas áreas de manipulação de alimentos (Seção 10.6 do Regimento Interno).'
            },
            {
                id: 'ri-12-1-06',
                code: 'Item 12.1.6',
                category: '12.1 Conduta Leve',
                title: 'Descuido pontual com a comunicação entre estações',
                description: 'Falha no dever de comunicação operacional sobre falta de insumos, atrasos, falhas de equipamentos ou riscos entre estações (Seção 5.7 do Regimento Interno).'
            },

            // 12.2 Condutas Proibidas — Médias (11 itens)
            {
                id: 'ri-12-2-01',
                code: 'Item 12.2.1',
                category: '12.2 Conduta Média',
                title: 'Atrasos reiterados ou saída antecipada sem autorização',
                description: 'Violação reiterada do dever de pontualidade e cumprimento integral da jornada de trabalho contratada (Seção 5.2 e Seção 6.2 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-02',
                code: 'Item 12.2.2',
                category: '12.2 Conduta Média',
                title: 'Falta sem justificativa (sem atestado médico)',
                description: 'Ausência injustificada ao turno escalado sem apresentação de atestado médico ou justificativa legal em até 2 dias úteis, sujeita a desconto do dia e do DSR (Seção 6.4 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-03',
                code: 'Item 12.2.3',
                category: '12.2 Conduta Média',
                title: 'Reincidência em condutas leves',
                description: 'Repetição de infração de natureza leve dentro do período de validade de 12 meses, ensejando progressão na escada disciplinar (Seção 12.1 e Seção 13.3 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-04',
                code: 'Item 12.2.4',
                category: '12.2 Conduta Média',
                title: 'Ignorar POP, ficha técnica ou orientação da liderança',
                description: 'Descumprimento dos Procedimentos Operacionais Padrão (POPs), fichas técnicas de preparo (pilar Qualidade – QAV) ou diretrizes diretas da liderança (Seção 3.2 e Seção 5.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-05',
                code: 'Item 12.2.5',
                category: '12.2 Conduta Média',
                title: 'Não fazer, deixar incompleto ou preencher em bloco/atrasado os checklists operacionais',
                description: 'Descumprimento da obrigação operacional de execução e registro fiel dos checklists de abertura, pré-turno, limpeza, temperaturas, validades e fechamento (Seção 5.9 e Seção 5.9.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-06',
                code: 'Item 12.2.6',
                category: '12.2 Conduta Média',
                title: 'Trabalhar sem EPI ou ignorar regra de higiene pessoal',
                description: 'Violação das normas de segurança e higiene: uso obrigatório de EPIs, cabelos presos com touca/boné, unhas curtas sem esmalte, ausência de adornos e lavagem correta das mãos (Seção 7.2 e Seção 8.2 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-07',
                code: 'Item 12.2.7',
                category: '12.2 Conduta Média',
                title: 'Atendimento descortês ou desatenção reiterada com cliente ou colega',
                description: 'Violação dos deveres de hospitalidade, respeito, cordialidade e conferência de pedidos no atendimento ao cliente e convivência com a equipe (Seção 5.5, Seção 9.2 e Seção 9.3 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-08',
                code: 'Item 12.2.8',
                category: '12.2 Conduta Média',
                title: 'Registro impreciso de estoque, contagem ou recebimento por descuido',
                description: 'Falha na conferência de recebimento contra nota fiscal/Alô Chefia ou preenchimento impreciso de contagens e unidades de medida (Seção 5.9 e Seção 10.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-09',
                code: 'Item 12.2.9',
                category: '12.2 Conduta Média',
                title: 'Má conservação de equipamentos, uniforme ou patrimônio',
                description: 'Descuido no zelo pelo patrimônio, equipamentos, utensílios ou uniforme fornecidos pela empresa (Seção 5.8, Seção 7.1 e Seção 10.4 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-10',
                code: 'Item 12.2.10',
                category: '12.2 Conduta Média',
                title: 'Descumprir a escala ou trocar folga sem autorização',
                description: 'Alteração unilateral da escala semanal ou troca de turno/folga sem aprovação prévia da liderança (Seção 6.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-2-11',
                code: 'Item 12.2.11',
                category: '12.2 Conduta Média',
                title: 'Linguagem ofensiva ou inapropriada no ambiente de trabalho',
                description: 'Uso de linguagem incompatível com o dever de respeito, cordialidade e boa convivência no ambiente de trabalho (Seção 5.5 e Seção 11 do Regimento Interno).'
            },

            // 12.3 Condutas Proibidas — Graves (13 itens)
            {
                id: 'ri-12-3-01',
                code: 'Item 12.3.1',
                category: '12.3 Conduta Grave',
                title: 'Reincidência em condutas médias',
                description: 'Repetição de falta de natureza média dentro do período de validade de 12 meses, ensejando agravamento na escada disciplinar (Seção 12.2 e Seção 13.3 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-02',
                code: 'Item 12.3.2',
                category: '12.3 Conduta Grave',
                title: 'Desrespeitar clientes, colegas ou líderes (discussão, gritaria, deboche, desobediência deliberada)',
                description: 'Violação grave dos deveres de respeito, hospitalidade e convivência harmônica no ambiente de trabalho (Seção 5.5, Seção 9.6 e Seção 11.5 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-03',
                code: 'Item 12.3.3',
                category: '12.3 Conduta Grave',
                title: 'Insubordinação: recusar ordem legítima e pertinente à função',
                description: 'Recusa injustificada em cumprir determinação legítima da liderança ou procedimento inerente ao contrato de trabalho (Seção 5.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-04',
                code: 'Item 12.3.4',
                category: '12.3 Conduta Grave',
                title: 'Violação de regra de segurança de alimentos que exponha o cliente a risco (temperatura, validade, contaminação cruzada)',
                description: 'Descumprimento de regras críticas de segurança alimentar: controle de temperatura (zona de perigo 5 °C a 60 °C), PVPS, etiquetagem de validade/lote, prevenção à contaminação cruzada ou descarte de insumos impróprios (Seção 8.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-05',
                code: 'Item 12.3.5',
                category: '12.3 Conduta Grave',
                title: 'Manipular alimentos estando doente, com ferimento sem proteção, ou sem lavar as mãos de forma recorrente',
                description: 'Violação das normas sanitárias de saúde e higiene obrigatória das mãos na manipulação de alimentos (Seção 7.2 e Seção 7.3 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-06',
                code: 'Item 12.3.6',
                category: '12.3 Conduta Grave',
                title: 'Diluição manual proibida de químicos, uso indevido de equipamento ou produto',
                description: 'Violação das normas de segurança química e operacional: proibição de diluir manualmente produtos com diluidor automático, uso de esponja de aço/panos inadequados ou operação indevida de maquinário (Seção 8.2 e Seção 8.3 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-07',
                code: 'Item 12.3.7',
                category: '12.3 Conduta Grave',
                title: 'Divulgar imagens ou informações internas sem autorização',
                description: 'Gravação ou divulgação não autorizada de imagens de clientes, colegas, caixa, áreas restritas ou bastidores da operação (Seção 5.10, Seção 9.8 e Seção 10.5 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-08',
                code: 'Item 12.3.8',
                category: '12.3 Conduta Grave',
                title: 'Dormir em serviço, ou abandonar o posto sem autorização',
                description: 'Interrupção não autorizada da prestação de serviços ou abandono da estação durante o expediente de trabalho (Seção 5.2 e Seção 6 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-09',
                code: 'Item 12.3.9',
                category: '12.3 Conduta Grave',
                title: 'Fumar, usar vapes ou cigarros eletrônicos dentro da loja ou uniformizado em área de preparo',
                description: 'Violação das normas de higiene, segurança alimentar e apresentação pessoal nas dependências da unidade (Seção 7 e Seção 8 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-10',
                code: 'Item 12.3.10',
                category: '12.3 Conduta Grave',
                title: 'Registrar ponto de outra pessoa ou pedir que registrem o seu',
                description: 'Fraude na marcação pessoal e intransferível do controle de jornada de trabalho (Seção 5.9 e Seção 6.2 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-11',
                code: 'Item 12.3.11',
                category: '12.3 Conduta Grave',
                title: 'Ocultar erro, acidente ou incidente que gere risco',
                description: 'Omissão no dever de comunicar imediatamente à liderança falhas operacionais, riscos, acidentes ou quase-acidentes (Seção 5.7 e Seção 8.4 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-12',
                code: 'Item 12.3.12',
                category: '12.3 Conduta Grave',
                title: 'Não executar itens de segurança de alimentos do checklist (temperatura, validade, higienização, troca de óleo) ou reincidir em não fazer checklists',
                description: 'Omissão crítica em controles obrigatórios de segurança alimentar do checklist operacional ou reincidência no descumprimento de checklists após advertência (Seção 5.9.1 e Seção 8.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-3-13',
                code: 'Item 12.3.13',
                category: '12.3 Conduta Grave',
                title: 'Piadas, comentários ou condutas discriminatórias ou de cunho sexual (1ª ocorrência de menor gravidade)',
                description: 'Violação da Política de Convivência, Respeito e Prevenção a Assédios e Discriminação (Seção 11.1 a 11.3 do Regimento Interno).'
            },

            // 12.4 Condutas Proibidas — Gravíssimas / Passíveis de Justa Causa - Art. 482 CLT (11 itens)
            {
                id: 'ri-12-4-01',
                code: 'Item 12.4.1',
                category: '12.4 Conduta Gravíssima',
                title: 'Assédio moral ou sexual, discriminação, ameaça, agressão física ou verbal grave',
                description: 'Violação gravíssima à dignidade, integridade física ou psicológica de clientes, colegas, líderes ou fornecedores (Seção 11.1 a 11.5 do Regimento Interno e Art. 482 da CLT).'
            },
            {
                id: 'ri-12-4-02',
                code: 'Item 12.4.2',
                category: '12.4 Conduta Gravíssima',
                title: 'Retaliação a quem denunciou ou colaborou com apuração',
                description: 'Violação gravíssima da garantia de não retaliação a relatos e colaborações de boa-fé (Seção 4.11, Seção 11.7 e Seção 15 do Regimento Interno).'
            },
            {
                id: 'ri-12-4-03',
                code: 'Item 12.4.3',
                category: '12.4 Conduta Gravíssima',
                title: 'Furto, roubo, fraude ou desvio de dinheiro, mercadoria, insumo, cortesia ou patrimônio',
                description: 'Ato de improbidade contra o patrimônio, caixa ou estoque da empresa, colegas ou clientes (Seção 10.2, Seção 10.3 do Regimento Interno e Art. 482, "a", da CLT).'
            },
            {
                id: 'ri-12-4-04',
                code: 'Item 12.4.4',
                category: '12.4 Conduta Gravíssima',
                title: 'Falsificação de registros (ponto, estoque, contagem, NF, validade, temperatura) e marcar checklist como feito sem ter feito ("fazer de conta")',
                description: 'Quebra grave de confiança mediante adulteração de registros operacionais ou marcação falsa de checklist sem execução / assinatura por terceiro (Seção 5.9.1 e Seção 10.1 do Regimento Interno).'
            },
            {
                id: 'ri-12-4-05',
                code: 'Item 12.4.5',
                category: '12.4 Conduta Gravíssima',
                title: 'Porte de arma ou objeto perigoso no ambiente de trabalho',
                description: 'Exposição deliberada do ambiente de trabalho a perigo grave e violação das normas de segurança (Seção 12.4 do Regimento Interno).'
            },
            {
                id: 'ri-12-4-06',
                code: 'Item 12.4.6',
                category: '12.4 Conduta Gravíssima',
                title: 'Violação de sigilo relevante (receitas, fichas técnicas, processos, dados de clientes)',
                description: 'Quebra do dever de confidencialidade sobre segredos operacionais, fichas técnicas, custos, sistemas e dados protegidos pela LGPD (Seção 5.10 e Seção 10.5 do Regimento Interno).'
            },
            {
                id: 'ri-12-4-07',
                code: 'Item 12.4.7',
                category: '12.4 Conduta Gravíssima',
                title: 'Conduta que gere risco grave à saúde do cliente ou colega de forma deliberada ou por negligência grave',
                description: 'Violação extrema das normas de segurança de alimentos ou segurança do trabalho com risco grave à saúde ou integridade física (Seção 8 e Seção 12.4 do Regimento Interno).'
            },
            {
                id: 'ri-12-4-08',
                code: 'Item 12.4.8',
                category: '12.4 Conduta Gravíssima',
                title: 'Ato lesivo à honra ou à boa fama de colegas, clientes ou da empresa, inclusive nas redes sociais',
                description: 'Difamação, injúria, calúnia ou exposição depreciativa de clientes, colaboradores ou da marca Jalapeño (Seção 9.4, Seção 9.8 do Regimento Interno e Art. 482, "j" e "k", da CLT).'
            },
            {
                id: 'ri-12-4-09',
                code: 'Item 12.4.9',
                category: '12.4 Conduta Gravíssima',
                title: 'Concorrência desleal ou negociação por conta própria que prejudique a empresa',
                description: 'Violação do dever de lealdade contratual e conflito de interesses (Seção 5.12, Seção 12.4 do Regimento Interno e Art. 482, "c", da CLT).'
            },
            {
                id: 'ri-12-4-10',
                code: 'Item 12.4.10',
                category: '12.4 Conduta Gravíssima',
                title: 'Abandono de emprego (ausência injustificada por mais de 30 dias consecutivos ou intenção clara de não voltar)',
                description: 'Configura abandono de emprego nos termos da Seção 6.4, Seção 12.4 do Regimento Interno e Art. 482, "i", da CLT.'
            },
            {
                id: 'ri-12-4-11',
                code: 'Item 12.4.11',
                category: '12.4 Conduta Gravíssima',
                title: 'Outras hipóteses previstas no Art. 482 da CLT',
                description: 'Falta grave capitulada no artigo 482 da Consolidação das Leis do Trabalho (Seção 1.1 e Seção 12.4 do Regimento Interno).'
            }
        ];

        for (const r of officialRules) {
            const existingItem = await queryGet('SELECT id FROM disciplinary_rules WHERE id = ?', [r.id]);
            if (existingItem) {
                await queryRun(`
                    UPDATE disciplinary_rules
                    SET code = ?, category = ?, title = ?, description = ?, active = 1
                    WHERE id = ?
                `, [r.code, r.category, r.title, r.description, r.id]);
            } else {
                await queryRun(`
                    INSERT INTO disciplinary_rules (id, code, category, title, description, company_id, active)
                    VALUES (?, ?, ?, ?, ?, NULL, 1)
                `, [r.id, r.code, r.category, r.title, r.description]);
            }
        }
    } catch (e) {
        console.error('Error seeding disciplinary rules:', e);
    }
}

async function ensureDefaultGoalsAsync() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const existing = await queryGet('SELECT * FROM goals WHERE month = ?', [currentMonth]);
    if (!existing) {
        const anyGoal = await queryGet('SELECT * FROM goals ORDER BY month DESC LIMIT 1');
        if (anyGoal) {
            await queryRun(`
                INSERT INTO goals (
                    id, month,
                    revenueGoal, revenueSuperGoal,
                    cmvGoal, cmvSuperGoal,
                    ratingGoal, ratingSuperGoal,
                    opsGoal, opsSuperGoal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                randomUUID(), currentMonth,
                anyGoal.revenueGoal, anyGoal.revenueSuperGoal,
                anyGoal.cmvGoal, anyGoal.cmvSuperGoal,
                anyGoal.ratingGoal, anyGoal.ratingSuperGoal,
                anyGoal.opsGoal, anyGoal.opsSuperGoal
            ]);
        } else {
            await queryRun(`
                INSERT INTO goals (
                    id, month,
                    revenueGoal, revenueSuperGoal,
                    cmvGoal, cmvSuperGoal,
                    ratingGoal, ratingSuperGoal,
                    opsGoal, opsSuperGoal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'default-init', currentMonth,
                50000, 60000,
                28, 25,
                4.5, 4.8,
                7, 8
            ]);
        }
    }
}

// SQLite initialization (only used when USE_POSTGRES is false)
function initializeSqliteDatabase() {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    try {
        db.exec('ALTER TABLE users ADD COLUMN elegivelPremio INTEGER DEFAULT 1');
    } catch (_) {}
    console.log('✅ SQLite Database initialized successfully');
}

const isBuilding = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

if (!isBuilding) {
    if (USE_POSTGRES) {
        initPostgresDatabase().catch(err => console.error('Postgres init error:', err));
    } else {
        try {
            initializeSqliteDatabase();
            ensureUserColumnsAsync().catch(() => {});
            ensureDefaultGoalsAsync().catch(() => {});
            ensureDefaultDisciplinaryRulesAsync().catch(() => {});
        } catch (err) {
            console.error('SQLite initialization error:', err);
        }
    }

    // Auto-start Saipos sync loop on server boot
    import('./saipos-sync.js').then(m => m.initSaiposSync()).catch(e => console.error('Sync init error:', e));
} else {
    console.log('Skipping database initialization during build phase...');
}

// ===== USER QUERIES =====

async function getUserByNfcId(nfcId) {
    if (!nfcId) return null;
    const normalizedNfcId = nfcId.replace(/:/g, '').toUpperCase();
    return await queryGet("SELECT * FROM users WHERE UPPER(REPLACE(nfc_id, ':', '')) = ?", [normalizedNfcId]);
}

async function getUsers(companyId) {
    await ensureUserColumnsAsync();
    let query = `
        SELECT u.*, 
               tl.name as trainingLevelName, 
               tl.icon as trainingLevelIcon, 
               tl.order_index as trainingLevelOrder,
               tg.name as trainingGroupName,
               tp.name as trainingProgramName
        FROM users u
        LEFT JOIN training_levels tl ON u.training_level_id = tl.id
        LEFT JOIN training_groups tg ON tl.group_id = tg.id
        LEFT JOIN training_programs tp ON tg.program_id = tp.id
    `;
    const params = [];
    if (companyId) {
        query += " WHERE (u.company_id = ? OR instr(',' || u.company_id || ',', ',' || ? || ',') > 0)";
        params.push(companyId, companyId);
    }
    query += ' ORDER BY u.name';

    return await queryAll(query, params);
}

async function getUserByEmail(email) {
    await ensureUserColumnsAsync();
    return await queryGet(`
        SELECT u.*, 
               tl.name as trainingLevelName, 
               tl.icon as trainingLevelIcon, 
               tl.order_index as trainingLevelOrder,
               tg.name as trainingGroupName,
               tp.name as trainingProgramName
        FROM users u
        LEFT JOIN training_levels tl ON u.training_level_id = tl.id
        LEFT JOIN training_groups tg ON tl.group_id = tg.id
        LEFT JOIN training_programs tp ON tg.program_id = tp.id
        WHERE u.email = ?
    `, [email]);
}

async function getUserByCajaUserId(cajaUserId) {
    if (!cajaUserId) return null;
    await ensureUserColumnsAsync();
    return await queryGet(`
        SELECT u.*, 
               tl.name as trainingLevelName, 
               tl.icon as trainingLevelIcon, 
               tl.order_index as trainingLevelOrder,
               tg.name as trainingGroupName,
               tp.name as trainingProgramName
        FROM users u
        LEFT JOIN training_levels tl ON u.training_level_id = tl.id
        LEFT JOIN training_groups tg ON tl.group_id = tg.id
        LEFT JOIN training_programs tp ON tg.program_id = tp.id
        WHERE u.cajaUserId = ?
    `, [cajaUserId]);
}

async function getUserByResetToken(token) {
    return await queryGet('SELECT * FROM users WHERE resetToken = ?', [token]);
}

async function getUserById(id) {
    await ensureUserColumnsAsync();
    return await queryGet(`
        SELECT u.*, 
               tl.name as trainingLevelName, 
               tl.icon as trainingLevelIcon, 
               tl.order_index as trainingLevelOrder,
               tg.name as trainingGroupName,
               tp.name as trainingProgramName
        FROM users u
        LEFT JOIN training_levels tl ON u.training_level_id = tl.id
        LEFT JOIN training_groups tg ON tl.group_id = tg.id
        LEFT JOIN training_programs tp ON tg.program_id = tp.id
        WHERE u.id = ?
    `, [id]);
}

async function createUser(user) {
    await ensureUserColumnsAsync();
    const id = user.id || generateId();
    await queryRun(`
        INSERT INTO users(id, name, email, password, role, plataBalance, isFirstAccess, maquininhaOnboarding, training_level_id, company_id, nfc_id, recebeJae, elegivelPremio, hiringDate, documents, cajaUserId, cajaRole)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.plataBalance || 0,
        user.isFirstAccess !== undefined ? (user.isFirstAccess ? 1 : 0) : 1,
        user.maquininhaOnboarding !== undefined ? (user.maquininhaOnboarding ? 1 : 0) : 0,
        user.training_level_id || null,
        user.company_id || null,
        user.nfc_id ? user.nfc_id.replace(/:/g, '').toUpperCase() : null,
        user.recebeJae !== undefined ? (user.recebeJae ? 1 : 0) : 0,
        user.elegivelPremio !== undefined ? (user.elegivelPremio ? 1 : 0) : 1,
        user.hiringDate || null,
        user.documents || null,
        user.cajaUserId || null,
        user.cajaRole || null
    ]);
    return await getUserById(id);
}

async function updateUser(id, updates) {
    await ensureUserColumnsAsync();
    const fields = [];
    const values = [];

    const currentUser = await getUserById(id);
    if (!currentUser) throw new Error('Usuário não encontrado');

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.password !== undefined) { fields.push('password = ?'); values.push(updates.password); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.plataBalance !== undefined) { fields.push('plataBalance = ?'); values.push(updates.plataBalance); }
    if (updates.isFirstAccess !== undefined) { fields.push('isFirstAccess = ?'); values.push(updates.isFirstAccess ? 1 : 0); }
    if (updates.maquininhaOnboarding !== undefined) { fields.push('maquininhaOnboarding = ?'); values.push(updates.maquininhaOnboarding); }
    if (updates.resetToken !== undefined) { fields.push('resetToken = ?'); values.push(updates.resetToken); }
    if (updates.resetTokenExpires !== undefined) { fields.push('resetTokenExpires = ?'); values.push(updates.resetTokenExpires); }
    if (updates.pdfObs !== undefined) { fields.push('pdfObs = ?'); values.push(updates.pdfObs); }
    if (updates.nfc_id !== undefined) {
        fields.push('nfc_id = ?');
        values.push(updates.nfc_id ? updates.nfc_id.replace(/:/g, '').toUpperCase() : null);
    }
    if (updates.recebeJae !== undefined) {
        fields.push('recebeJae = ?');
        values.push(updates.recebeJae ? 1 : 0);
    }
    if (updates.elegivelPremio !== undefined) {
        fields.push('elegivelPremio = ?');
        values.push(updates.elegivelPremio ? 1 : 0);
    }
    if (updates.hiringDate !== undefined) {
        fields.push('hiringDate = ?');
        values.push(updates.hiringDate || null);
    }
    if (updates.documents !== undefined) {
        fields.push('documents = ?');
        values.push(updates.documents || null);
    }
    if (updates.company_id !== undefined) {
        fields.push('company_id = ?');
        values.push(updates.company_id);
    }
    if (updates.cajaUserId !== undefined) {
        fields.push('cajaUserId = ?');
        values.push(updates.cajaUserId);
    }
    if (updates.cajaRole !== undefined) {
        fields.push('cajaRole = ?');
        values.push(updates.cajaRole);
    }

    let rewardDescription = '';
    let rewardAmount = 0;

    if (updates.training_level_id !== undefined && updates.training_level_id !== currentUser.training_level_id) {
        fields.push('training_level_id = ?');
        values.push(updates.training_level_id);

        if (currentUser.training_level_id && updates.training_level_id && !updates.skipRewards) {
            const newLevel = await queryGet('SELECT * FROM training_levels WHERE id = ?', [updates.training_level_id]);
            if (newLevel && newLevel.platas > 0) {
                rewardAmount += newLevel.platas;
                rewardDescription += `Recompensa por completar a etapa: ${newLevel.name}. `;
            }

            const oldLevel = await queryGet('SELECT * FROM training_levels WHERE id = ?', [currentUser.training_level_id]);
            if (newLevel && oldLevel && newLevel.group_id !== oldLevel.group_id) {
                const newGroup = await queryGet('SELECT * FROM training_groups WHERE id = ?', [newLevel.group_id]);
                if (newGroup && newGroup.platas > 0) {
                    rewardAmount += newGroup.platas;
                    rewardDescription += `Bônus por novo grupo: ${newGroup.name}. `;
                }
            }
        }
    }

    delete updates.skipRewards;

    if (rewardAmount > 0) {
        const currentBalance = updates.plataBalance !== undefined ? updates.plataBalance : currentUser.plataBalance;
        const newBalance = (currentBalance || 0) + rewardAmount;

        const pbIdx = fields.findIndex(f => f.startsWith('plataBalance'));
        if (pbIdx !== -1) {
            values[pbIdx] = newBalance;
        } else {
            fields.push('plataBalance = ?');
            values.push(newBalance);
        }

        try {
            const txId = randomUUID();
            const timestamp = new Date().toISOString();
            const hash = createHash('sha256')
                .update(txId + 'SYSTEM' + id + rewardAmount + timestamp)
                .digest('hex');

            await queryRun(`
                INSERT INTO plata_transactions 
                (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
                VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
            `, [txId, id, rewardAmount, rewardDescription.trim(), timestamp, hash, currentUser.company_id || 'default-company']);
        } catch (e) {
            console.error('Failed to record training reward transaction:', e);
        }
    }

    if (fields.length === 0) return await getUserById(id);

    values.push(id);
    await queryRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    const updatedUser = await getUserById(id);
    return { ...updatedUser, rewardAmount };
}

async function deleteUser(id) {
    await queryRun('DELETE FROM pdi_answers WHERE userId = ?', [id]);
    await queryRun('DELETE FROM pdi_evaluations WHERE user_id = ?', [id]);
    await queryRun('DELETE FROM plata_transactions WHERE fromUserId = ? OR toUserId = ?', [id, id]);
    await queryRun('DELETE FROM store_purchases WHERE userId = ?', [id]);

    return await queryRun('DELETE FROM users WHERE id = ?', [id]);
}

// ===== TRAINING PROGRAM QUERIES =====

async function getTrainingPrograms(companyId) {
    return await queryAll("SELECT * FROM training_programs WHERE company_id = 'SYSTEM' OR company_id IS NULL ORDER BY created_at DESC");
}

async function createTrainingProgram(program) {
    const id = program.id || generateId();
    await queryRun(`
        INSERT INTO training_programs (id, name, description, company_id)
        VALUES (?, ?, ?, 'SYSTEM')
    `, [id, program.name, program.description]);
    return { id, ...program, company_id: 'SYSTEM' };
}

async function updateTrainingProgram(id, updates) {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE training_programs SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return { id, ...updates };
}

async function deleteTrainingProgram(id) {
    const groups = await queryAll('SELECT id FROM training_groups WHERE program_id = ?', [id]);
    for (const g of groups) {
        await queryRun('UPDATE training_levels SET group_id = NULL WHERE group_id = ?', [g.id]);
    }
    await queryRun('DELETE FROM training_groups WHERE program_id = ?', [id]);
    await queryRun('DELETE FROM training_programs WHERE id = ?', [id]);
}

// ===== TRAINING GROUP QUERIES =====

async function getTrainingGroups(programId) {
    return await queryAll('SELECT * FROM training_groups WHERE program_id = ? ORDER BY order_index ASC', [programId]);
}

async function createTrainingGroup(group) {
    const id = group.id || generateId();
    await queryRun(`
        INSERT INTO training_groups (id, program_id, name, order_index, platas)
        VALUES (?, ?, ?, ?, ?)
    `, [id, group.program_id, group.name, group.order_index || 0, group.platas || 0]);
    return { id, ...group };
}

async function updateTrainingGroup(id, updates) {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.order_index !== undefined) { fields.push('order_index = ?'); values.push(updates.order_index); }
    if (updates.platas !== undefined) { fields.push('platas = ?'); values.push(updates.platas); }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE training_groups SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return { id, ...updates };
}

async function deleteTrainingGroup(id) {
    await queryRun('UPDATE training_levels SET group_id = NULL WHERE group_id = ?', [id]);
    await queryRun('DELETE FROM training_groups WHERE id = ?', [id]);
}

async function getAllTrainingGroups() {
    return await queryAll('SELECT * FROM training_groups ORDER BY order_index ASC');
}

// ===== TRAINING LEVEL QUERIES =====

async function getTrainingLevels(groupId = null) {
    let query = "SELECT * FROM training_levels WHERE (company_id = 'SYSTEM' OR company_id IS NULL)";
    const params = [];

    if (groupId) {
        query += ' AND group_id = ?';
        params.push(groupId);
    }

    query += ' ORDER BY order_index ASC';
    return await queryAll(query, params);
}

async function getAllTrainingLevels() {
    return await queryAll("SELECT * FROM training_levels WHERE company_id = 'SYSTEM' OR company_id IS NULL ORDER BY order_index ASC");
}

async function createTrainingLevel(level) {
    const id = level.id || generateId();
    await queryRun(`
        INSERT INTO training_levels(id, order_index, name, description, icon, company_id, group_id, platas)
        VALUES(?, ?, ?, ?, ?, 'SYSTEM', ?, ?)
    `, [id, level.order_index, level.name, level.description, level.icon, level.group_id || null, level.platas || 0]);
    return { id, ...level, company_id: 'SYSTEM' };
}

async function updateTrainingLevel(id, updates) {
    const fields = [];
    const values = [];

    if (updates.order_index !== undefined) { fields.push('order_index = ?'); values.push(updates.order_index); }
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
    if (updates.group_id !== undefined) { fields.push('group_id = ?'); values.push(updates.group_id); }
    if (updates.platas !== undefined) { fields.push('platas = ?'); values.push(updates.platas); }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE training_levels SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return { id, ...updates };
}

async function deleteTrainingLevel(id) {
    await queryRun('DELETE FROM training_levels WHERE id = ?', [id]);
}

// ===== SHIFT QUERIES =====

async function getShifts(companyId) {
    let query = 'SELECT * FROM shifts';
    const params = [];
    if (companyId) {
        query += ' WHERE company_id = ?';
        params.push(companyId);
    }
    query += " ORDER BY date DESC, CASE WHEN type = 'NIGHT' THEN 0 ELSE 1 END ASC";

    const shifts = await queryAll(query, params);
    if (shifts.length === 0) return [];

    // Fetch all shift_workers in a single query to avoid N+1 network roundtrips
    const allWorkers = await queryAll('SELECT shiftId, userId as id, status FROM shift_workers');
    const workersByShift = new Map();
    for (const w of allWorkers) {
        if (!workersByShift.has(w.shiftId)) {
            workersByShift.set(w.shiftId, []);
        }
        workersByShift.get(w.shiftId).push({ id: w.id, status: w.status });
    }

    return shifts.map(shift => ({
        ...shift,
        metrics: {
            CMV: shift.metricCMV,
            RATING: shift.metricRATING,
            OPS: shift.metricOPS
        },
        workers: workersByShift.get(shift.id) || []
    }));
}

async function getShiftById(id) {
    const shift = await queryGet('SELECT * FROM shifts WHERE id = ?', [id]);
    if (!shift) return null;

    const workers = await queryAll(`
        SELECT userId as id, status
        FROM shift_workers
        WHERE shiftId = ?
    `, [id]);

    return {
        ...shift,
        metrics: {
            CMV: shift.metricCMV,
            RATING: shift.metricRATING,
            OPS: shift.metricOPS
        },
        workers
    };
}

async function createShift(shift) {
    const id = shift.id || generateId();

    await queryRun(`
        INSERT INTO shifts (id, date, type, revenue, metricCMV, metricRATING, metricOPS, company_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id,
        shift.date,
        shift.type,
        shift.revenue,
        shift.metrics?.CMV ?? null,
        shift.metrics?.RATING ?? null,
        shift.metrics?.OPS ?? null,
        shift.company_id || null
    ]);

    if (shift.workers && shift.workers.length > 0) {
        for (const worker of shift.workers) {
            await queryRun(`
                INSERT INTO shift_workers (shiftId, userId, status)
                VALUES (?, ?, ?)
            `, [id, worker.id, worker.status]);
        }
    }

    return await getShiftById(id);
}

async function updateShift(id, updates) {
    const shift = await getShiftById(id);
    if (!shift) return null;

    if (updates.date || updates.type || updates.revenue || updates.metrics) {
        const fields = [];
        const values = [];

        if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
        if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
        if (updates.revenue !== undefined) { fields.push('revenue = ?'); values.push(updates.revenue); }
        if (updates.metrics?.CMV !== undefined) { fields.push('metricCMV = ?'); values.push(updates.metrics.CMV); }
        if (updates.metrics?.RATING !== undefined) { fields.push('metricRATING = ?'); values.push(updates.metrics.RATING); }
        if (updates.metrics?.OPS !== undefined) { fields.push('metricOPS = ?'); values.push(updates.metrics.OPS); }

        if (fields.length > 0) {
            values.push(id);
            await queryRun(`UPDATE shifts SET ${fields.join(', ')} WHERE id = ?`, values);
        }
    }

    if (updates.workers) {
        await queryRun('DELETE FROM shift_workers WHERE shiftId = ?', [id]);
        for (const worker of updates.workers) {
            await queryRun(`
                INSERT INTO shift_workers (shiftId, userId, status)
                VALUES (?, ?, ?)
            `, [id, worker.id, worker.status]);
        }
    }

    return await getShiftById(id);
}

async function deleteShift(id) {
    await queryRun('DELETE FROM shifts WHERE id = ?', [id]);
}

async function getShiftByTypeAndDate(type, date, companyId = null) {
    let query = 'SELECT * FROM shifts WHERE type = ? AND date = ?';
    const params = [type, date];
    if (companyId) {
        query += ' AND company_id = ?';
        params.push(companyId);
    }
    const shift = await queryGet(query, params);
    if (!shift) return null;

    const workers = await queryAll(`
        SELECT userId as id, status
        FROM shift_workers
        WHERE shiftId = ?
    `, [shift.id]);

    return {
        ...shift,
        metrics: {
            CMV: shift.metricCMV,
            RATING: shift.metricRATING,
            OPS: shift.metricOPS
        },
        workers
    };
}

// ===== PDI QUESTIONS & ANSWERS =====

async function getPDIQuestions(activeOnly = true, modelId = null, companyId = null) {
    let query = 'SELECT * FROM pdi_questions';
    const conditions = ["(company_id = 'SYSTEM' OR company_id IS NULL)"];
    const params = [];

    if (activeOnly) {
        conditions.push('active = 1');
    }

    if (modelId) {
        conditions.push('model_id = ?');
        params.push(modelId);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    const rows = await queryAll(query, params);
    return rows.map(q => ({
        ...q,
        roles: JSON.parse(q.roles || '["all"]')
    }));
}

async function createPDIQuestion(question) {
    const id = randomUUID();
    const { text, category, roles, modelId } = question;
    const targetModelId = modelId || 'default-model';

    await queryRun(`
        INSERT INTO pdi_questions (id, text, category, roles, active, model_id, company_id)
        VALUES (?, ?, ?, ?, ?, ?, 'SYSTEM')
    `, [id, text, category, JSON.stringify(roles || ['all']), 1, targetModelId]);

    return { id, text, category, roles: roles || ['all'], active: 1, modelId: targetModelId, company_id: 'SYSTEM' };
}

async function deletePDIQuestion(id) {
    await queryRun('DELETE FROM pdi_questions WHERE id = ?', [id]);
}

async function getPDIAnswers(userId, date, evaluationId = null) {
    if (evaluationId) {
        return await queryAll(`
            SELECT a.*, q.text as questionText, q.category as questionCategory
            FROM pdi_answers a
            JOIN pdi_questions q ON a.questionId = q.id
            WHERE a.evaluation_id = ?
        `, [evaluationId]);
    }

    return await queryAll(`
        SELECT a.*, q.text as questionText, q.category as questionCategory
        FROM pdi_answers a
        JOIN pdi_questions q ON a.questionId = q.id
        WHERE a.userId = ? AND a.date LIKE ?
    `, [userId, `${date}%`]);
}

async function savePDIAnswer(answer) {
    const id = answer.id || randomUUID();
    let existing;
    if (answer.evaluationId) {
        existing = await queryGet('SELECT id FROM pdi_answers WHERE evaluation_id = ? AND questionId = ?', [answer.evaluationId, answer.questionId]);
    } else {
        existing = await queryGet('SELECT id FROM pdi_answers WHERE userId = ? AND questionId = ? AND date = ?', [answer.userId, answer.questionId, answer.date]);
    }

    if (existing) {
        const updates = [];
        const params = [];
        if (answer.selfScore !== undefined) { updates.push('selfScore = ?'); params.push(answer.selfScore); }
        if (answer.selfComment !== undefined) { updates.push('selfComment = ?'); params.push(answer.selfComment); }
        if (answer.admScore !== undefined) { updates.push('admScore = ?'); params.push(answer.admScore); }
        if (answer.admComment !== undefined) { updates.push('admComment = ?'); params.push(answer.admComment); }

        if (updates.length > 0) {
            params.push(existing.id);
            await queryRun(`UPDATE pdi_answers SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        return { ...answer, id: existing.id };
    } else {
        await queryRun(`
            INSERT INTO pdi_answers (id, evaluation_id, userId, questionId, selfScore, selfComment, admScore, admComment, date, company_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            answer.evaluationId || null,
            answer.userId,
            answer.questionId,
            answer.selfScore || null,
            answer.selfComment || null,
            answer.admScore || null,
            answer.admComment || null,
            answer.date,
            answer.company_id || null
        ]);
        return { id, ...answer };
    }
}

// ===== ADVANCE QUERIES =====

async function getAdvances(userId = null, companyId = null) {
    let query = 'SELECT * FROM advances';
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push('userId = ?');
        params.push(userId);
    }

    if (companyId) {
        conditions.push('company_id = ?');
        params.push(companyId);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC';
    return await queryAll(query, params);
}

async function getAdvanceById(id) {
    return await queryGet('SELECT * FROM advances WHERE id = ?', [id]);
}

async function createAdvance(advance) {
    const id = advance.id || generateId();
    await queryRun(`
        INSERT INTO advances (id, userId, value, description, date, company_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [id, advance.userId, advance.value, advance.description, advance.date, advance.company_id || null]);
    return await getAdvanceById(id);
}

async function deleteAdvance(id) {
    await queryRun('DELETE FROM advances WHERE id = ?', [id]);
}

// ===== ABSENCE QUERIES =====

async function getAbsences(userId = null, companyId = null, status = null) {
    let query = 'SELECT * FROM absences';
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push('userId = ?');
        params.push(userId);
    }

    if (companyId) {
        conditions.push('company_id = ?');
        params.push(companyId);
    }

    if (status) {
        conditions.push('justification_status = ?');
        params.push(status);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC';
    return await queryAll(query, params);
}

async function getAbsenceById(id) {
    return await queryGet('SELECT * FROM absences WHERE id = ?', [id]);
}

async function createAbsence(absence) {
    const id = absence.id || generateId();
    await queryRun(`
        INSERT INTO absences (id, userId, date, description, excused, certificate_url, justification_status, company_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id,
        absence.userId,
        absence.date,
        absence.description,
        absence.excused ? 1 : 0,
        absence.certificate_url || null,
        absence.justification_status || null,
        absence.company_id || null
    ]);
    return await getAbsenceById(id);
}

async function updateAbsence(id, updates) {
    const fields = [];
    const values = [];

    if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.excused !== undefined) { fields.push('excused = ?'); values.push(updates.excused ? 1 : 0); }
    if (updates.certificate_url !== undefined) { fields.push('certificate_url = ?'); values.push(updates.certificate_url); }
    if (updates.justification_status !== undefined) { fields.push('justification_status = ?'); values.push(updates.justification_status); }

    if (fields.length === 0) return await getAbsenceById(id);

    values.push(id);
    await queryRun(`UPDATE absences SET ${fields.join(', ')} WHERE id = ?`, values);
    return await getAbsenceById(id);
}

async function deleteAbsence(id) {
    await queryRun('DELETE FROM absences WHERE id = ?', [id]);
}

// ===== GOAL QUERIES =====

async function getGoals(month, companyId = null) {
    // 1. Check permanent weekly goal for this company ('WEEKLY')
    let weeklyGoal = companyId
        ? await queryGet("SELECT * FROM goals WHERE month = 'WEEKLY' AND company_id = ?", [companyId])
        : await queryGet("SELECT * FROM goals WHERE month = 'WEEKLY' AND company_id IS NULL");

    if (!weeklyGoal) {
        // Seed initial WEEKLY goal from latest monthly goal (dividing monthly revenue by 4)
        let fallback = companyId
            ? await queryGet("SELECT * FROM goals WHERE company_id = ? AND month != 'WEEKLY' ORDER BY month DESC LIMIT 1", [companyId])
            : null;
        if (!fallback) {
            fallback = await queryGet("SELECT * FROM goals WHERE company_id IS NULL AND month != 'WEEKLY' ORDER BY month DESC LIMIT 1");
        }
        if (!fallback) return null;

        const initRevGoal = Math.round((Number(fallback.revenueGoal || 0) / 4) * 100) / 100;
        const initRevSuperGoal = Math.round((Number(fallback.revenueSuperGoal || 0) / 4) * 100) / 100;
        const now = new Date().toISOString();
        const newId = randomUUID();

        await queryRun(`
            INSERT INTO goals (
                id, month,
                revenueGoal, revenueSuperGoal,
                cmvGoal, cmvSuperGoal,
                ratingGoal, ratingSuperGoal,
                opsGoal, opsSuperGoal,
                locked, company_id, updatedAt
            ) VALUES (?, 'WEEKLY', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `, [
            newId,
            initRevGoal, initRevSuperGoal,
            fallback.cmvGoal, fallback.cmvSuperGoal,
            fallback.ratingGoal, fallback.ratingSuperGoal,
            fallback.opsGoal, fallback.opsSuperGoal,
            companyId || null,
            now
        ]);

        weeklyGoal = companyId
            ? await queryGet("SELECT * FROM goals WHERE month = 'WEEKLY' AND company_id = ?", [companyId])
            : await queryGet("SELECT * FROM goals WHERE month = 'WEEKLY' AND company_id IS NULL");
    }

    // 2. If a specific YYYY-MM month was requested, check if that month is locked
    let isLocked = false;
    if (month && month !== 'WEEKLY') {
        const monthRow = companyId
            ? await queryGet('SELECT locked FROM goals WHERE month = ? AND company_id = ?', [month, companyId])
            : await queryGet('SELECT locked FROM goals WHERE month = ? AND company_id IS NULL', [month]);
        if (monthRow) {
            isLocked = !!monthRow.locked;
        }
    }

    return {
        locked: isLocked,
        company_id: weeklyGoal.company_id || companyId || null,
        REVENUE: {
            id: 'REVENUE',
            label: 'Faturamento Semanal',
            goal: weeklyGoal.revenueGoal,
            superGoal: weeklyGoal.revenueSuperGoal,
            type: 'asc',
            hiddenInShiftForm: true
        },
        CMV: {
            id: 'CMV',
            label: 'CMV',
            goal: weeklyGoal.cmvGoal,
            superGoal: weeklyGoal.cmvSuperGoal,
            type: 'desc'
        },
        RATING: {
            id: 'RATING',
            label: 'Avaliação',
            goal: weeklyGoal.ratingGoal,
            superGoal: weeklyGoal.ratingSuperGoal,
            type: 'asc'
        },
        OPS: {
            id: 'OPS',
            label: 'Nota Operacional',
            goal: weeklyGoal.opsGoal,
            superGoal: weeklyGoal.opsSuperGoal,
            type: 'asc'
        }
    };
}

async function updateGoals(goals, month) {
    const companyId = goals.company_id || null;
    const now = new Date().toISOString();

    // Always persist goal targets to the permanent 'WEEKLY' record for this unit
    const existingWeekly = companyId
        ? await queryGet("SELECT id FROM goals WHERE month = 'WEEKLY' AND company_id = ?", [companyId])
        : await queryGet("SELECT id FROM goals WHERE month = 'WEEKLY' AND company_id IS NULL");

    if (existingWeekly) {
        await queryRun(`
            UPDATE goals SET
                revenueGoal = ?, revenueSuperGoal = ?,
                cmvGoal = ?, cmvSuperGoal = ?,
                ratingGoal = ?, ratingSuperGoal = ?,
                opsGoal = ?, opsSuperGoal = ?,
                updatedAt = ?
            WHERE id = ?
        `, [
            goals.REVENUE.goal, goals.REVENUE.superGoal,
            goals.CMV.goal, goals.CMV.superGoal,
            goals.RATING.goal, goals.RATING.superGoal,
            goals.OPS.goal, goals.OPS.superGoal,
            now,
            existingWeekly.id
        ]);
    } else {
        await queryRun(`
            INSERT INTO goals (
                id, month,
                revenueGoal, revenueSuperGoal,
                cmvGoal, cmvSuperGoal,
                ratingGoal, ratingSuperGoal,
                opsGoal, opsSuperGoal,
                locked, company_id, updatedAt
            ) VALUES (?, 'WEEKLY', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `, [
            randomUUID(),
            goals.REVENUE.goal, goals.REVENUE.superGoal,
            goals.CMV.goal, goals.CMV.superGoal,
            goals.RATING.goal, goals.RATING.superGoal,
            goals.OPS.goal, goals.OPS.superGoal,
            companyId,
            now
        ]);
    }

    // If locked state is being toggled for a specific YYYY-MM month, persist lock on that month row
    if (month && month !== 'WEEKLY' && goals.locked !== undefined) {
        const lockedVal = goals.locked ? 1 : 0;
        const existingMonth = companyId
            ? await queryGet('SELECT id FROM goals WHERE month = ? AND company_id = ?', [month, companyId])
            : await queryGet('SELECT id FROM goals WHERE month = ? AND company_id IS NULL', [month]);

        if (existingMonth) {
            await queryRun('UPDATE goals SET locked = ?, updatedAt = ? WHERE id = ?', [lockedVal, now, existingMonth.id]);
        } else {
            await queryRun(`
                INSERT INTO goals (
                    id, month,
                    revenueGoal, revenueSuperGoal,
                    cmvGoal, cmvSuperGoal,
                    ratingGoal, ratingSuperGoal,
                    opsGoal, opsSuperGoal,
                    locked, company_id, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                randomUUID(),
                month,
                goals.REVENUE.goal, goals.REVENUE.superGoal,
                goals.CMV.goal, goals.CMV.superGoal,
                goals.RATING.goal, goals.RATING.superGoal,
                goals.OPS.goal, goals.OPS.superGoal,
                lockedVal,
                companyId,
                now
            ]);
        }
    }

    return await getGoals(month, companyId);
}

// ===== PLATA TRANSACTION QUERIES =====

async function transferPlata(fromUserId, toUserId, amount, description, password) {
    const fromUser = await queryGet('SELECT password, plataBalance, company_id FROM users WHERE id = ?', [fromUserId]);

    if (!fromUser) {
        throw new Error('Usuário remetente não encontrado');
    }

    if (fromUser.password !== password) {
        throw new Error('Senha incorreta');
    }

    if (fromUser.plataBalance < amount) {
        throw new Error('Saldo insuficiente');
    }

    const toUser = await queryGet('SELECT id, company_id FROM users WHERE id = ?', [toUserId]);
    if (!toUser) {
        throw new Error('Usuário destinatário não encontrado');
    }

    if (fromUser.company_id !== toUser.company_id) {
        throw new Error('Não é possível transferir Platas para membros de outra empresa');
    }

    return await runInTransaction(async tx => {
        const id = randomUUID();
        const timestamp = new Date().toISOString();

        const hash = createHash('sha256')
            .update(id + fromUserId + toUserId + amount + timestamp)
            .digest('hex');

        await tx.run('UPDATE users SET plataBalance = plataBalance - ? WHERE id = ?', [amount, fromUserId]);
        await tx.run('UPDATE users SET plataBalance = plataBalance + ? WHERE id = ?', [amount, toUserId]);

        const companyId = fromUser.company_id || 'default-company';

        await tx.run(`
            INSERT INTO plata_transactions
            (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, fromUserId, toUserId, amount, description || '', timestamp, hash, companyId]);

        return { id, hash, timestamp };
    });
}

async function getPlataHistory(userId, limit = 50) {
    try {
        const transactions = await queryAll(`
            SELECT
                pt.id,
                pt.fromUserId,
                pt.toUserId,
                pt.amount,
                pt.description,
                pt.timestamp,
                uf.name as fromUserName,
                ut.name as toUserName
            FROM plata_transactions pt
            LEFT JOIN users uf ON pt.fromUserId = uf.id
            LEFT JOIN users ut ON pt.toUserId = ut.id
            WHERE pt.fromUserId = ? OR pt.toUserId = ?

            UNION ALL

            SELECT
                a.id,
                a.userId as fromUserId,
                'MAQUININHA' as toUserId,
                a.value as amount,
                a.description,
                a.date as timestamp,
                u.name as fromUserName,
                'Maquininha' as toUserName
            FROM advances a
            LEFT JOIN users u ON a.userId = u.id
            WHERE a.userId = ?

            ORDER BY timestamp DESC
            LIMIT ?
        `, [userId, userId, userId, limit]);

        return transactions.map(tx => ({
            ...tx,
            fromUserName: tx.fromUserName || 'Admin',
            toUserName: tx.toUserName || 'Admin'
        }));
    } catch (error) {
        console.error('[getPlataHistory] Database Error:', error);
        throw error;
    }
}

async function verifyTransaction(transactionId) {
    const tx = await queryGet('SELECT * FROM plata_transactions WHERE id = ?', [transactionId]);
    if (!tx) return false;

    const expectedHash = createHash('sha256')
        .update(tx.id + tx.fromUserId + tx.toUserId + tx.amount + tx.timestamp)
        .digest('hex');

    return tx.hash === expectedHash;
}

async function getUsersForTransfer(currentUserId) {
    const user = await queryGet('SELECT company_id FROM users WHERE id = ?', [currentUserId]);
    const companyId = user ? user.company_id : null;

    let query = 'SELECT id, name, role FROM users WHERE id != ?';
    const params = [currentUserId];

    if (companyId) {
        query += ' AND company_id = ?';
        params.push(companyId);
    }

    query += ' ORDER BY role DESC, name';
    return await queryAll(query, params);
}

// ===== WEEKLY METRICS QUERIES =====

async function getWeeklyMetrics(dateValue, companyId = null) {
    if (!dateValue) return null;
    try {
        let query = 'SELECT * FROM weekly_metrics WHERE date = ?';
        const params = [dateValue];

        if (companyId) {
            query += ' AND company_id = ?';
            params.push(companyId);
        }

        return await queryGet(query, params);
    } catch (e) {
        console.error('Error fetching weekly metrics:', e);
        return null;
    }
}

async function listWeeklyMetrics(companyId) {
    try {
        let query = 'SELECT * FROM weekly_metrics';
        const params = [];

        if (companyId) {
            query += ' WHERE company_id = ?';
            params.push(companyId);
        }

        query += ' ORDER BY date DESC';
        return await queryAll(query, params);
    } catch (e) {
        console.error('Error listing weekly metrics:', e);
        return [];
    }
}

async function saveWeeklyMetrics(metrics) {
    const { date, cmv, rating, ops, company_id } = metrics;
    const effectiveCompanyId = company_id || 'default-company';

    const existing = await queryGet('SELECT * FROM weekly_metrics WHERE date = ? AND company_id = ?', [date, effectiveCompanyId]);

    if (existing) {
        await queryRun('UPDATE weekly_metrics SET cmv = ?, rating = ?, ops = ? WHERE date = ? AND company_id = ?', [cmv, rating, ops, date, effectiveCompanyId]);
    } else {
        await queryRun('INSERT INTO weekly_metrics(date, cmv, rating, ops, company_id) VALUES(?, ?, ?, ?, ?)', [date, cmv, rating, ops, effectiveCompanyId]);
    }

    try {
        const [y, m, d] = String(date).split('-').map(Number);
        const sun = new Date(y, m - 1, d);
        sun.setDate(sun.getDate() + 6);
        const sundayStr = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`;
        await queryRun(
            'UPDATE shifts SET metricCMV = ?, metricRATING = ?, metricOPS = ? WHERE company_id = ? AND date >= ? AND date <= ?',
            [parseFloat(cmv) || 0, parseFloat(rating) || 0, parseFloat(ops) || 0, effectiveCompanyId, date, sundayStr]
        );
    } catch (e) {
        console.error('Error propagating weekly metrics to shifts:', e);
    }

    return await getWeeklyMetrics(date, effectiveCompanyId);
}

// ===== COMPANIES =====

async function getCompanies() {
    return await queryAll('SELECT * FROM companies ORDER BY name');
}

async function createCompany({ name, adminName, adminEmail, latitude, longitude, checkinRadius }) {
    const existing = await queryGet('SELECT id FROM companies WHERE name = ?', [name]);
    if (existing) {
        throw new Error('Empresa já cadastrada');
    }

    const companyId = randomUUID();
    const now = new Date().toISOString();

    await queryRun(`
        INSERT INTO companies(id, name, adminName, adminEmail, latitude, longitude, checkinRadius, createdAt)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `, [companyId, name, adminName, adminEmail, latitude || null, longitude || null, checkinRadius || 200, now]);

    return { id: companyId, name, adminName, adminEmail, latitude, longitude, checkinRadius };
}

async function getCompanyById(id) {
    return await queryGet('SELECT * FROM companies WHERE id = ?', [id]);
}

async function updateCompany(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.latitude !== undefined) { fields.push('latitude = ?'); values.push(updates.latitude); }
    if (updates.longitude !== undefined) { fields.push('longitude = ?'); values.push(updates.longitude); }
    if (updates.checkinRadius !== undefined) { fields.push('checkinRadius = ?'); values.push(updates.checkinRadius); }
    if (updates.saipos_token !== undefined) { fields.push('saipos_token = ?'); values.push(updates.saipos_token); }
    if (updates.ignore_ficha_venda !== undefined) { fields.push('ignore_ficha_venda = ?'); values.push(updates.ignore_ficha_venda ? 1 : 0); }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return await getCompanyById(id);
}

// ===== STREAKS QUERIES =====

async function getStreaksConfig() {
    return await queryGet('SELECT * FROM streaks_config WHERE id = ?', ['current']);
}

async function updateStreaksConfig(config) {
    return await queryRun(
        'UPDATE streaks_config SET days_required = ?, plata_reward = ?, bonus_no_absences = ?, bonus_no_lateness = ? WHERE id = ?',
        [config.days_required, config.plata_reward, config.bonus_no_absences, config.bonus_no_lateness, 'current']
    );
}

async function calculateClosingRewards(month, companyId) {
    const users = await queryAll("SELECT id, name FROM users WHERE (company_id = ? OR company_id IS NULL) AND role != 'admin'", [companyId]);
    const streaksConfig = await getStreaksConfig();

    const results = [];
    for (const user of users) {
        const checkins = await queryAll(`
            SELECT status 
            FROM user_checkins 
            WHERE userId = ? AND date LIKE ?
        `, [user.id, `${month}%`]);

        let lateCount = 0;
        checkins.forEach(c => {
            if (c.status === 'LATE') lateCount++;
        });

        const hasAbsence = await queryGet('SELECT 1 FROM absences WHERE userId = ? AND date LIKE ? LIMIT 1', [user.id, `${month}%`]);
        const hasLateness = lateCount > 0;

        const rewards = {
            userId: user.id,
            name: user.name,
            premioPlatas: 0,
            onTimeCount: checkins.length - lateCount,
            lateCount,
            disciplineBonus: 0,
            disciplineDetails: [],
            totalPlatas: 0
        };

        if (!hasAbsence) {
            rewards.disciplineBonus += streaksConfig.bonus_no_absences;
            rewards.disciplineDetails.push(`Zero Faltas(+${streaksConfig.bonus_no_absences})`);
        }
        if (!hasLateness && checkins.length > 0) {
            rewards.disciplineBonus += streaksConfig.bonus_no_lateness;
            rewards.disciplineDetails.push(`Zero Atrasos(+${streaksConfig.bonus_no_lateness})`);
        }

        rewards.totalPlatas = rewards.premioPlatas + rewards.disciplineBonus;
        results.push(rewards);
    }

    return results;
}

async function awardPlataForCheckin(userId, status, companyId) {
    const amount = status === 'LATE' ? 1 : 3;
    const txId = randomUUID();
    const timestamp = new Date().toISOString();
    const hash = createHash('sha256')
        .update(txId + 'SYSTEM' + userId + amount + timestamp)
        .digest('hex');

    await runInTransaction(async tx => {
        await tx.run('UPDATE users SET plataBalance = plataBalance + ? WHERE id = ?', [amount, userId]);

        await tx.run(`
            INSERT INTO plata_transactions (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
        `, [txId, userId, amount, `Prêmio Diário (${status})`, timestamp, hash, companyId || 'default-company']);
    });

    return { amount, success: true };
}

async function applyClosingRewards(month, companyId, rewardsList) {
    await runInTransaction(async tx => {
        for (const reward of rewardsList) {
            if (reward.totalPlatas > 0) {
                const txId = randomUUID();
                const timestamp = new Date().toISOString();
                const hash = createHash('sha256')
                    .update(txId + 'SYSTEM' + reward.userId + reward.totalPlatas + timestamp)
                    .digest('hex');

                await tx.run('UPDATE users SET plataBalance = plataBalance + ? WHERE id = ?', [reward.totalPlatas, reward.userId]);

                const desc = `Fechamento Mensal ${month}: Prêmio(${reward.premioPlatas}) ${reward.disciplineDetails.length > 0 ? '+ ' + reward.disciplineDetails.join(', ') : ''} `;

                await tx.run(`
                    INSERT INTO plata_transactions
                    (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
                    VALUES(?, NULL, ?, ?, ?, ?, ?, ?)
                `, [txId, reward.userId, reward.totalPlatas, desc, timestamp, hash, companyId]);
            }
        }

        const existing = await tx.get('SELECT id FROM goals WHERE month = ? AND (company_id = ? OR company_id IS NULL)', [month, companyId]);
        if (existing) {
            await tx.run('UPDATE goals SET locked = 1 WHERE month = ? AND (company_id = ? OR company_id IS NULL)', [month, companyId]);
        } else {
            await tx.run(
                'INSERT INTO goals (id, month, revenueGoal, revenueSuperGoal, cmvGoal, cmvSuperGoal, ratingGoal, ratingSuperGoal, opsGoal, opsSuperGoal, locked, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [randomUUID(), month, 0, 0, 0, 0, 0, 0, 0, 0, 1, companyId]
            );
        }
    });
    return { success: true };
}

// ===== DELIVERY DRIVER QUERIES =====

async function getDeliveryDrivers() {
    return await queryAll('SELECT * FROM delivery_drivers ORDER BY name');
}

async function createDeliveryDriver(driver) {
    const id = driver.id || generateId();
    await queryRun(`
        INSERT INTO delivery_drivers (id, name, phone, type)
        VALUES (?, ?, ?, ?)
    `, [id, driver.name, driver.phone || null, driver.type || 'OUTSOURCED']);
    return { id, ...driver };
}

async function deleteDeliveryDriver(id) {
    const now = new Date();
    const mondayStr = getMonday(now);
    const d = parseLocalDate(mondayStr);
    d.setDate(d.getDate() + 6);
    const sundayStr = formatDateForInput(d);

    const checkins = await queryGet(`
        SELECT COUNT(*) as count 
        FROM driver_checkins 
        WHERE driver_id = ? AND date >= ? AND date <= ? AND active = 1
    `, [id, mondayStr, sundayStr]);

    if (checkins && checkins.count > 0) {
        throw new Error('Não é possível excluir um entregador que possui check-ins na semana vigente');
    }

    await queryRun('DELETE FROM delivery_drivers WHERE id = ?', [id]);
    return { success: true };
}

async function createDriverCheckin(checkin) {
    const id = checkin.id || generateId();

    let totalValue = 0;
    if (checkin.type === 'INTERNAL') {
        const config = await getDriverConfigs();
        const baseDiaria = config.daily_rate * (checkin.is_double ? 2 : 1);
        const deliveriesValue = (checkin.deliveries || 0) * config.delivery_rate;
        const feesValue = (checkin.fees || 0) * config.fee_rate;
        totalValue = baseDiaria + deliveriesValue + feesValue;
    }

    let minutesLate = parseInt(checkin.minutes_late || 0, 10);
    if (isNaN(minutesLate)) minutesLate = 0;

    const lateHoursPart = Math.floor(minutesLate / 60);
    const lateMinutesPart = minutesLate % 60;
    const lateDiscount = lateHoursPart + (lateMinutesPart >= 30 ? 1 : 0);

    let minutesEarly = parseInt(checkin.minutes_early || 0, 10);
    if (isNaN(minutesEarly)) minutesEarly = 0;

    const earlyHoursPart = Math.floor(minutesEarly / 60);
    const earlyMinutesPart = minutesEarly % 60;
    const earlyDiscount = earlyHoursPart + (earlyMinutesPart >= 30 ? 1 : 0);

    const discountedHours = lateDiscount + earlyDiscount;

    await runInTransaction(async tx => {
        await tx.run(
            'DELETE FROM driver_checkins WHERE id = ? OR (driver_id = ? AND date = ? AND active = 1)',
            [id, checkin.driver_id, checkin.date]
        );

        await tx.run(`
            INSERT INTO driver_checkins 
            (id, driver_id, date, status, is_double, deliveries, fees, total_value, minutes_late, discounted_hours, checkout_status, minutes_early, entry_time, exit_time, scale_id, double_scale_id, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            checkin.driver_id,
            checkin.date,
            checkin.status,
            checkin.is_double ? 1 : 0,
            checkin.deliveries || 0,
            checkin.fees || 0,
            totalValue,
            minutesLate,
            discountedHours,
            checkin.checkout_status || null,
            minutesEarly,
            checkin.entry_time || null,
            checkin.exit_time || null,
            checkin.scale_id || null,
            checkin.double_scale_id || null,
            getCurrentLocalISO()
        ]);
    });

    return {
        id,
        ...checkin,
        total_value: totalValue,
        minutes_late: minutesLate,
        discounted_hours: discountedHours,
        minutes_early: minutesEarly
    };
}

async function getDriverCheckins(date, startDate, endDate) {
    let query = 'SELECT * FROM driver_checkins';
    const params = [];

    if (startDate && endDate) {
        query += ' WHERE date >= ? AND date <= ?';
        params.push(startDate, endDate);
    } else if (date) {
        query += ' WHERE date = ?';
        params.push(date);
    }

    return await queryAll(query, params);
}

async function getDriverConfigs() {
    return await queryGet("SELECT * FROM driver_configs WHERE id = 'global'");
}

async function getDriverScales() {
    return await queryAll('SELECT * FROM driver_scales ORDER BY start_time ASC');
}

async function createDriverScale(scale) {
    const id = generateId();
    await queryRun('INSERT INTO driver_scales (id, start_time, end_time) VALUES (?, ?, ?)', [id, scale.start_time, scale.end_time]);
    return { id, ...scale };
}

async function deleteDriverScale(id) {
    await queryRun('DELETE FROM driver_scales WHERE id = ?', [id]);
    return { success: true };
}

async function updateDriverConfigs(configs) {
    await queryRun(`
        UPDATE driver_configs 
        SET daily_rate = ?, delivery_rate = ?, fee_rate = ?
        WHERE id = 'global'
    `, [configs.daily_rate, configs.delivery_rate, configs.fee_rate]);
    return configs;
}

async function createDriverPayment(payment) {
    const id = generateId();
    await queryRun(`
        INSERT INTO driver_payments (id, driver_id, amount, description, date, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [id, payment.driver_id, payment.amount, payment.description, payment.date, getCurrentLocalISO()]);
    return { id, ...payment };
}

async function getDriverPayments(driverId) {
    return await queryAll('SELECT * FROM driver_payments WHERE driver_id = ? ORDER BY date DESC', [driverId]);
}

async function getDriverBalance(driverId) {
    const settlements = await queryGet('SELECT SUM(total_value) as total FROM driver_checkins WHERE driver_id = ? AND active = 1', [driverId]);
    const payments = await queryGet('SELECT SUM(amount) as total FROM driver_payments WHERE driver_id = ? AND active = 1', [driverId]);

    return (Number(settlements?.total) || 0) - (Number(payments?.total) || 0);
}

async function cancelDriverCheckin(id, reason) {
    await queryRun('UPDATE driver_checkins SET active = 0, cancellation_reason = ? WHERE id = ?', [reason, id]);
    return { success: true };
}

async function cancelDriverPayment(id, reason) {
    await queryRun('UPDATE driver_payments SET active = 0, cancellation_reason = ? WHERE id = ?', [reason, id]);
    return { success: true };
}

async function deleteDriverCheckin(driverId, date) {
    await queryRun('DELETE FROM driver_checkins WHERE driver_id = ? AND date = ?', [driverId, date]);
    return { success: true };
}

async function getDriverMovements(driverId) {
    const settlements = await queryAll(`
        SELECT id, 'SETTLEMENT' as type, date, total_value as amount, 
        'Diária + ' || deliveries || ' ent. + ' || fees || ' tax.' as description,
        active, cancellation_reason, createdAt
        FROM driver_checkins 
        WHERE driver_id = ?
    `, [driverId]);

    const payments = await queryAll(`
        SELECT id, 'PAYMENT' as type, date, amount, description,
        active, cancellation_reason, createdAt
        FROM driver_payments 
        WHERE driver_id = ?
    `, [driverId]);

    return [...settlements, ...payments].sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

// ===== USER CHECK-IN QUERIES =====

async function getUserCheckin(userId, date) {
    return await queryGet('SELECT * FROM user_checkins WHERE userId = ? AND date = ?', [userId, date]);
}

async function getCompanyCheckinsByDate(companyId, date) {
    return await queryAll('SELECT * FROM user_checkins WHERE company_id = ? AND date = ?', [companyId, date]);
}

async function createUserCheckin(checkin) {
    const id = generateId();
    const cols = Object.keys(checkin);
    const placeholders = cols.map(() => '?').join(', ');
    const values = Object.values(checkin);

    await queryRun(`
        INSERT INTO user_checkins (id, ${cols.join(', ')})
        VALUES (?, ${placeholders})
    `, [id, ...values]);

    return { id, ...checkin };
}

async function updateUserCheckin(id, updates) {
    const cols = Object.keys(updates);
    const setClause = cols.map(col => `${col} = ?`).join(', ');
    const values = Object.values(updates);

    await queryRun(`
        UPDATE user_checkins SET ${setClause} WHERE id = ?
    `, [...values, id]);

    return await queryGet('SELECT * FROM user_checkins WHERE id = ?', [id]);
}

// ===== STORE QUERIES =====

async function getStoreItems(companyId, includeInactive = false) {
    let query = 'SELECT * FROM store_items WHERE (company_id = ? OR company_id IS NULL)';
    if (!includeInactive) {
        query += ' AND active = 1';
    }
    query += ' ORDER BY price ASC';
    return await queryAll(query, [companyId]);
}

async function createStoreItem(item) {
    const id = generateId();
    await queryRun(`
        INSERT INTO store_items (id, name, description, price, icon, company_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [id, item.name, item.description, item.price, item.icon, item.company_id]);
    return { id, ...item };
}

async function updateStoreItem(id, updates) {
    const cols = Object.keys(updates);
    const setClause = cols.map(col => `${col} = ?`).join(', ');
    const values = Object.values(updates);
    await queryRun(`UPDATE store_items SET ${setClause} WHERE id = ?`, [...values, id]);
    return await queryGet('SELECT * FROM store_items WHERE id = ?', [id]);
}

async function purchaseStoreItem(userId, itemId, companyId) {
    const item = await queryGet('SELECT * FROM store_items WHERE id = ? AND active = 1', [itemId]);
    if (!item) throw new Error('Item não encontrado ou indisponível');

    const user = await queryGet('SELECT plataBalance FROM users WHERE id = ?', [userId]);
    if (user.plataBalance < item.price) throw new Error('Saldo insuficiente em Platas');

    const purchaseId = generateId();
    const timestamp = new Date().toISOString();

    await runInTransaction(async tx => {
        await tx.run('UPDATE users SET plataBalance = plataBalance - ? WHERE id = ?', [item.price, userId]);

        await tx.run(`
            INSERT INTO store_purchases (id, userId, itemId, priceAtPurchase, status, company_id, createdAt)
            VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
        `, [purchaseId, userId, itemId, item.price, companyId, timestamp]);

        const txId = randomUUID();
        const hash = createHash('sha256')
            .update(txId + userId + 'STORE' + item.price + timestamp)
            .digest('hex');

        await tx.run(`
            INSERT INTO plata_transactions (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
        `, [txId, userId, item.price, `Compra na Loja: ${item.name}`, timestamp, hash, companyId]);
    });

    return await queryGet(`
        SELECT p.*, i.name as itemName, i.icon as itemIcon, i.description as itemDescription, u.name as userName
        FROM store_purchases p
        JOIN store_items i ON p.itemId = i.id
        JOIN users u ON p.userId = u.id
        WHERE p.id = ?
    `, [purchaseId]);
}

async function recordPlataUsage(userId, amount, description, companyId) {
    const user = await queryGet('SELECT plataBalance, company_id FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.plataBalance < amount) throw new Error('Saldo insuficiente em Platas');

    const txId = randomUUID();
    const timestamp = new Date().toISOString();
    const effectiveCompanyId = companyId || user.company_id || 'default-company';

    const hash = createHash('sha256')
        .update(txId + userId + 'USAGE' + amount + timestamp)
        .digest('hex');

    await runInTransaction(async tx => {
        await tx.run('UPDATE users SET plataBalance = plataBalance - ? WHERE id = ?', [amount, userId]);

        await tx.run(`
            INSERT INTO plata_transactions (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
        `, [txId, userId, amount, description, timestamp, hash, effectiveCompanyId]);
    });

    return { id: txId, newBalance: user.plataBalance - amount };
}

async function getStorePurchases(companyId, userId = null) {
    let query = `
        SELECT p.*, i.name as itemName, i.icon as itemIcon, i.description as itemDescription, u.name as userName
        FROM store_purchases p
        JOIN store_items i ON p.itemId = i.id
        JOIN users u ON p.userId = u.id
        WHERE (p.company_id = ? OR p.company_id IS NULL)
    `;
    const params = [companyId];

    if (userId) {
        query += ' AND p.userId = ?';
        params.push(userId);
    }

    query += ' ORDER BY p.createdAt DESC';
    return await queryAll(query, params);
}

async function updatePurchaseStatus(purchaseId, status) {
    if (!['APPROVED', 'CANCELLED'].includes(status)) throw new Error('Status inválido');

    const purchase = await queryGet('SELECT * FROM store_purchases WHERE id = ?', [purchaseId]);
    if (!purchase) throw new Error('Compra não encontrada');
    if (purchase.status !== 'PENDING') throw new Error('Esta compra já foi processada');

    await runInTransaction(async tx => {
        await tx.run('UPDATE store_purchases SET status = ? WHERE id = ?', [status, purchaseId]);

        if (status === 'CANCELLED') {
            await tx.run('UPDATE users SET plataBalance = plataBalance + ? WHERE id = ?', [purchase.priceAtPurchase, purchase.userId]);

            const txId = randomUUID();
            const timestamp = new Date().toISOString();
            const hash = createHash('sha256')
                .update(txId + 'SYSTEM' + purchase.userId + purchase.priceAtPurchase + timestamp)
                .digest('hex');

            await tx.run(`
                INSERT INTO plata_transactions (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
                VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
            `, [txId, purchase.userId, purchase.priceAtPurchase, `Estorno de Compra: ${purchaseId}`, timestamp, hash, purchase.company_id || 'default-company']);
        }
    });

    return { id: purchaseId, status };
}

async function getUnfinishedCheckins(userId) {
    return await queryAll('SELECT * FROM user_checkins WHERE userId = ? AND checkoutExit IS NULL', [userId]);
}

async function getUserCheckinsForMonth(userId, month) {
    return await queryAll('SELECT * FROM user_checkins WHERE userId = ? AND date LIKE ? ORDER BY date DESC', [userId, `${month}%`]);
}

async function deleteUserCheckin(id) {
    await queryRun('DELETE FROM user_checkins WHERE id = ?', [id]);
    return { success: true };
}

// ===== ADMIN PLATA ADJUSTMENT =====

async function adjustUserPlata({ userId, amount, type, description }) {
    return await runInTransaction(async tx => {
        const id = randomUUID();
        const timestamp = new Date().toISOString();

        if (type === 'CREDIT') {
            await tx.run('UPDATE users SET plataBalance = plataBalance + ? WHERE id = ?', [amount, userId]);
        } else if (type === 'DEBIT') {
            const user = await tx.get('SELECT plataBalance FROM users WHERE id = ?', [userId]);
            if (!user || user.plataBalance < amount) {
                throw new Error('Saldo insuficiente');
            }

            await tx.run('UPDATE users SET plataBalance = plataBalance - ? WHERE id = ?', [amount, userId]);
        } else {
            throw new Error('Tipo de transação inválido');
        }

        const updatedUser = await tx.get('SELECT plataBalance, company_id FROM users WHERE id = ?', [userId]);
        const companyId = updatedUser?.company_id || 'default-company';

        const fromUserId = type === 'CREDIT' ? null : userId;
        const toUserId = type === 'CREDIT' ? userId : null;

        const hash = createHash('sha256')
            .update(id + (fromUserId || 'ADMIN') + (toUserId || 'ADMIN') + amount + timestamp)
            .digest('hex');

        await tx.run(`
            INSERT INTO plata_transactions 
            (id, fromUserId, toUserId, amount, description, timestamp, hash, company_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, fromUserId, toUserId, amount, description.trim(), timestamp, hash, companyId]);

        return updatedUser.plataBalance;
    });
}

// ===== PDI EVALUATIONS & MODELS =====

async function getPDIEvaluations({ userId = null, status = null, companyId = null } = {}) {
    let query = 'SELECT e.*, u.name as userName FROM pdi_evaluations e JOIN users u ON e.user_id = u.id';
    const params = [];

    if (companyId) {
        query += " WHERE (u.company_id = ? OR instr(',' || u.company_id || ',', ',' || ? || ',') > 0)";
        params.push(companyId, companyId);
    } else {
        query += ' WHERE 1=1';
    }

    if (userId) {
        query += ' AND e.user_id = ?';
        params.push(userId);
    }
    if (status) {
        query += ' AND e.status = ?';
        params.push(status);
    }

    query += ' ORDER BY e.scheduled_date DESC';
    return await queryAll(query, params);
}

async function createPDIEvaluation({ userId, date }) {
    const result = await queryRun(
        "INSERT INTO pdi_evaluations (user_id, scheduled_date, status) VALUES (?, ?, 'PENDING_SELF') RETURNING id",
        [userId, date]
    );

    return { id: result.lastInsertRowid, status: 'PENDING_SELF' };
}

async function updatePDIEvaluation(id, updatesPayload) {
    const {
        status,
        completed_at,
        user_viewed,
        focus_op_id,
        focus_op_comment,
        focus_cult_id,
        focus_cult_comment,
        final_comment
    } = updatesPayload;

    const updates = [];
    const params = [];

    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (completed_at !== undefined) { updates.push('completed_at = ?'); params.push(completed_at); }
    if (user_viewed !== undefined) { updates.push('user_viewed = ?'); params.push(user_viewed); }
    if (focus_op_id !== undefined) { updates.push('focus_op_id = ?'); params.push(focus_op_id); }
    if (focus_op_comment !== undefined) { updates.push('focus_op_comment = ?'); params.push(focus_op_comment); }
    if (focus_cult_id !== undefined) { updates.push('focus_cult_id = ?'); params.push(focus_cult_id); }
    if (focus_cult_comment !== undefined) { updates.push('focus_cult_comment = ?'); params.push(focus_cult_comment); }
    if (final_comment !== undefined) { updates.push('final_comment = ?'); params.push(final_comment); }

    if (updates.length > 0) {
        params.push(id);
        await queryRun(`UPDATE pdi_evaluations SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return { success: true };
}

async function deletePDIEvaluation(id) {
    await queryRun('DELETE FROM pdi_evaluations WHERE id = ?', [id]);
    return { success: true };
}

async function getPDIModels() {
    return await queryAll("SELECT * FROM pdi_models WHERE company_id = 'SYSTEM' OR company_id IS NULL ORDER BY created_at DESC");
}

async function createPDIModel({ title, description }) {
    const id = randomUUID();
    await queryRun("INSERT INTO pdi_models (id, title, description, company_id) VALUES (?, ?, ?, 'SYSTEM')", [id, title, description || '']);
    return { success: true, id, company_id: 'SYSTEM' };
}

async function updatePDIModel(id, { title, description }) {
    const info = await queryRun('UPDATE pdi_models SET title = ?, description = ? WHERE id = ?', [title, description || '', id]);
    return { updated: info.changes > 0, id, title, description };
}

async function deletePDIModel(id) {
    const evaluations = await queryGet('SELECT count(*) as count FROM pdi_evaluations WHERE model_id = ?', [id]);
    if (evaluations && evaluations.count > 0) {
        return {
            deleted: false,
            reason: 'LINKED_EVALUATIONS',
            error: 'Não é possível excluir este modelo pois existem avaliações vinculadas a ele.'
        };
    }

    const info = await queryRun('DELETE FROM pdi_models WHERE id = ?', [id]);
    if (info.changes === 0) {
        return { deleted: false, reason: 'NOT_FOUND', error: 'Model not found' };
    }

    return { deleted: true };
}

// ===== DRIVER BONUS ELIGIBILITY =====

async function getDriverBonusEligibilityStats(driverId, yearMonth) {
    const checkins = await queryGet(`
        SELECT count(DISTINCT date) as count
        FROM driver_checkins 
        WHERE driver_id = ? AND date LIKE ? AND active = 1
    `, [driverId, `${yearMonth}%`]);

    const alreadyPaid = await queryGet(`
        SELECT id 
        FROM driver_payments 
        WHERE driver_id = ? AND description = 'Bônus 0 Faltas' AND date LIKE ? AND active = 1
    `, [driverId, `${yearMonth}%`]);

    const configs = await queryGet("SELECT daily_rate FROM driver_configs WHERE id = 'global'");

    return {
        checkinsCount: checkins ? checkins.count : 0,
        alreadyPaid: !!alreadyPaid,
        bonusAmount: configs && configs.daily_rate ? configs.daily_rate : 80
    };
}

// ===== ADMIN RECOVERY & BACKUP HELPERS =====

async function recoverNightShiftsByDates(dates) {
    const results = [];

    for (const date of dates) {
        const checkins = await queryAll("SELECT * FROM user_checkins WHERE date = ? AND shiftType = 'NIGHT'", [date]);

        if (checkins.length === 0) {
            results.push({ date, status: 'Nenhum check-in NIGHT encontrado' });
            continue;
        }

        const companyId = checkins[0].company_id;
        const existingShift = await queryGet("SELECT id FROM shifts WHERE date = ? AND type = 'NIGHT' AND company_id = ?", [date, companyId]);

        if (existingShift) {
            results.push({ date, companyId, status: 'Turno já existe', shiftId: existingShift.id });
            continue;
        }

        const shiftId = 'rec_api_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

        await runInTransaction(async tx => {
            await tx.run(`
                INSERT INTO shifts (id, date, type, revenue, metricCMV, metricRATING, metricOPS, company_id)
                VALUES (?, ?, 'NIGHT', 0, 0, 0, 0, ?)
            `, [shiftId, date, companyId]);

            for (const ci of checkins) {
                await tx.run(`
                    INSERT INTO shift_workers (shiftId, userId, status)
                    VALUES (?, ?, ?)
                `, [shiftId, ci.userId, ci.status || 'ON_TIME']);
            }
        });

        results.push({ date, companyId, status: 'Criado com Sucesso', shiftId, workers: checkins.length });
    }

    return results;
}

async function checkpointDatabaseForBackup() {
    try {
        if (!USE_POSTGRES && db && typeof db.pragma === 'function') {
            db.pragma('wal_checkpoint(TRUNCATE)');
        }
    } catch (err) {
        console.warn('[Backup] Aviso ao executar wal_checkpoint:', err.message);
    }
}

// ===== SAIPOS SYNC HELPERS =====

async function getCompaniesWithSaiposToken() {
    return await queryAll('SELECT * FROM companies WHERE saipos_token IS NOT NULL');
}

async function syncShiftRevenueAndMetrics(companyId, date, type, revenue, weeklyMetrics) {
    const shift = await queryGet('SELECT id, metricCMV FROM shifts WHERE company_id = ? AND date = ? AND type = ?', [companyId, date, type]);

    if (shift) {
        let query = 'UPDATE shifts SET revenue = ?';
        const params = [revenue];

        if (!shift.metricCMV && weeklyMetrics) {
            query += ', metricCMV = ?, metricRATING = ?, metricOPS = ?';
            params.push(weeklyMetrics.cmv, weeklyMetrics.rating, weeklyMetrics.ops);
        }

        query += ' WHERE id = ?';
        params.push(shift.id);

        await queryRun(query, params);
        return { updated: true, created: false, metricsApplied: !shift.metricCMV && !!weeklyMetrics };
    }

    // Turnos DIA e NOITE devem existir sempre de terça a domingo (dayOfWeek !== 1),
    // independentemente de haver check-ins vinculados, ou em qualquer dia se houver faturamento (> 0).
    const dayOfWeek = parseLocalDate(date).getDay();
    if (dayOfWeek !== 1 || revenue > 0) {
        const shiftId = generateId();
        const cmv = weeklyMetrics?.cmv ?? 0;
        const rating = weeklyMetrics?.rating ?? 0;
        const ops = weeklyMetrics?.ops ?? 0;

        await queryRun(`
            INSERT INTO shifts (id, date, type, revenue, metricCMV, metricRATING, metricOPS, company_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [shiftId, date, type, revenue, cmv, rating, ops, companyId]);

        // Vincular eventuais check-ins já existentes nesta data/empresa/turno
        try {
            const checkins = await queryAll(
                'SELECT userId, shiftType, status, checkinEntry, checkoutExit FROM user_checkins WHERE company_id = ? AND date = ?',
                [companyId, date]
            );
            for (const ci of checkins) {
                let shouldLink = ci.shiftType === type;
                let workerStatus = ci.status || 'ON_TIME';

                if (!shouldLink && type === 'NIGHT' && ci.shiftType === 'DAY' && ci.checkinEntry && ci.checkoutExit) {
                    const diffHours = (new Date(ci.checkoutExit) - new Date(ci.checkinEntry)) / (1000 * 60 * 60);
                    if (diffHours >= 12) {
                        shouldLink = true;
                        workerStatus = 'ON_TIME';
                    }
                }

                if (shouldLink) {
                    await queryRun(
                        'INSERT INTO shift_workers (shiftId, userId, status) VALUES (?, ?, ?)',
                        [shiftId, ci.userId, workerStatus]
                    );
                }
            }
        } catch (err) {
            console.error('[Sync] Erro ao vincular check-ins ao turno recém-criado:', err);
        }

        return { updated: true, created: true, metricsApplied: !!weeklyMetrics };
    }

    return { updated: false, created: false };
}

// ===== DISCIPLINARY RULES & RECORDS (REGIMENTO INTERNO / MEDIDAS DISCIPLINARES) =====

let disciplinaryTablesVerified = false;
async function ensureDisciplinaryTablesAsync() {
    if (disciplinaryTablesVerified) return;
    try {
        if (USE_POSTGRES) {
            await queryRun(`
                CREATE TABLE IF NOT EXISTS disciplinary_rules (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    title TEXT NOT NULL,
                    category TEXT,
                    description TEXT,
                    company_id TEXT,
                    active INTEGER DEFAULT 1,
                    createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
                )
            `);
            await queryRun(`
                CREATE TABLE IF NOT EXISTS disciplinary_records (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    company_id TEXT,
                    type TEXT NOT NULL CHECK(type IN ('ORIENTATION', 'VERBAL_WARNING', 'WRITTEN_WARNING', 'SUSPENSION')),
                    rule_id TEXT,
                    rule_title TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    suspension_days INTEGER DEFAULT 0,
                    document_url TEXT,
                    document_name TEXT,
                    created_by TEXT,
                    createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
                )
            `);
        } else {
            db.exec(`
                CREATE TABLE IF NOT EXISTS disciplinary_rules (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    title TEXT NOT NULL,
                    category TEXT,
                    description TEXT,
                    company_id TEXT,
                    active INTEGER DEFAULT 1,
                    createdAt TEXT DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS disciplinary_records (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    company_id TEXT,
                    type TEXT NOT NULL CHECK(type IN ('ORIENTATION', 'VERBAL_WARNING', 'WRITTEN_WARNING', 'SUSPENSION')),
                    rule_id TEXT,
                    rule_title TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL,
                    suspension_days INTEGER DEFAULT 0,
                    document_url TEXT,
                    document_name TEXT,
                    created_by TEXT,
                    createdAt TEXT DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_disciplinary_records_user ON disciplinary_records(userId);
                CREATE INDEX IF NOT EXISTS idx_disciplinary_records_company ON disciplinary_records(company_id);
                CREATE INDEX IF NOT EXISTS idx_disciplinary_records_date ON disciplinary_records(date);
            `);
        }
        await ensureDefaultDisciplinaryRulesAsync();
        try {
            await queryRun('ALTER TABLE disciplinary_records ADD COLUMN suspension_start_date TEXT');
        } catch (_) { /* column already exists */ }
        disciplinaryTablesVerified = true;
    } catch (e) {
        console.error('Error ensuring disciplinary tables:', e);
    }
}

async function getDisciplinaryRules(companyId) {
    await ensureDisciplinaryTablesAsync();
    await ensureDefaultDisciplinaryRulesAsync();
    if (companyId) {
        return await queryAll(
            'SELECT * FROM disciplinary_rules WHERE active = 1 AND (company_id IS NULL OR company_id = ?) ORDER BY id ASC, code ASC, title ASC',
            [companyId]
        );
    }
    return await queryAll('SELECT * FROM disciplinary_rules WHERE active = 1 ORDER BY id ASC, code ASC, title ASC');
}

async function createDisciplinaryRule(rule) {
    await ensureDisciplinaryTablesAsync();
    const id = rule.id || generateId();
    await queryRun(`
        INSERT INTO disciplinary_rules (id, code, title, category, description, company_id, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [
        id,
        rule.code || null,
        rule.title,
        rule.category || 'Geral',
        rule.description || null,
        rule.company_id || null
    ]);
    return await queryGet('SELECT * FROM disciplinary_rules WHERE id = ?', [id]);
}

async function updateDisciplinaryRule(id, updates) {
    await ensureDisciplinaryTablesAsync();
    const fields = [];
    const params = [];

    if (updates.code !== undefined) { fields.push('code = ?'); params.push(updates.code || null); }
    if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
    if (updates.category !== undefined) { fields.push('category = ?'); params.push(updates.category || 'Geral'); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description || null); }
    if (updates.company_id !== undefined) { fields.push('company_id = ?'); params.push(updates.company_id || null); }
    if (updates.active !== undefined) { fields.push('active = ?'); params.push(updates.active ? 1 : 0); }

    if (fields.length > 0) {
        params.push(id);
        await queryRun(`UPDATE disciplinary_rules SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return await queryGet('SELECT * FROM disciplinary_rules WHERE id = ?', [id]);
}

async function deleteDisciplinaryRule(id) {
    await ensureDisciplinaryTablesAsync();
    await queryRun('UPDATE disciplinary_rules SET active = 0 WHERE id = ?', [id]);
    return { success: true };
}

async function getDisciplinaryRecords(userId, companyId) {
    await ensureDisciplinaryTablesAsync();
    let query = `
        SELECT dr.*, u.name as userName
        FROM disciplinary_records dr
        LEFT JOIN users u ON dr.userId = u.id
        WHERE 1=1
    `;
    const params = [];
    if (userId) {
        query += ' AND dr.userId = ?';
        params.push(userId);
    }
    if (companyId) {
        query += ' AND dr.company_id = ?';
        params.push(companyId);
    }
    query += ' ORDER BY dr.date DESC, dr.createdAt DESC';
    return await queryAll(query, params);
}

// Builds the list of suspended dates: N consecutive days starting at startDate,
// skipping Mondays (folga fixa semanal da operação).
function buildSuspensionDates(startDate, days) {
    const dates = [];
    const total = Math.max(1, parseInt(days, 10) || 1);
    const [y, m, d] = String(startDate).split('-').map(Number);
    const cursor = new Date(y, m - 1, d);
    let guard = 0;
    while (dates.length < total && guard < 120) {
        if (cursor.getDay() !== 1) {
            dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
        }
        cursor.setDate(cursor.getDate() + 1);
        guard++;
    }
    return dates;
}

async function syncSuspensionAbsences(record) {
    const link = `SUSPENSION:${record.id}`;
    await queryRun('DELETE FROM absences WHERE justification_status = ?', [link]);
    if (record.type !== 'SUSPENSION') return [];

    const start = record.suspension_start_date || record.date;
    const dates = buildSuspensionDates(start, record.suspension_days);
    for (const date of dates) {
        // Remove any plain falta/folga already launched on that day to avoid duplicates
        await queryRun(
            "DELETE FROM absences WHERE userId = ? AND date = ? AND (justification_status IS NULL OR justification_status NOT LIKE 'SUSPENSION:%')",
            [record.userId, date]
        );
        await queryRun(`
            INSERT INTO absences (id, userId, date, description, excused, certificate_url, justification_status, company_id)
            VALUES (?, ?, ?, ?, 0, NULL, ?, ?)
        `, [generateId(), record.userId, date, 'Suspensão Disciplinar', link, record.company_id || null]);
    }
    return dates;
}

async function createDisciplinaryRecord(record) {
    await ensureDisciplinaryTablesAsync();
    const id = record.id || generateId();
    const isSuspension = record.type === 'SUSPENSION';
    await queryRun(`
        INSERT INTO disciplinary_records (
            id, userId, company_id, type, rule_id, rule_title,
            description, date, suspension_days, suspension_start_date, document_url, document_name, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id,
        record.userId,
        record.company_id || null,
        record.type,
        record.rule_id || null,
        record.rule_title,
        record.description || null,
        record.date,
        isSuspension ? (parseInt(record.suspension_days, 10) || 1) : 0,
        isSuspension ? (record.suspension_start_date || record.date) : null,
        record.document_url || null,
        record.document_name || null,
        record.created_by || null
    ]);
    const created = await queryGet('SELECT * FROM disciplinary_records WHERE id = ?', [id]);
    if (isSuspension) await syncSuspensionAbsences(created);
    return created;
}

async function updateDisciplinaryRecord(id, updates) {
    await ensureDisciplinaryTablesAsync();
    const fields = [];
    const params = [];

    if (updates.type !== undefined) { fields.push('type = ?'); params.push(updates.type); }
    if (updates.rule_id !== undefined) { fields.push('rule_id = ?'); params.push(updates.rule_id); }
    if (updates.rule_title !== undefined) { fields.push('rule_title = ?'); params.push(updates.rule_title); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.date !== undefined) { fields.push('date = ?'); params.push(updates.date); }
    if (updates.suspension_days !== undefined) { fields.push('suspension_days = ?'); params.push(parseInt(updates.suspension_days, 10) || 0); }
    if (updates.suspension_start_date !== undefined) { fields.push('suspension_start_date = ?'); params.push(updates.suspension_start_date); }
    if (updates.document_url !== undefined) { fields.push('document_url = ?'); params.push(updates.document_url); }
    if (updates.document_name !== undefined) { fields.push('document_name = ?'); params.push(updates.document_name); }

    if (fields.length > 0) {
        params.push(id);
        await queryRun(`UPDATE disciplinary_records SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    const updated = await queryGet('SELECT * FROM disciplinary_records WHERE id = ?', [id]);
    const affectsTimesheet = ['type', 'suspension_days', 'suspension_start_date', 'date'].some(k => updates[k] !== undefined);
    if (updated && affectsTimesheet) await syncSuspensionAbsences(updated);
    return updated;
}

async function deleteDisciplinaryRecord(id) {
    await ensureDisciplinaryTablesAsync();
    await queryRun('DELETE FROM absences WHERE justification_status = ?', [`SUSPENSION:${id}`]);
    await queryRun('DELETE FROM disciplinary_records WHERE id = ?', [id]);
    return { success: true };
}

export {
    db,
    pgPool,
    USE_POSTGRES,
    DB_PATH,
    generateId,

    // Companies
    getCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    getCompaniesWithSaiposToken,

    // Users
    getUsers,
    getUserById,
    getUserByEmail,
    getUserByCajaUserId,
    getUserByNfcId,
    createUser,
    updateUser,
    deleteUser,

    // Shifts
    getShifts,
    getShiftById,
    createShift,
    updateShift,
    deleteShift,
    syncShiftRevenueAndMetrics,

    // Advances
    getAdvances,
    getAdvanceById,
    createAdvance,
    deleteAdvance,

    // Absences
    getAbsences,
    getAbsenceById,
    createAbsence,
    updateAbsence,
    deleteAbsence,

    // Goals
    getGoals,
    updateGoals,

    // Training Levels & Trails
    getTrainingLevels,
    getAllTrainingLevels,
    createTrainingLevel,
    updateTrainingLevel,
    deleteTrainingLevel,

    // Training Programs
    getTrainingPrograms,
    createTrainingProgram,
    updateTrainingProgram,
    deleteTrainingProgram,

    // Training Groups
    getTrainingGroups,
    getAllTrainingGroups,
    createTrainingGroup,
    updateTrainingGroup,
    deleteTrainingGroup,

    // Plata Transactions
    transferPlata,
    recordPlataUsage,
    adjustUserPlata,
    getPlataHistory,
    verifyTransaction,
    getUsersForTransfer,

    getUserByResetToken,

    // Weekly Metrics
    getWeeklyMetrics,
    listWeeklyMetrics,
    saveWeeklyMetrics,

    // PDI
    getPDIQuestions,
    createPDIQuestion,
    deletePDIQuestion,
    getPDIAnswers,
    savePDIAnswer,
    getPDIEvaluations,
    createPDIEvaluation,
    updatePDIEvaluation,
    deletePDIEvaluation,
    getPDIModels,
    createPDIModel,
    updatePDIModel,
    deletePDIModel,

    // Streaks
    getStreaksConfig,
    updateStreaksConfig,
    calculateClosingRewards,
    applyClosingRewards,
    awardPlataForCheckin,

    // Delivery Drivers
    getDeliveryDrivers,
    createDeliveryDriver,
    deleteDeliveryDriver,
    createDriverCheckin,
    getDriverCheckins,
    getDriverConfigs,
    updateDriverConfigs,
    createDriverPayment,
    getDriverPayments,
    getDriverBalance,
    getDriverMovements,
    cancelDriverCheckin,
    deleteDriverCheckin,
    getDriverScales,
    createDriverScale,
    deleteDriverScale,
    cancelDriverPayment,
    getDriverBonusEligibilityStats,

    // User Check-ins
    getUserCheckin,
    getCompanyCheckinsByDate,
    getUnfinishedCheckins,
    getUserCheckinsForMonth,
    createUserCheckin,
    updateUserCheckin,
    deleteUserCheckin,
    getShiftByTypeAndDate,

    // Store
    getStoreItems,
    createStoreItem,
    updateStoreItem,
    purchaseStoreItem,
    getStorePurchases,
    updatePurchaseStatus,

    // Disciplinary Rules & Records (Regimento Interno / Medidas Disciplinares)
    getDisciplinaryRules,
    createDisciplinaryRule,
    updateDisciplinaryRule,
    deleteDisciplinaryRule,
    ensureDefaultDisciplinaryRulesAsync,
    getDisciplinaryRecords,
    createDisciplinaryRecord,
    updateDisciplinaryRecord,
    deleteDisciplinaryRecord,

    // Admin / Maintenance
    recoverNightShiftsByDates,
    checkpointDatabaseForBackup
};

