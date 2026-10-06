import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { Prototype3D } from './pages/Prototype3D';
import { Prototype2D } from './pages/Prototype2D';
import { MinigameTest } from './pages/MinigameTest';
import { SettingsGear } from './components/SettingsGear';
import { MenuMusicController } from './components/MenuMusicController';
import { PromptDialog } from './components/PromptDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { toggleFullscreen } from './lib/fullscreen';

// MenuMusicController e SettingsGear usam useLocation() (pra saber se está
// numa mesa) — com createBrowserRouter, isso só funciona dentro da árvore do
// router, então entram aqui como rota-layout em vez de irmãos de <RouterProvider>.
// `<Outlet/>` (a página ativa) entra num ErrorBoundary próprio — se ALGUMA
// página quebrar, os controles globais (música do menu, engrenagem,
// diálogo de texto) continuam funcionando por cima do aviso de erro.
function Layout() {
  return (
    <>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <MenuMusicController />
      <SettingsGear />
      <PromptDialog />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/sala/:code', element: <Room /> },
      { path: '/prototipo-3d/:placeId', element: <Prototype3D /> },
      { path: '/prototipo-3d', element: <Prototype3D /> },
      { path: '/mapa-2d/:map2dId', element: <Prototype2D /> },
      { path: '/mapa-2d', element: <Prototype2D /> },
      { path: '/teste-minigame', element: <MinigameTest /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <RouterProvider router={router} />;
}
