// Calcula los festivos oficiales de Colombia para un año dado, incluyendo
// la Ley Emiliani (varios festivos se trasladan al lunes siguiente si no
// caen en lunes) y los que dependen de la fecha de Pascua.

function getEasterSunday(year: number): Date {
  // Algoritmo de Meeus/Jones/Butcher (calendario gregoriano).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Ley Emiliani: si el festivo no cae en lunes, se traslada al lunes
// siguiente (si ya es lunes, se queda igual).
function nextMonday(date: Date): Date {
  const day = date.getDay(); // 0 = domingo, 1 = lunes...
  const diff = (8 - day) % 7;
  return addDays(date, diff);
}

export type Holiday = { date: Date; name: string };

export function getColombianHolidays(year: number): Holiday[] {
  const easter = getEasterSunday(year);

  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: "Año Nuevo" },
    { date: nextMonday(new Date(year, 0, 6)), name: "Día de los Reyes Magos" },
    { date: nextMonday(new Date(year, 2, 19)), name: "Día de San José" },
    { date: addDays(easter, -3), name: "Jueves Santo" },
    { date: addDays(easter, -2), name: "Viernes Santo" },
    { date: new Date(year, 4, 1), name: "Día del Trabajo" },
    { date: nextMonday(addDays(easter, 39)), name: "Ascensión del Señor" },
    { date: nextMonday(addDays(easter, 60)), name: "Corpus Christi" },
    { date: nextMonday(addDays(easter, 68)), name: "Sagrado Corazón de Jesús" },
    { date: nextMonday(new Date(year, 5, 29)), name: "San Pedro y San Pablo" },
    { date: new Date(year, 6, 20), name: "Día de la Independencia" },
    { date: new Date(year, 7, 7), name: "Batalla de Boyacá" },
    { date: nextMonday(new Date(year, 7, 15)), name: "Asunción de la Virgen" },
    { date: nextMonday(new Date(year, 9, 12)), name: "Día de la Raza" },
    { date: nextMonday(new Date(year, 10, 1)), name: "Todos los Santos" },
    { date: nextMonday(new Date(year, 10, 11)), name: "Independencia de Cartagena" },
    { date: new Date(year, 11, 8), name: "Inmaculada Concepción" },
    { date: new Date(year, 11, 25), name: "Navidad" }
  ];

  return holidays;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mapa "YYYY-MM-DD" -> nombre del festivo, para varios años a la vez (útil
// porque la grilla del calendario a veces muestra días de diciembre/enero
// de años distintos al que se está viendo).
export function getHolidayMap(years: number[]): Map<string, string> {
  const map = new Map<string, string>();
  const uniqueYears = Array.from(new Set(years));
  uniqueYears.forEach((year) => {
    getColombianHolidays(year).forEach((h) => map.set(dateKey(h.date), h.name));
  });
  return map;
}
