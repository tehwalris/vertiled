import { Action } from "./action";

export interface LogEntry {
  id: number;
  action: Action;
}

export enum MessageType {
  LogEntryServer = "LogEntryServer",
}

export type ServerMessages = LogEntryServerMessage;

export interface LogEntryServerMessage {
  type: MessageType.LogEntryServer;
  entry: LogEntry;
}
