import { Action } from "./action";

export interface LogEntry {
  id: number;
  action: Action;
}

export enum MessageType {
  LogEntryServer = "LogEntryServer",
  RemapEntryServer = "RemapEntryServer",
  SubmitEntryClient = "SubmitEntryClient",
}

export type ServerMessage = LogEntryServerMessage | RemapEntryServerMessage;

export interface LogEntryServerMessage {
  type: MessageType.LogEntryServer;
  entry: LogEntry;
}

export interface RemapEntryServerMessage {
  type: MessageType.RemapEntryServer;
  oldId: number;
  entry: LogEntry;
}

export type ClientMessage = SubmitEntryClientMessage;

export interface SubmitEntryClientMessage {
  type: MessageType.SubmitEntryClient;
  entry: LogEntry;
}
