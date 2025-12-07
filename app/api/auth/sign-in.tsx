'use server';
import { cookies } from 'next/headers';
import type { AuthSystemFields } from '../api_types';
import { pocketbase } from '../pocketbase';

export const getUser = async () => {
  const pb = await pocketbase();
  return pb.authStore.model as AuthSystemFields;
};

export const isLoggedIn = async () => {
  const pb = await pocketbase();
  return pb.authStore.isValid;
};

export const logOut = async () => {
  const pb = await pocketbase();
  pb.authStore.clear();
  const cookieStore = await cookies();
  cookieStore.delete('pb_auth');
};

export const signIn = async (email: string, password: string) => {
  try {
    const pb = await pocketbase();
    const authData = await pb
      .collection('users')
      .authWithPassword(email, password);

    const cookieStore = await cookies();
    cookieStore.set('pb_auth', pb.authStore.exportToCookie());
    return authData;
  } catch (error) {
    console.log(`ошибка${error}`);
    return null;
  }
};
