import { cookies } from 'next/headers';
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './api_types';

export async function pocketbase() {
  const pb = new PocketBase(process.env.PB_TYPEGEN_URL) as TypedPocketBase;
  pb.autoCancellation(false);

  const cookieStore = await cookies();
  const cookie = cookieStore.get('pb_auth');
  if (cookie) {
    pb.authStore.loadFromCookie(`${cookie.value}`);
  }

  return pb;
}
