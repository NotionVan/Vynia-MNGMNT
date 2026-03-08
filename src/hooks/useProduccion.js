import { useState, useCallback } from "react";
import { notion } from "../api.js";
import { fmt } from "../utils/fmt.js";

export default function useProduccion({ apiMode, notify }) {
  const [produccionData, setProduccionData] = useState([]);
  const [produccionFecha, setProduccionFecha] = useState(fmt.todayISO());
  const [produccionLoading, setProduccionLoading] = useState(false);

  const loadProduccion = useCallback(async (fechaParam) => {
    const f = fechaParam || produccionFecha;
    if (apiMode === "demo") {
      const demoPedidos = [
        { id: "demo-1", nombre: "Pedido María García", cliente: "María García", tel: "600123456", fecha: fmt.todayISO(), hora: "10:30", productos: "2x Cookie pistacho, 1x Brownie", importe: 8.60, estado: "En preparación", pagado: true, notas: "" },
        { id: "demo-2", nombre: "Pedido Juan López", cliente: "Juan López", tel: "612345678", fecha: fmt.todayISO(), hora: "12:00", productos: "1x Hogaza Miel, 3x Viñacaos", importe: 18.50, estado: "Sin empezar", pagado: false, notas: "Sin nueces" },
        { id: "demo-4", nombre: "Pedido Carlos", cliente: "Carlos Martín", tel: "677888999", fecha: fmt.todayISO(), hora: "09:00", productos: "4x Magdalenas, 2x Bollitos", importe: 9.60, estado: "Listo para recoger", pagado: true, notas: "" },
        { id: "demo-5", nombre: "Pedido Ana Ruiz", cliente: "Ana Ruiz", tel: "655111222", fecha: fmt.todayISO(), hora: "09:30", productos: "3x Cookie pistacho, 2x Magdalenas", importe: 11.00, estado: "Recogido", pagado: true, notas: "" },
      ];
      const filtered = demoPedidos.filter(p => (p.fecha || "").startsWith(f) && p.estado !== "No acude");
      const agg = {};
      filtered.forEach(p => {
        (p.productos || "").split(",").forEach(item => {
          const m = item.trim().match(/^(\d+)x\s+(.+)$/);
          if (!m) return;
          const qty = parseInt(m[1], 10);
          const name = m[2].trim();
          if (!agg[name]) agg[name] = { nombre: name, totalUnidades: 0, pedidos: [] };
          agg[name].totalUnidades += qty;
          agg[name].pedidos.push({ pedidoId: p.id, pedidoTitulo: p.nombre, unidades: qty, fecha: p.fecha, estado: p.estado, pagado: p.pagado, notas: p.notas, cliente: p.cliente, tel: p.tel, hora: p.hora });
        });
      });
      setProduccionData(Object.values(agg).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      return;
    }
    setProduccionLoading(true);
    try {
      const data = await notion.loadProduccion(f);
      setProduccionData(data.productos || []);
    } catch (err) {
      notify("err", "Error cargando producción: " + (err.message || "").substring(0, 100));
    } finally {
      setProduccionLoading(false);
    }
  }, [apiMode, produccionFecha, notify]);

  const invalidateProduccion = useCallback((pedidoFecha) => {
    const pedidoDate = (pedidoFecha || "").split("T")[0];
    if (!pedidoDate || pedidoDate === produccionFecha) setProduccionData([]);
  }, [produccionFecha]);

  const updatePagado = useCallback((pedidoId, newVal) => {
    setProduccionData(prev => prev.map(prod => ({
      ...prod,
      pedidos: prod.pedidos.map(ped => ped.pedidoId === pedidoId ? { ...ped, pagado: newVal } : ped),
    })));
  }, []);

  return {
    produccionData, produccionFecha, setProduccionFecha,
    produccionLoading, loadProduccion,
    invalidateProduccion, updatePagado,
  };
}
