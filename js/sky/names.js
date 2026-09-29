// Indian sky names. Decision 3: Malayalam name (English letters) is the main name,
// Sanskrit name shown smaller underneath.

// 27 nakshatras, in order from 0° sidereal (Aswathi) onward, each 13°20' wide.
export const NAKSHATRAS = [
  { ml: 'Aswathi', sa: 'Ashwini' },
  { ml: 'Bharani', sa: 'Bharani' },
  { ml: 'Karthika', sa: 'Krittika' },
  { ml: 'Rohini', sa: 'Rohini' },
  { ml: 'Makayiram', sa: 'Mrigashira' },
  { ml: 'Thiruvathira', sa: 'Ardra' },
  { ml: 'Punartham', sa: 'Punarvasu' },
  { ml: 'Pooyam', sa: 'Pushya' },
  { ml: 'Ayilyam', sa: 'Ashlesha' },
  { ml: 'Makam', sa: 'Magha' },
  { ml: 'Pooram', sa: 'Purva Phalguni' },
  { ml: 'Uthram', sa: 'Uttara Phalguni' },
  { ml: 'Atham', sa: 'Hasta' },
  { ml: 'Chithira', sa: 'Chitra' },
  { ml: 'Chothi', sa: 'Swati' },
  { ml: 'Vishakham', sa: 'Vishakha' },
  { ml: 'Anizham', sa: 'Anuradha' },
  { ml: 'Thrikketta', sa: 'Jyeshtha' },
  { ml: 'Moolam', sa: 'Mula' },
  { ml: 'Pooradam', sa: 'Purva Ashadha' },
  { ml: 'Uthradam', sa: 'Uttara Ashadha' },
  { ml: 'Thiruvonam', sa: 'Shravana' },
  { ml: 'Avittam', sa: 'Dhanishta' },
  { ml: 'Chathayam', sa: 'Shatabhisha' },
  { ml: 'Pooruruttathi', sa: 'Purva Bhadrapada' },
  { ml: 'Uthrattathi', sa: 'Uttara Bhadrapada' },
  { ml: 'Revathi', sa: 'Revati' },
];

// 12 rashis from 0° sidereal. The Malayalam solar months use the same names:
// the month is named after the rashi the Sun is in.
export const RASHIS = [
  { ml: 'Medam', sa: 'Mesha' },
  { ml: 'Edavam', sa: 'Vrishabha' },
  { ml: 'Mithunam', sa: 'Mithuna' },
  { ml: 'Karkidakam', sa: 'Karka' },
  { ml: 'Chingam', sa: 'Simha' },
  { ml: 'Kanni', sa: 'Kanya' },
  { ml: 'Thulam', sa: 'Tula' },
  { ml: 'Vrischikam', sa: 'Vrischika' },
  { ml: 'Dhanu', sa: 'Dhanu' },
  { ml: 'Makaram', sa: 'Makara' },
  { ml: 'Kumbham', sa: 'Kumbha' },
  { ml: 'Meenam', sa: 'Meena' },
];

// Tithi names. Decision (29 Sep): Kerala name as the main name, Sanskrit smaller underneath.
// Kerala spellings follow Drik Panchang's Malayalam calendar. Confirmed on their pages: Trutheeya, Chathurthi,
// Panchami, Ashtami, Navami, Dasami, Ekadasi, Dwadasi, Chaturdasi, Pournami, Amavasi.
// Not seen on their pages yet (common Kerala spellings, to spot-check): Prathama, Dwitheeya, Shashti, Sapthami, Thrayodasi.
const TITHIS = [
  { ml: 'Prathama', sa: 'Pratipada' },
  { ml: 'Dwitheeya', sa: 'Dwitiya' },
  { ml: 'Trutheeya', sa: 'Tritiya' },
  { ml: 'Chathurthi', sa: 'Chaturthi' },
  { ml: 'Panchami', sa: 'Panchami' },
  { ml: 'Shashti', sa: 'Shashthi' },
  { ml: 'Sapthami', sa: 'Saptami' },
  { ml: 'Ashtami', sa: 'Ashtami' },
  { ml: 'Navami', sa: 'Navami' },
  { ml: 'Dasami', sa: 'Dashami' },
  { ml: 'Ekadasi', sa: 'Ekadashi' },
  { ml: 'Dwadasi', sa: 'Dwadashi' },
  { ml: 'Thrayodasi', sa: 'Trayodashi' },
  { ml: 'Chaturdasi', sa: 'Chaturdashi' },
];

// index 0..29 → name. 0–14 bright half (Shukla Paksha, waxing), 15–29 dark half (Krishna Paksha, waning).
export function tithiName(index) {
  const bright = index < 15;
  const n = index % 15;
  const t = n < 14 ? TITHIS[n]
    : bright ? { ml: 'Pournami', sa: 'Purnima (full moon)' } : { ml: 'Amavasi', sa: 'Amavasya (new moon)' };
  return { ...t, paksha: bright ? 'Shukla Paksha (waxing)' : 'Krishna Paksha (waning)', dayOfPaksha: n + 1 };
}
