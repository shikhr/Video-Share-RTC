import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createLazyFileRoute('/')({
  component: Index,
});

function Index() {
  const navigate = useNavigate({ from: '/' });

  const [roomId, setRoomId] = useState<string>('');

  const joinRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!roomId) return;
    navigate({ to: '/room/$id', params: { id: roomId } });
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <div className="p-4 max-w-lg mx-auto bg-slate-600 rounded-xl shadow-md space-y-4 flex items-center justify-center">
        <form className="space-y-4" onSubmit={joinRoom}>
          <div>
            <label
              htmlFor="roomid"
              className="block text-xl font-medium text-gray-100"
            >
              Enter the room name
            </label>
            <input
              type="text"
              id="roomid"
              onChange={(e) => setRoomId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xl bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 font-bold text-2xl border border-transparent rounded-md shadow-sm  text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
