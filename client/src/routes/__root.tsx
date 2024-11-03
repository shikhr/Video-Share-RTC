import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="w-full  bg-slate-800">
        <Outlet />
      </div>
    </>
  ),
});
