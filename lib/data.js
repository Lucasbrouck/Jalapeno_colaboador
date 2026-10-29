
export const SHIFT_TYPES = {
  DAY: { id: 'DAY', label: 'Turno Dia', maxPercent: 0.015 },
  NIGHT: { id: 'NIGHT', label: 'Turno Noite', maxPercent: 0.008 },
};

// Global Data Store to avoid reset on hot-reload/route isolation
const globalStore = globalThis;

if (!globalStore.data) {
  globalStore.data = {
    users: [
      { id: 'u1', name: 'João Silva', role: 'worker', email: 'joao@jalapeno.com', password: '123', plataBalance: 0 },
      { id: 'u2', name: 'Maria Souza', role: 'worker', email: 'maria@jalapeno.com', password: '123', plataBalance: 0 },
      { id: 'u3', name: 'Administrador', role: 'admin', email: 'admin@jalapeno.com', password: '123', plataBalance: 0 },
    ],
    shifts: [],
    advances: [],
    absences: [],
    goalConfig: {
      REVENUE: { id: 'REVENUE', label: 'Fat. Mensal', goal: 150000, superGoal: 167000, type: 'asc', scope: 'MONTHLY', hiddenInShiftForm: true },
      CMV: { id: 'CMV', label: 'CMV (%)', goal: 34.0, superGoal: 31.0, type: 'desc' },
      RATING: { id: 'RATING', label: 'Avaliação', goal: 4.7, superGoal: 4.8, type: 'asc' },
      OPS: { id: 'OPS', label: 'Nota Operacional', goal: 8.0, superGoal: 9.0, type: 'asc' },
    }
  };
}

const { users, shifts, advances, absences, goalConfig } = globalStore.data;



export const USERS = users;

// -- Accessors --
export function getShifts() { return globalStore.data.shifts; }
export function getGoalConfig() { return globalStore.data.goalConfig; }
export function getUsers() { return globalStore.data.users; }
export function getAdvances() { return globalStore.data.advances; }
export function getAbsences() { return globalStore.data.absences; }

export function addUser(user) {
  const newUser = { ...user, id: Math.random().toString(36).substr(2, 9), plataBalance: 0 };
  globalStore.data.users.push(newUser);
  return newUser;
}

export function addAdvance(advance) {
  const newAdvance = { ...advance, id: Math.random().toString(36).substr(2, 9), date: advance.date || new Date().toISOString() };
  globalStore.data.advances.push(newAdvance);
  return newAdvance;
}

export function removeAdvance(id) {
  globalStore.data.advances = globalStore.data.advances.filter(a => a.id !== id);
  return true;
}

export function addAbsence(absence) {
  const newAbsence = {
    ...absence,
    id: Math.random().toString(36).substr(2, 9),
    date: absence.date || new Date().toISOString()
  };
  globalStore.data.absences.push(newAbsence);
  return newAbsence;
}

export function removeAbsence(id) {
  globalStore.data.absences = globalStore.data.absences.filter(a => a.id !== id);
  return true;
}

export function updateUser(id, data) {
  const idx = globalStore.data.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    globalStore.data.users[idx] = { ...globalStore.data.users[idx], ...data };
    return globalStore.data.users[idx];
  }
  return null;
}

export function deleteUser(id) {
  globalStore.data.users = globalStore.data.users.filter(u => u.id !== id);
  return true;
}

export function updatePlataBalance(userId, amount, type) {
  const user = globalStore.data.users.find(u => u.id === userId);
  if (user) {
    if (type === 'CREDIT') user.plataBalance = (user.plataBalance || 0) + amount;
    else if (type === 'DEBIT') user.plataBalance = Math.max(0, (user.plataBalance || 0) - amount);
    return user;
  }
  return null;
}


export function updateGoalConfig(newConfig) {
  globalStore.data.goalConfig = { ...globalStore.data.goalConfig, ...newConfig };
  return globalStore.data.goalConfig;
}

export function addShift(newShift) {
  globalStore.data.shifts.push({ ...newShift, id: Math.random().toString(36).substr(2, 9) });
}

export function updateShift(updatedShift) {
  const index = globalStore.data.shifts.findIndex(s => s.id === updatedShift.id);
  if (index !== -1) {
    globalStore.data.shifts[index] = updatedShift;
    return true;
  }
  return false;
}

export function getMetricMultiplier(config, value) {
  const val = parseFloat(value);
  if (isNaN(val)) return 0;
  if (config.type === 'asc') {
    if (val >= config.superGoal) return 1.0;
    if (val >= config.goal) return 0.8;
    return 0.0;
  } else {
    if (val <= config.superGoal) return 1.0;
    if (val <= config.goal) return 0.8;
    return 0.0;
  }
}

export function getMonthlyStats() {
  const totalRevenue = globalStore.data.shifts.reduce((acc, s) => acc + (parseFloat(s.revenue) || 0), 0);
  const revMult = getMetricMultiplier(globalStore.data.goalConfig.REVENUE, totalRevenue);
  return { totalRevenue, revMult };
}

export function calculateShiftReward(shift, monthlyContext = null) {
  const config = SHIFT_TYPES[shift.type];
  if (!config) return { pot: 0, perWorker: 0 };

  const maxPot = shift.revenue * config.maxPercent;

  // Rule: Assume 0.8 (Base Goal) is hit for Revenue if actual is lower.
  // If actual is 1.0 (Super), use 1.0.
  let revMult = 0.8;
  if (monthlyContext && monthlyContext.revMult >= 1.0) {
    revMult = 1.0;
  }

  const multipliers = {
    REVENUE: revMult,
    CMV: getMetricMultiplier(globalStore.data.goalConfig.CMV, shift.metrics.CMV),
    RATING: getMetricMultiplier(globalStore.data.goalConfig.RATING, shift.metrics.RATING),
    OPS: getMetricMultiplier(globalStore.data.goalConfig.OPS, shift.metrics.OPS),
  };

  // ... rest of calculation ...
  const totalMultiplier = multipliers.REVENUE * multipliers.CMV * multipliers.RATING * multipliers.OPS;
  const actualPot = maxPot * totalMultiplier;

  let totalShares = 0;
  shift.workers.forEach(w => {
    if (w.status === 'LATE') totalShares += 0.5;
    else totalShares += 1.0;
  });

  const valuePerShare = totalShares > 0 ? actualPot / totalShares : 0;

  return {
    maxPot,
    actualPot,
    multipliers,
    totalShares,
    valuePerShare,
  };
}

export function getUserRewards(userId) {
  const monthlyStats = getMonthlyStats();
  const userShifts = globalStore.data.shifts.filter(s => s.workers.find(w => w.id === userId));

  let total = 0;
  const history = userShifts.map(s => {
    const calculation = calculateShiftReward(s, monthlyStats);
    const workerRecord = s.workers.find(w => w.id === userId);

    const userShare = workerRecord.status === 'LATE' ? 0.5 : 1.0;
    const myReward = calculation.valuePerShare * userShare;

    total += myReward;
    return {
      ...s,
      reward: myReward,
      isLate: workerRecord.status === 'LATE',
      calculation
    };
  });

  return { total, history, monthlyStats };
}
