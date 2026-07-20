import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react";

interface EmbedContextValue {
  postMessage: (type: string, data?: Record<string, unknown>) => void;
}

const EmbedContext = createContext<EmbedContextValue>({
  postMessage: () => {},
});

export function useEmbed() {
  return useContext(EmbedContext);
}

export function EmbedProvider({ children }: { children: ReactNode }) {
  const postMessage = useCallback((type: string, data?: Record<string, unknown>) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type, ...data },
        "*",
      );
    }
  }, []);

  useEffect(() => {
    postMessage("EFINSIGN_READY");
  }, [postMessage]);

  return (
    <EmbedContext.Provider value={{ postMessage }}>
      {children}
    </EmbedContext.Provider>
  );
}
