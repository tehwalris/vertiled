import { useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import {
  LogEntry,
  initialState,
  Action,
  ClientMessage,
  MessageType,
  reducer,
  ServerMessage,
  State,
  unreachable,
} from "unilog-shared";
import { useWebSocket } from "./use-web-socket";
import * as R from "ramda";

export function useUnilog(wsServerURL: string) {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const removedLocalEntryIds = useRef(new Set<number>());
  const nextLocalId = useRef<number>(-1);

  const [serverState, setServerState] = useState(initialState);

  const [userId, setUserId] = useState<string>();

  function addToRemoteLog(entry: LogEntry) {
    setRemoteLog((old) => {
      if (old.length && old[old.length - 1].id >= entry.id) {
        console.error("got message that is older than the newest existing one");
        // HACK The server was probably restarted, so reload that everyone is in sync.
        window.location.reload();
      }
      return [...old, entry];
    });
  }

  function addToLocalLog(entry: LogEntry) {
    setLocalLog((old) => {
      if (removedLocalEntryIds.current.has(entry.id)) {
        removedLocalEntryIds.current.delete(entry.id);
        return old;
      } else {
        return [...old, entry];
      }
    });
  }

  function removeFromLocalLog(entryId: number) {
    removedLocalEntryIds.current.add(entryId);
    setLocalLog((oldLog) => {
      const newLog = oldLog.filter((e) => e.id !== entryId);
      if (newLog.length === oldLog.length) {
        // The entry has not been deleted. This is probably because the we received the confirmation/rejection from the server before the React state updates.
        // Record this fact so that addToLocalLog does save this entry, otherwise it will stay in the local log forever.
        // This was done using removedLocalEntryIds.current.add(...) above.
      } else {
        removedLocalEntryIds.current.delete(entryId);
      }
      return newLog;
    });
  }

  const wsRef = useWebSocket([wsServerURL], (_msg) => {
    const msg = JSON.parse(_msg.data) as ServerMessage;
    switch (msg.type) {
      case MessageType.InitialServer: {
        setUserId(msg.userId);
        setServerState(msg.initialState);
        break;
      }
      case MessageType.LogEntryServer: {
        addToRemoteLog(msg.entry);
        break;
      }
      case MessageType.RemapEntryServer: {
        unstable_batchedUpdates(() => {
          removeFromLocalLog(msg.oldId);
          addToRemoteLog(msg.entry);
        });
        break;
      }
      case MessageType.RejectEntryServer: {
        const entry = localLog.find((e) => e.id === msg.entryId);
        removeFromLocalLog(msg.entryId);
        console.warn(
          "action rejected by server",
          entry && entry.action,
          msg.error,
        );
        break;
      }
      default:
        unreachable(msg);
    }
  });

  const runAction = (makeAction: (userId: string) => Action) => {
    if (!wsRef.current || !userId) {
      return;
    }
    const localEntry = { id: nextLocalId.current, action: makeAction(userId) };
    nextLocalId.current--;

    const msg: ClientMessage = {
      type: MessageType.SubmitEntryClient,
      entry: localEntry,
    };
    wsRef.current.send(JSON.stringify(msg));
    addToLocalLog(localEntry);
  };

  const cachedRemoteStateRef = useRef<{
    lastEntryId: number;
    reducedState: State;
  }>();
  const state = useMemo(() => {
    function reduceLog(intialState: State, log: LogEntry[]) {
      return log.reduce((a, c, i) => {
        try {
          return reducer(a, c.action);
        } catch (err) {
          console.warn(
            "ignoring action (rejected by local reducer)",
            a,
            i,
            err,
          );
          return a;
        }
      }, intialState);
    }

    const reducedStateWithRemoteLog =
      cachedRemoteStateRef.current &&
      cachedRemoteStateRef.current?.lastEntryId === R.last(remoteLog)?.id
        ? cachedRemoteStateRef.current.reducedState
        : reduceLog(serverState, remoteLog);

    if (remoteLog.length) {
      cachedRemoteStateRef.current = {
        lastEntryId: R.last(remoteLog)!.id,
        reducedState: reducedStateWithRemoteLog,
      };
    }

    return reduceLog(reducedStateWithRemoteLog, localLog);
  }, [serverState, remoteLog, localLog]);

  return [state, userId, runAction] as const;
}
