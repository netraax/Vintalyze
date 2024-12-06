// dateUtils.js

// Fonction pour obtenir l'intervalle de dates
export const getDateRange = (dates) => {
  if (dates.length === 0) return { start: new Date(), end: new Date() };
  const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));
  return {
    start: new Date(sortedDates[0]),
    end: new Date(sortedDates[sortedDates.length - 1])
  };
};

// Fonction pour générer la période adaptative
export const generateDatePeriod = (startDate, endDate) => {
  const dates = {};
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const monthKey = current.toISOString().slice(0, 7);
    dates[monthKey] = 0;
    current.setMonth(current.getMonth() + 1);
  }

  return dates;
};

// Fonction pour convertir les dates relatives en dates absolues
export const convertRelativeDateToAbsolute = (relativeDate) => {
  const now = new Date();
  const parts = relativeDate.toLowerCase().match(/(\d+)\s+(minute|heure|jour|semaine|mois|an|années|ans)/);
  
  if (!parts) return null;
  
  const amount = parseInt(parts[1]);
  const unit = parts[2];
  
  let date = new Date(now);
  
  switch (unit) {
    case 'minute':
      date.setMinutes(date.getMinutes() - amount);
      break;
    case 'heure':
      date.setHours(date.getHours() - amount);
      break;
    case 'jour':
      date.setDate(date.getDate() - amount);
      break;
    case 'semaine':
      date.setDate(date.getDate() - (amount * 7));
      break;
    case 'mois':
      date.setMonth(date.getMonth() - amount);
      break;
    case 'an':
    case 'ans':
    case 'années':
      date.setFullYear(date.getFullYear() - amount);
      break;
  }
  
  return date;
};
