import PocketBase from "pocketbase";
import { TypedPocketBase } from "./api_types";
import { cookies } from "next/headers";

export function pocketbase() {
  const pb = new PocketBase(process.env.PB_TYPEGEN_URL) as TypedPocketBase;
  pb.autoCancellation(false);

  const cookie = cookies().get("pb_auth");
  if (cookie) {
    pb.authStore.loadFromCookie(`${cookie.value}`);
  }

  return pb;
}
