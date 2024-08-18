import { useEffect, useRef, useState } from 'react';
import { configuration } from '../utils/RTCConfig';
import { Socket, io } from 'socket.io-client';
import { useNavigate } from '@tanstack/react-router';

const UseSocketRTC = (roomName: string) => {
  const navigate = useNavigate({
    from: '/room/$room',
    params: { room: roomName },
  });

  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);

  const socketRef = useRef<null | Socket>(null);
  const localStreamRef = useRef<null | MediaStream>(null);
  const localVideoRef = useRef<null | HTMLVideoElement>(null);
  const remoteVideoRef = useRef<null | HTMLVideoElement>(null);

  const RTCConnectionRef = useRef<null | RTCPeerConnection>(null);

  const isHostRef = useRef(false);

  useEffect(() => {
    const initSocket = async () => {
      socketRef.current = io();

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        socketRef.current?.emit('join', roomName);
      });

      socketRef.current.on('joined', handleRoomJoined);
      socketRef.current.on('created', handleRoomCreated);
      socketRef.current.on('full', handleRoomFull);
      socketRef.current.on('ready', makeCall);
      socketRef.current.on('leave', handlePeerLeave);

      socketRef.current.on('offer', handleOffer);
      socketRef.current.on('answer', handleAnswer);
      socketRef.current.on('ice-candidate', handleCandidate);
    };

    initSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomName]);

  const handleRoomCreated = async () => {
    isHostRef.current = true;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 500, height: 500 },
      audio: true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.onloadedmetadata = () => {
        localVideoRef.current?.play();
      };
    }
    socketRef.current?.emit('ready', roomName);
  };

  const handleRoomJoined = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 500, height: 500 },
      audio: true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.onloadedmetadata = () => {
        localVideoRef.current?.play();
      };
    }
    socketRef.current?.emit('ready', roomName);
  };

  const handleRoomFull = () => {
    console.log('Room is full');
    navigate({ to: '/', replace: true });
  };

  const handlePeerLeave = () => {
    isHostRef.current = true;

    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      remoteVideoRef.current.srcObject = null;
    }
    if (RTCConnectionRef.current) {
      RTCConnectionRef.current.ontrack = null;
      RTCConnectionRef.current.onicecandidate = null;
      RTCConnectionRef.current.close();
      RTCConnectionRef.current = null;
    }
  };

  const createPeerConnection = () => {
    const newPC = new RTCPeerConnection(configuration);

    newPC.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current?.emit('ice-candidate', candidate, roomName);
      }
    };

    newPC.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.onloadedmetadata = () => {
          remoteVideoRef.current?.play();
        };
      }
    };

    return newPC;
  };

  const makeCall = async () => {
    if (!isHostRef.current) return;
    RTCConnectionRef.current = createPeerConnection();

    localStreamRef.current?.getTracks().forEach((track) => {
      RTCConnectionRef.current?.addTrack(track, localStreamRef.current!);
    });

    try {
      const offer = await RTCConnectionRef.current?.createOffer();
      await RTCConnectionRef.current?.setLocalDescription(offer);
      socketRef.current?.emit('offer', offer, roomName);
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (RTCConnectionRef.current) {
      console.error('Existing peer connection');
      return;
    }

    RTCConnectionRef.current = createPeerConnection();

    localStreamRef.current?.getTracks().forEach((track) => {
      RTCConnectionRef.current?.addTrack(track, localStreamRef.current!);
    });

    try {
      await RTCConnectionRef.current?.setRemoteDescription(offer);
      const answer = await RTCConnectionRef.current?.createAnswer();
      await RTCConnectionRef.current?.setLocalDescription(answer);
      socketRef.current?.emit('answer', answer, roomName);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!RTCConnectionRef.current) {
      console.error('No peer connection');
      return;
    }

    try {
      await RTCConnectionRef.current.setRemoteDescription(answer);
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!RTCConnectionRef.current) {
      console.error('No peer connection');
      return;
    }
    try {
      await RTCConnectionRef.current.addIceCandidate(candidate);
    } catch (err) {
      console.error('Error handling candidate:', err);
    }
  };

  const toggleMedia = (type: string, state: boolean) => {
    localStreamRef.current?.getTracks().forEach((track) => {
      if (track.kind === type) {
        track.enabled = !state;
      }
    });
  };
  const toggleMic = () => {
    toggleMedia('audio', micActive);
    setMicActive(!micActive);
  };
  const toggleCamera = () => {
    toggleMedia('video', cameraActive);
    setCameraActive(!cameraActive);
  };

  const leaveRoom = () => {
    console.log('Room left');
    isHostRef.current = false;
    socketRef.current?.emit('leave', roomName);
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (RTCConnectionRef.current) {
      RTCConnectionRef.current.ontrack = null;
      RTCConnectionRef.current.onicecandidate = null;
      RTCConnectionRef.current.close();
      RTCConnectionRef.current = null;
    }

    navigate({ to: '/', replace: true });
  };

  return {
    localVideoRef,
    remoteVideoRef,
    toggleMic,
    toggleCamera,
    micActive,
    cameraActive,
    leaveRoom,
  };
};

export default UseSocketRTC;
