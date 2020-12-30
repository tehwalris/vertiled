import * as R from "ramda";
import { useCallback, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import {
  Action,
  ClientMessage,
  initialState,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  State,
  unreachable,
} from "vertiled-shared";
import { useWebSocket } from "./use-web-socket";
import { v4 as genId } from "uuid";
import { Server } from "tls";

function reduceLog(
  logBaseState: State,
  remoteLog: LogEntry[],
  localLog: LogEntry[],
  undoneUndoKeys: Set<string>,
  cachedRemoteStateRef: React.MutableRefObject<
    | {
        lastEntryId: number;
        reducedState: State;
      }
    | undefined
  >,
) {
  function _reduceLog(logBaseState: State, log: LogEntry[]) {
    return log.reduce((a, c, i) => {
      if (c.undoKey && undoneUndoKeys.has(c.undoKey)) {
        return a;
      }
      try {
        return reducer(a, c.action);
      } catch (err) {
        console.warn("ignoring action (rejected by local reducer)", a, i, err);
        return a;
      }
    }, logBaseState);
  }

  let reducedStateWithRemoteLog: State;
  if (
    cachedRemoteStateRef.current &&
    cachedRemoteStateRef.current?.lastEntryId === R.last(remoteLog)?.id
  ) {
    reducedStateWithRemoteLog = cachedRemoteStateRef.current.reducedState;
  } else {
    console.warn("using slow reduce path");
    reducedStateWithRemoteLog = _reduceLog(logBaseState, remoteLog);
  }

  if (remoteLog.length) {
    cachedRemoteStateRef.current = {
      lastEntryId: R.last(remoteLog)!.id,
      reducedState: reducedStateWithRemoteLog,
    };
  }

  return _reduceLog(reducedStateWithRemoteLog, localLog);
}

function sendToServer(ws: WebSocket, msg: ClientMessage) {
  ws.send(JSON.stringify(msg));
}

export function useUnilog(wsServerURL: string) {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const removedLocalEntryIds = useRef(new Set<number>());
  const nextLocalId = useRef<number>(-1);

  const [logBaseState, setLogBaseState] = useState(initialState);

  const undoGroupKey = useRef<string>();
  const lastUndoGroupKeys = useRef<string[]>([]);
  const undoneUndoKeys = useRef(new Set<string>());

  const [userId, setUserId] = useState<string>();

  const cachedRemoteStateRef = useRef<{
    lastEntryId: number;
    reducedState: State;
  }>();
  const [cachedFullState, setCachedFullState] = useState<State>(initialState);

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
        unstable_batchedUpdates(() => {
          setLogBaseState(msg.initialState);
          setCachedFullState(msg.initialState);
        });
        break;
      }
      case MessageType.LogEntryServer: {
        unstable_batchedUpdates(() => {
          addToRemoteLog(msg.entry);
          setCachedFullState((cachedFullState) =>
            reducer(cachedFullState, msg.entry.action),
          );
        });
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
        unstable_batchedUpdates(() => {
          removeFromLocalLog(msg.entryId);
          setCachedFullState(
            reduceLog(
              logBaseState,
              remoteLog,
              localLog,
              undoneUndoKeys.current,
              cachedRemoteStateRef,
            ),
          );
        });
        console.warn(
          "action rejected by server",
          entry && entry.action,
          msg.error,
        );
        break;
      }
      case MessageType.ReportUndoServer: {
        undoneUndoKeys.current.add(msg.undoKey);
        if (R.last(lastUndoGroupKeys.current) === msg.undoKey) {
          lastUndoGroupKeys.current = R.dropLast(1, lastUndoGroupKeys.current);
        }
        cachedRemoteStateRef.current = {
          lastEntryId: msg.finalEntryId,
          reducedState: msg.finalState,
        };

        setCachedFullState(
          reduceLog(
            logBaseState,
            remoteLog,
            localLog,
            undoneUndoKeys.current,
            cachedRemoteStateRef,
          ),
        );
        break;
      }
      default:
        unreachable(msg);
    }
  });

  const startUndoGroup = useCallback(() => {
    if (undoGroupKey.current) {
      throw new Error("startUndoGroup called while creating an undo group");
    }
    undoGroupKey.current = genId();
  }, []);

  const endUndoGroup = useCallback(() => {
    if (!undoGroupKey.current) {
      throw new Error("endUndoGroup called while not creating an undo group");
    }
    lastUndoGroupKeys.current.push(undoGroupKey.current);
    undoGroupKey.current = undefined;
  }, []);

  const tryUndo = useCallback(() => {
    if (undoGroupKey.current) {
      throw new Error("undo called while creating an undo group");
    }
    const undoKey = R.last(lastUndoGroupKeys.current);
    if (!undoKey || !wsRef.current) {
      return;
    }

    sendToServer(wsRef.current, {
      type: MessageType.RequestUndoClient,
      undoKey,
    });
  }, [wsRef]);

  const runAction = useCallback(
    (makeAction: (userId: string) => Action) => {
      if (!wsRef.current || !userId) {
        return;
      }
      const localEntry: LogEntry = {
        id: nextLocalId.current,
        undoKey: undoGroupKey.current,
        action: makeAction(userId),
      };
      nextLocalId.current--;

      sendToServer(wsRef.current, {
        type: MessageType.SubmitEntryClient,
        entry: localEntry,
      });
      unstable_batchedUpdates(() => {
        addToLocalLog(localEntry);
        setCachedFullState((cachedFullState) => {
          try {
            return reducer(cachedFullState, localEntry.action);
          } catch (err) {
            console.warn(
              "ignoring action (rejected by local reducer)",
              localEntry.action,
              err,
            );
            return cachedFullState;
          }
        });
      });
    },
    [userId, wsRef],
  );

  return {
    state: cachedFullState,
    userId,
    runAction,
    startUndoGroup,
    endUndoGroup,
    tryUndo,
  };
}
