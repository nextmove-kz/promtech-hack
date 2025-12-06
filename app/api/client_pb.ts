import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './api_types';

const clientPocketBase = new PocketBase(
  'https://hack-aton.pockethost.io',
) as TypedPocketBase;

clientPocketBase.autoCancellation(false);
export default clientPocketBase;
