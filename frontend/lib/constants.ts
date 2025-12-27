const CHUNK_SIZE = 64 * 1024; // 64 KB chunk size

const MAX_CHANNELS_FOR_DATA_TRANSMISSION = 5;

const MAX_FILE_SIZE_SINGLE_SEND = 50; // in MB
const MAX_FILE_SIZE_MB_MULTIPLE_SEND = 6;
const MAX_FILES_TO_SEND_TOGETHER = 5;
const MAX_QUEUED_FILES = 10;

import { UserType } from "@pockets/shared";

const STUN_SERVERS_LIST = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
];

const serverPort: string = process.env.NEXT_PUBLIC_SERVER_PORT || "8080";

const serverPath =
  process.env.NEXT_PUBLIC_SERVER_PATH || `localhost:${serverPort}`;

enum AttachmentState {
  LOCAL = "local",
  READY = "ready",
  REMOTE = "remote",
}

export {
  CHUNK_SIZE,
  MAX_CHANNELS_FOR_DATA_TRANSMISSION,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
  MAX_QUEUED_FILES,
  STUN_SERVERS_LIST,
  serverPath,
  UserType,
  AttachmentState,
  
};
