export type Task = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
};

export type DocItem = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
};

export type Student = {
  id: string;
  name: string;
  absen: string;
  nisn: string;
  /** map of ISO date (yyyy-mm-dd) -> paid boolean */
  payments: Record<string, boolean>;
};

export const KAS_DAILY_AMOUNT = 2000;
export const KAS_START = "2026-05-01"; // mulai Mei
export const KAS_END = "2028-12-31"; // sampai akhir 2028
