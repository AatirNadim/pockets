const CHUNK_SIZE = 30 * 1024; // 30 KB chunk size

const MAX_CHANNELS_FOR_DATA_TRANSMISSION = 5;

const MAX_FILE_SIZE_SINGLE_SEND = 50; // in MB
const MAX_FILE_SIZE_MB_MULTIPLE_SEND = 6;
const MAX_FILES_TO_SEND_TOGETHER = 5;
const MAX_QUEUED_FILES = 10;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_CHAT_HISTORY = 500;

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
  REMOTE = "remote",
}

export {
  CHUNK_SIZE,
  MAX_CHANNELS_FOR_DATA_TRANSMISSION,
  MAX_FILE_SIZE_SINGLE_SEND,
  MAX_FILE_SIZE_MB_MULTIPLE_SEND,
  MAX_FILES_TO_SEND_TOGETHER,
  MAX_QUEUED_FILES,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_HISTORY,
  STUN_SERVERS_LIST,
  serverPath,
  UserType,
  AttachmentState,
  
};
