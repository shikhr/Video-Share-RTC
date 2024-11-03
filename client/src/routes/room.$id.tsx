import { createFileRoute } from '@tanstack/react-router';
import UseSocketRTC from '../hooks/useSocketRTC';
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';
import { FaPhoneSlash } from 'react-icons/fa';

export const Route = createFileRoute('/room/$id')({
  component: RoomPage,
});

function RoomPage() {
  const { id } = Route.useParams();
  const {
    localVideoRef,
    peerVideoRefs,
    toggleMic,
    toggleCamera,
    micActive,
    cameraActive,
    leaveRoom,
    peers,
  } = UseSocketRTC(id);

  return (
    <div className="text-white w-full min-h-screen flex flex-col justify-center items-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 w-full max-w-6xl">
        {/* Local Video */}
        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
            You
          </div>
        </div>

        {/* Remote Peer Videos */}
        {peerVideoRefs.map((videoRef, index) => (
          <div
            key={peers[index]?.id || `peer-${index}`}
            className="aspect-video bg-gray-800 rounded-lg overflow-hidden"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
              Joined {index + 2}
            </div>
          </div>
        ))}

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
