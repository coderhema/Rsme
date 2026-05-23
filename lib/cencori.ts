import { Cencori } from 'cencori';

export const cencoriClient = new Cencori({
  apiKey: process.env.CENCORI_API_KEY!,
});
