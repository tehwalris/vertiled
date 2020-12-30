import { useEffect, useRef } from "react";

const RECONNECT_DELAY_MS = 1000;

type MessageHandler = (this: WebSocket, ev: MessageEvent) => any;

export function useWebSocket(
  [socketArgUrl, socketArgProtocol]: [string, (string | string[])?],
  onMessage: MessageHandler,
) {
  const wsRef = useRef<WebSocket>();

  const onMessageRef = useRef<MessageHandler>(() => onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    function connectWebSocket() {
      const ws = new WebSocket(socketArgUrl, socketArgProtocol);
      wsRef.current = ws;
      ws.onmessage = (ev: MessageEvent) => {
        onMessageRef.current.call(ws, ev);
      };
      return ws;
    }

    let destroyed = false;

    async function retryLoop() {
      let firstIteration = true;
      while (!destroyed) {
        if (!firstIteration) {
          console.log(
            `reconnecting in ${Math.round(RECONNECT_DELAY_MS / 1000)}s`,
          );
          await new Promise((resolve) => {
            setTimeout(() => resolve(undefined), RECONNECT_DELAY_MS);
          });
          console.log("reconnecting");
        }
        firstIteration = false;

        try {
          wsRef.current = connectWebSocket();
        } catch (err) {
          console.warn("error while creating socket", err);
          continue;
        }

        wsRef.current.onopen = function () {
          console.log("connected");
        };

        let resolveLoopBlocker: (v: undefined) => void;
        const loopBlocker = new Promise((resolve) => {
          resolveLoopBlocker = resolve;
        });

        wsRef.current.onclose = function (ev: CloseEvent): void {
          console.warn("socket disconnected", ev);
          wsRef.current = undefined;
          resolveLoopBlocker(undefined);
        };

        await loopBlocker;
      }
    }

    retryLoop();

    return () => {
      destroyed = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = undefined;
    };
  }, [socketArgUrl, socketArgProtocol]);

  return wsRef;
}
