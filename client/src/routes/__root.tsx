import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="w-full  bg-slate-800">
        <Outlet />
      </div>

      <TanStackRouterDevtools />
    </>
  ),
});
