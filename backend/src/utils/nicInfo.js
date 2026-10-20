// What a Sri Lankan NIC number tells us: birth date and gender.
// Old NIC: 9 digits + V/X (YY DDD ####C). New NIC: 12 digits (YYYY DDD ####C).
// DDD is the day of the year; for women 500 is added. The NIC counts February as always having 29 days.
const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

function parseNic(value) {
  const nic = String(value || '').trim().toUpperCase();
  let year;
  let dayCode;
  if (/^\d{9}[VX]$/.test(nic)) {
    year = 1900 + Number(nic.slice(0, 2));
    dayCode = Number(nic.slice(2, 5));
  } else if (/^\d{12}$/.test(nic)) {
    year = Number(nic.slice(0, 4));
    dayCode = Number(nic.slice(4, 7));
  } else {
    return { valid: false };
  }

  const female = dayCode > 500;
  let day = female ? dayCode - 500 : dayCode;
  if (day < 1 || day > 366) return { valid: false };
  if (!isLeap(year)) {
    if (day === 60) return { valid: false }; // 29 February does not exist that year
    if (day > 60) day -= 1;
  }
  const date = new Date(Date.UTC(year, 0, day));
  if (date.getUTCFullYear() !== year || date.getTime() > Date.now() || year < 1900) return { valid: false };

  return { valid: true, gender: female ? 'female' : 'male', birthDate: date.toISOString().slice(0, 10) };
}

module.exports = { parseNic };
