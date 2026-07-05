export const BRANCH_TIME_ZONE = "Asia/Bangkok";
export const BRANCH_TIME_ZONE_OFFSET = "+07:00";

export function combineBranchDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00${BRANCH_TIME_ZONE_OFFSET}`);
}

export function getBranchTimeMinutes(time: Date) {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

export function formatBranchTime(time: Date) {
  const hours = String(time.getUTCHours()).padStart(2, "0");
  const minutes = String(time.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function getBranchDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRANCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function getBranchDateTimeMinutes(date: Date) {
  const parts = getBranchDateParts(date);

  return parts.hour * 60 + parts.minute;
}

export function isSameBranchDate(startAt: Date, endAt: Date) {
  const start = getBranchDateParts(startAt);
  const end = getBranchDateParts(endAt);

  return start.year === end.year && start.month === end.month && start.day === end.day;
}

export function buildHourlyTimeOptions(openingTime: Date, closingTime: Date) {
  const opening = getBranchTimeMinutes(openingTime);
  const closing = getBranchTimeMinutes(closingTime);
  const options: string[] = [];

  for (let minutes = opening; minutes <= closing; minutes += 60) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    options.push(`${hours}:${mins}`);
  }

  return options;
}
