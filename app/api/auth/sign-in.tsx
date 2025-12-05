"use server";
import { AuthSystemFields } from "../api_types";
import { pocketbase } from "../pocketbase";
import { cookies } from "next/headers";

export const getUser = async () => {
  return pocketbase().authStore.model as Promise<AuthSystemFields>;
};

export const isLoggedIn = async () => {
  return pocketbase().authStore.isValid as unknown as Promise<boolean>;
};

export const logOut = async () => {
  pocketbase().authStore.clear();
  cookies().delete("pb_auth");
};

export const signIn = async (email: string, password: string) => {
  try {
    const pb = pocketbase();
    const authData = await pb
      .collection("users")
      .authWithPassword(email, password);

    cookies().set("pb_auth", pb.authStore.exportToCookie());
    return authData;
  } catch (error) {
    console.log("ошибка" + error);
    return null;
  }
};
