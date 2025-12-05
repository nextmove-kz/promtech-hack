import PocketBase from "pocketbase";
import { TypedPocketBase } from "./api_types";

const clientPocketBase = new PocketBase(
  "https://hack-aton.pockethost.io"
) as TypedPocketBase;

clientPocketBase.autoCancellation(false);
export default clientPocketBase;
