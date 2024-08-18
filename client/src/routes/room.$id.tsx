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
    remoteVideoRef,
    toggleMic,
    toggleCamera,
    micActive,
    cameraActive,
    leaveRoom,
  } = UseSocketRTC(id);

  return (
    <div className="text-white w-full min-h-screen flex flex-col justify-center items-center">
      <div className="flex gap-4 mb-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="max-w-md border rounded"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="max-w-md border rounded"
        />
      </div>
      <div className="flex gap-4">
        <button
          onClick={toggleMic}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          {micActive ? <FiMic /> : <FiMicOff />}
        </button>
        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          {cameraActive ? <FiVideo /> : <FiVideoOff />}
        </button>
        <button
          onClick={leaveRoom}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          <FaPhoneSlash />
        </button>
      </div>
    </div>
  );
}
