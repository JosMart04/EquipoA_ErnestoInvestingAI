import { AppProvider, useApp } from "./lib/ctx";
import { BarraSuperior, CentroAccesibilidad, Galeria, HUDCamara, Pie } from "./components/Layout";
import { Dashboard, Leaderboard, Trading, Watchlist } from "./screens/Heredados";
import { Clasificacion } from "./screens/Clasificacion";
import { Regresion } from "./screens/Regresion";
import { Optimizador } from "./screens/Optimizador";
import { Portafolios } from "./screens/Portafolios";
import { Backtesting } from "./screens/Backtesting";

function Pantalla() {
  const { ruta } = useApp();
  switch (ruta) {
    case "dashboard": return <Dashboard />;
    case "watchlist": return <Watchlist />;
    case "trading": return <Trading />;
    case "leaderboard": return <Leaderboard />;
    case "clasificacion": return <Clasificacion />;
    case "regresion": return <Regresion />;
    case "optimizador": return <Optimizador />;
    case "portafolios": return <Portafolios />;
    case "backtesting": return <Backtesting />;
    default: return <Galeria />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <BarraSuperior />
      <main id="contenido" className="max-w-[86rem] mx-auto px-3 py-4 overflow-x-clip">
        <Pantalla />
      </main>
      <Pie />
      <CentroAccesibilidad />
      <HUDCamara />
    </AppProvider>
  );
}
