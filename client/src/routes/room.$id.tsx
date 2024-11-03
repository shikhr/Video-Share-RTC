import { createFileRoute } from '@tanstack/react-router';
import UseSocketRTC from '../hooks/useSocketRTC';
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';
import { FaPhoneSlash } from 'react-icons/fa';

export const Route = createFileRoute('/room/$id')({
  component: RoomPage,
});

function RoomPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch<{ username: string }>();
  const { username } = searchParams;

  const {
    localVideoRef,
    peerVideoRefs,
    toggleMic,
    toggleCamera,
    micActive,
    cameraActive,
    leaveRoom,
    peers,
  } = UseSocketRTC(id, username);

  return (
    <div className="text-white w-full min-h-screen flex flex-col justify-center items-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 w-full max-w-6xl">
        {/* Local Video */}
        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
          <h3>{username}</h3>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-md"
          />
        </div>

        {/* Remote Peer Videos */}
        {peerVideoRefs.map(({ ref, username: peerUsername }, idx) => (
          <div
            key={peers[idx]?.id || `peer-${idx}`}
            className="aspect-video bg-gray-800 rounded-lg overflow-hidden"
          >
            <h3>{peerUsername}</h3>
            <video
              ref={ref}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-md"
            />
          </div>
        ))}
        <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
          Joined {peerVideoRefs.length + 1}
        </div>

        {/*  */}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={toggleMic}
          className="px-4 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
          title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micActive ? <FiMic size={24} /> : <FiMicOff size={24} />}
        </button>
        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
          title={cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {cameraActive ? <FiVideo size={24} /> : <FiVideoOff size={24} />}
        </button>
        <button
          onClick={leaveRoom}
          className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
          title="Leave Room"
        >
          <FaPhoneSlash size={24} />
        </button>
      </div>
    </div>
  );
}
