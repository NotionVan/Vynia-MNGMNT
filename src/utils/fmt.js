// ─── DATE HELPERS ───
export const fmt = {
  date: (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  },
  time: (iso) => {
    if (!iso || !iso.includes("T")) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },
  dateShort: (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  },
  localISO: (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
  isToday: (iso) => {
    if (!iso) return false;
    return iso.startsWith(fmt.localISO());
  },
  isTomorrow: (iso) => {
    if (!iso) return false;
    const t = new Date(); t.setDate(t.getDate() + 1);
    return iso.startsWith(fmt.localISO(t));
  },
  isPast: (iso) => {
    if (!iso) return false;
    return new Date(iso) < new Date(fmt.localISO());
  },
  todayISO: () => fmt.localISO(),
  tomorrowISO: () => { const t = new Date(); t.setDate(t.getDate() + 1); return fmt.localISO(t); },
  dayAfterISO: () => { const t = new Date(); t.setDate(t.getDate() + 2); return fmt.localISO(t); },
};

export const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
