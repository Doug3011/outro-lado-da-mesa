import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { Prototype3D } from './pages/Prototype3D';
import { MinigameTest } from './pages/MinigameTest';
import { SettingsGear } from './components/SettingsGear';
import { MenuMusicController } from './components/MenuMusicController';
import { PromptDialog } from './components/PromptDialog';
import { toggleFullscreen } from './lib/fullscreen';

// MenuMusicController e SettingsGear usam useLocation() (pra saber se está
// numa mesa) — com createBrowserRouter, isso só funciona dentro da árvore do
// router, então entram aqui como rota-layout em vez de irmãos de <RouterProvider>.
function Layout() {
  return (
    <>
      <Outlet />
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
