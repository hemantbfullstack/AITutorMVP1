import { useCallback } from "react";

// Chat bridge payload types for sending different kinds of messages to chat
export type ChatBridgePayload =
  | { kind: "graph"; expression: string; range: [number, number] }
  | { kind: "text"; text: string }
  | { kind: "image"; text: string; imageBase64: string };

export function useChat() {
  // Simple sendToChat function that emits events for the ChatArea to handle
  const sendToChat = useCallback((message: string) => {
    // Emit a custom event that ChatArea listens to
    window.dispatchEvent(new CustomEvent("app:sendToChat", { 
      detail: { kind: "text", text: message } as ChatBridgePayload 
    }));
  }, []);

  // For backward compatibility with the existing ChatBridgePayload system
  const sendToChatWithPayload = useCallback((payload: ChatBridgePayload) => {
    window.dispatchEvent(new CustomEvent("app:sendToChat", { detail: payload }));
  }, []);

  return {
    sendToChat,
    sendToChatWithPayload
  };
}