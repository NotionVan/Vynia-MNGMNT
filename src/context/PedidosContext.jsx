import { createContext, useContext } from "react";

const PedidosContext = createContext(null);

export function PedidosProvider({ value, children }) {
  return <PedidosContext.Provider value={value}>{children}</PedidosContext.Provider>;
}

export function usePedidosCtx() {
  const ctx = useContext(PedidosContext);
  if (!ctx) throw new Error("usePedidosCtx must be used within PedidosProvider");
  return ctx;
}
