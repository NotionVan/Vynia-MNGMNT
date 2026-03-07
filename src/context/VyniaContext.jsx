import { createContext, useContext } from "react";

const VyniaContext = createContext(null);

export function VyniaProvider({ value, children }) {
  return <VyniaContext.Provider value={value}>{children}</VyniaContext.Provider>;
}

export function useVynia() {
  const ctx = useContext(VyniaContext);
  if (!ctx) throw new Error("useVynia must be used within VyniaProvider");
  return ctx;
}
