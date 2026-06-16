/** Live radio streams — القرآن ونجوم FM فقط */
export const RADIO_STATIONS = [
  {
    id: "quran",
    name: "إذاعة القرآن الكريم 🕋",
    frequency: "مباشر",
    url: "https://backup.qurango.net/radio/tarateel",
    urls: [
      "https://backup.qurango.net/radio/tarateel",
      "https://Qurango.net/radio/tarateel",
    ],
  },
  {
    id: "nogoum",
    name: "نجوم FM 📻",
    frequency: "100.6 FM",
    url: "https://audio.nrpstream.com/listen/nogoumfm/radio.mp3",
    urls: [
      "https://audio.nrpstream.com/listen/nogoumfm/radio.mp3",
    ],
  },
] as const;

export type RadioStation = (typeof RADIO_STATIONS)[number];

export function getRadioStreamUrls(station: RadioStation): string[] {
  const urls = "urls" in station && Array.isArray(station.urls) ? station.urls : [];
  return [station.url, ...urls.filter((item) => item !== station.url)];
}

export const DJ_LISTEN_STORAGE_KEY = "lamma_dj_listen";

export function readDjListenPreference(): boolean {
  try {
    return localStorage.getItem(DJ_LISTEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeDjListenPreference(listening: boolean) {
  try {
    localStorage.setItem(DJ_LISTEN_STORAGE_KEY, String(listening));
  } catch {
    // ignore quota errors
  }
}
