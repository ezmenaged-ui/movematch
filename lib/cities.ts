import { CITIES } from './validate';

/**
 * English names for the city list (lib/validate.ts → CITIES), as Israelis usually write them in English.
 * The English site suggests these names; every city is saved in Hebrew (toHeCity), so routing by area,
 * movers and /admin keep working. `alt` = other common spellings, matched too.
 */
const EN: Record<string, { en: string; alt?: string[] }> = {
  'ירושלים': { en: 'Jerusalem' },
  'תל אביב-יפו': { en: 'Tel Aviv-Yafo', alt: ['Tel Aviv', 'Tel-Aviv', 'Tel Aviv Yafo', 'Tel Aviv-Jaffa', 'Jaffa', 'Yafo', 'TLV', 'TA'] },
  'חיפה': { en: 'Haifa' },
  'ראשון לציון': { en: 'Rishon LeZion', alt: ['Rishon Lezion', 'Rishon Le Zion', 'Rishon'] },
  'פתח תקווה': { en: 'Petah Tikva', alt: ['Petach Tikva', 'Petah Tiqva', 'Petach Tikvah', 'Petah Tikvah'] },
  'אשדוד': { en: 'Ashdod' },
  'נתניה': { en: 'Netanya' },
  'באר שבע': { en: "Be'er Sheva", alt: ['Beer Sheva', 'Beersheba', 'Beer-Sheva', 'Beersheva'] },
  'בני ברק': { en: 'Bnei Brak', alt: ['Bnei-Brak'] },
  'חולון': { en: 'Holon' },
  'רמת גן': { en: 'Ramat Gan', alt: ['Ramat-Gan'] },
  'אשקלון': { en: 'Ashkelon' },
  'רחובות': { en: 'Rehovot', alt: ['Rechovot'] },
  'בת ים': { en: 'Bat Yam', alt: ['Bat-Yam'] },
  'בית שמש': { en: 'Beit Shemesh', alt: ['Bet Shemesh', 'Beit-Shemesh'] },
  'כפר סבא': { en: 'Kfar Saba', alt: ['Kfar-Saba'] },
  'הרצליה': { en: 'Herzliya', alt: ['Herzliyya', 'Herzlia'] },
  'חדרה': { en: 'Hadera' },
  'מודיעין-מכבים-רעות': { en: "Modi'in-Maccabim-Re'ut", alt: ["Modi'in", 'Modiin', 'Modiin Maccabim Reut', 'Modiin-Maccabim-Reut'] },
  'נצרת': { en: 'Nazareth' },
  'רמלה': { en: 'Ramla' },
  'לוד': { en: 'Lod' },
  'רעננה': { en: "Ra'anana", alt: ['Raanana'] },
  'מודיעין עילית': { en: "Modi'in Illit", alt: ['Modiin Illit', 'Modiin Ilit'] },
  'רהט': { en: 'Rahat' },
  'הוד השרון': { en: 'Hod HaSharon', alt: ['Hod Hasharon'] },
  'גבעתיים': { en: 'Givatayim', alt: ["Giv'atayim"] },
  'קריית אתא': { en: 'Kiryat Ata', alt: ['Qiryat Ata'] },
  'נהריה': { en: 'Nahariya', alt: ['Naharia'] },
  'בית"ר עילית': { en: 'Beitar Illit', alt: ['Betar Illit', 'Beitar Ilit'] },
  'אום אל-פחם': { en: 'Umm al-Fahm', alt: ['Umm el-Fahm', 'Um al Fahm'] },
  'קריית גת': { en: 'Kiryat Gat' },
  'אילת': { en: 'Eilat', alt: ['Elat'] },
  'ראש העין': { en: "Rosh HaAyin", alt: ['Rosh Haayin', "Rosh Ha'Ayin"] },
  'עפולה': { en: 'Afula' },
  'נס ציונה': { en: 'Ness Ziona', alt: ['Nes Ziona', 'Nes Tziona'] },
  'עכו': { en: 'Akko', alt: ['Acre', 'Acco'] },
  'אלעד': { en: "El'ad", alt: ['Elad'] },
  'רמת השרון': { en: 'Ramat HaSharon', alt: ['Ramat Hasharon'] },
  'כרמיאל': { en: 'Karmiel', alt: ["Karmi'el", 'Carmiel'] },
  'יבנה': { en: 'Yavne', alt: ['Yavneh'] },
  'טבריה': { en: 'Tiberias', alt: ['Tveria'] },
  'טייבה': { en: 'Tayibe', alt: ['Taibe', 'Tayibeh'] },
  'קריית מוצקין': { en: 'Kiryat Motzkin' },
  'שפרעם': { en: "Shefa-'Amr", alt: ['Shefaamr', 'Shfaram'] },
  'נוף הגליל': { en: 'Nof HaGalil', alt: ['Nof Hagalil', 'Nazareth Illit'] },
  'קריית ים': { en: 'Kiryat Yam' },
  'קריית ביאליק': { en: 'Kiryat Bialik' },
  'קריית אונו': { en: 'Kiryat Ono' },
  'מעלה אדומים': { en: "Ma'ale Adumim", alt: ['Maale Adumim', "Ma'aleh Adumim"] },
  'אור יהודה': { en: 'Or Yehuda' },
  'צפת': { en: 'Safed', alt: ['Tzfat', 'Zefat', 'Tsfat'] },
  'נתיבות': { en: 'Netivot' },
  'דימונה': { en: 'Dimona' },
  'טירה': { en: 'Tira' },
  "סח'נין": { en: 'Sakhnin' },
  'יהוד-מונוסון': { en: 'Yehud-Monosson', alt: ['Yehud', 'Yehud Monosson'] },
  'באקה אל-גרביה': { en: 'Baqa al-Gharbiyye', alt: ['Baka al-Gharbiya', 'Baqa al Gharbiyye'] },
  'אופקים': { en: 'Ofakim' },
  'גבעת שמואל': { en: "Giv'at Shmuel", alt: ['Givat Shmuel'] },
  'טירת כרמל': { en: 'Tirat Carmel', alt: ['Tirat HaCarmel'] },
  'אריאל': { en: 'Ariel' },
  'שדרות': { en: 'Sderot' },
  'קריית שמונה': { en: 'Kiryat Shmona' },
  'מגדל העמק': { en: "Migdal HaEmek", alt: ['Migdal Haemek'] },
  'יקנעם עילית': { en: "Yokne'am Illit", alt: ['Yokneam', 'Yokneam Illit'] },
  'כפר יונה': { en: 'Kfar Yona' },
  'קריית מלאכי': { en: 'Kiryat Malakhi', alt: ['Kiryat Malachi'] },
  'אור עקיבא': { en: 'Or Akiva' },
  'זכרון יעקב': { en: "Zikhron Ya'akov", alt: ['Zichron Yaakov', 'Zikhron Yaakov', "Zichron Ya'akov"] },
  'גן יבנה': { en: 'Gan Yavne' },
  'גדרה': { en: 'Gedera' },
  'מבשרת ציון': { en: 'Mevaseret Zion', alt: ['Mevaseret Tzion', 'Mevaseret'] },
  'אבן יהודה': { en: 'Even Yehuda' },
  'שוהם': { en: 'Shoham' },
  'קדימה-צורן': { en: 'Kadima-Zoran', alt: ['Kadima', 'Kadima Zoran'] },
  'פרדס חנה-כרכור': { en: 'Pardes Hanna-Karkur', alt: ['Pardes Hanna', 'Pardes Hana', 'Karkur'] },
  'כוכב יאיר-צור יגאל': { en: "Kokhav Ya'ir-Tzur Yigal", alt: ['Kochav Yair', 'Kokhav Yair', 'Tzur Yigal'] },
  'גני תקווה': { en: 'Ganei Tikva', alt: ['Ganei Tikvah'] },
  'ערד': { en: 'Arad' },
};

const key = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`"\-.]/g, ' ').replace(/\s+/g, ' ').trim();
const TO_HE = new Map<string, string>();
for (const [h, v] of Object.entries(EN)) for (const n of [v.en, ...(v.alt || [])]) TO_HE.set(key(n), h);

/** The city list in English, in the same order as CITIES. */
export const CITIES_EN: string[] = CITIES.map((c) => EN[c]?.en || c);

/** An English (or Hebrew) city name → the Hebrew name we save. Anything not recognised is returned as typed. */
export function toHeCity(s: string | null | undefined): string {
  const v = (s || '').trim();
  if (!v || /[֐-׿]/.test(v)) return v;
  return TO_HE.get(key(v)) || v;
}

/** A saved (Hebrew) city name → English, for the English pages. Unknown names are returned as saved. */
export const cityEn = (he: string | null | undefined) => (he ? EN[he]?.en || he : '');
