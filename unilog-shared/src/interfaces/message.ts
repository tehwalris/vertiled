import { State } from "..";
import { Action } from "./action";

export interface LogEntry {
  id: number;
  action: Action;
}

export enum MessageType {
  LogEntryServer = "LogEntryServer",
  RemapEntryServer = "RemapEntryServer",
  RejectEntryServer = "RejectEntryServer",
  InitialServer = "InitialServer",
  SubmitEntryClient = "SubmitEntryClient",
}

export type ServerMessage =
  | InitialServerMessage
  | LogEntryServerMessage
  | RemapEntryServerMessage
  | RejectEntryServerMessage;

export interface InitialServerMessage {
  type: MessageType.InitialServer;
  initialState: State;
}

export interface LogEntryServerMessage {
  type: MessageType.LogEntryServer;
  entry: LogEntry;
}

export interface RemapEntryServerMessage {
  type: MessageType.RemapEntryServer;
  oldId: number;
  entry: LogEntry;
}

export interface RejectEntryServerMessage {
  type: MessageType.RejectEntryServer;
  entryId: number;
  error: string;
}

export type ClientMessage = SubmitEntryClientMessage;

export interface SubmitEntryClientMessage {
  type: MessageType.SubmitEntryClient;
  entry: LogEntry;
}
