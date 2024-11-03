import { useEffect, useRef, useState } from 'react';
import { configuration } from '../utils/RTCConfig';
import { Socket, io } from 'socket.io-client';
import { useNavigate } from '@tanstack/react-router';

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const UseSocketRTC = (roomName: string) => {
  const navigate = useNavigate();

  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [peers, setPeers] = useState<PeerConnection[]>([]);

  const socketRef = useRef<null | Socket>(null);
  const localStreamRef = useRef<null | MediaStream>(null);
  const localVideoRef = useRef<null | HTMLVideoElement>(null);

  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  const isHostRef = useRef(false);

  useEffect(() => {
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((permissionStatus) => {
        console.log('Camera permission status:', permissionStatus.state);

        permissionStatus.onchange = () => {
          console.log('Camera permission changed:', permissionStatus.state);
        };
      });

    const initSocket = async () => {
      socketRef.current = io();

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        socketRef.current?.emit('join', roomName);
      });

      socketRef.current.on('joined', handleRoomJoined);
      socketRef.current.on('created', handleRoomCreated);
      socketRef.current.on('full', handleRoomFull);
      socketRef.current.on('peer-list', handlePeerList);
      socketRef.current.on('peer-joined', handlePeerJoined);
      socketRef.current.on('peer-left', handlePeerLeft);
      socketRef.current.on('offer', handleOffer);
      socketRef.current.on('answer', handleAnswer);
      socketRef.current.on('ice-candidate', handleCandidate);
    };

    initSocket();
    return () => {
      cleanupConnections();
      socketRef.current?.disconnect();
    };
  }, [roomName]);

  const handleRoomCreated = async () => {
    isHostRef.current = true;
    await setupLocalStream();
    console.log('created room:', roomName);
    socketRef.current?.emit('ready', roomName);
  };

  const handleRoomJoined = async () => {
    console.log('joined room:', roomName);
    await setupLocalStream();
    if (localStreamRef.current) {
      socketRef.current?.emit('ready', roomName);
    } else {
      console.error('Failed to get local stream');
    }
  };

  const setupLocalStream = async () => {
    if (localStreamRef.current) {
      console.log('Local stream already exists');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 500, height: 500 },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (localVideoRef.current) {
            localVideoRef.current.onloadedmetadata = () => {
              localVideoRef.current
                ?.play()
                .then(() => {
                  resolve(true);
                })
                .catch((err) => {
                  resolve(false);
                });
            };
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      return false;
    }
  };

  const handleRoomFull = () => {
    console.log('Room is full');
    navigate({ to: '/', replace: true });
  };

  const handlePeerList = async (peerIds: string[]) => {
    console.log('Peer list:', peerIds);

    // First ensure we have local stream
    if (!localStreamRef.current) {
      await setupLocalStream();
    }

    // Only proceed if we have the stream
    if (localStreamRef.current) {
      for (const peerId of peerIds) {
        if (!peersRef.current.has(peerId)) {
          await makeOffer(peerId);
        }
      }
    } else {
      console.error('Unable to establish local stream for peer connections');
    }
  };

  const handlePeerJoined = async (peerId: string) => {
    console.log('Peer joined:', peerId);
    if (!peersRef.current.has(peerId)) {
      // await createPeerConnection(peerId);
    }
  };

  const handlePeerLeft = (peerId: string) => {
    const peerConnection = peersRef.current.get(peerId);
    if (peerConnection) {
      peerConnection.connection.close();
      peerConnection.videoRef.current?.remove();
      peersRef.current.delete(peerId);

      setPeers(Array.from(peersRef.current.values()));
    }
  };

  const createPeerConnection = async (peerId: string) => {
    if (!localStreamRef.current) {
      throw new Error('wee Cannot create peer connection without local stream');
    }

    console.log('Creating peer connection:', peerId);

    const videoRef = { current: document.createElement('video') };
    videoRef.current.autoplay = true;
    videoRef.current.playsInline = true;

    const newPC = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    newPC.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit(
          'ice-candidate',
          event.candidate,
          roomName,
          peerId
        );
      }
    };

    // Handle incoming tracks
    newPC.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      } else {
        console.warn('Received track but no streams for peer:', peerId);
      }
    };

    // Add local tracks ONLY if we have them
    if (localStreamRef.current) {
      console.log('Adding local tracks to peer connection:', peerId);
      localStreamRef.current.getTracks().forEach((track) => {
        newPC.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.warn(
        'No local stream when creating peer connection for:',
        peerId
      );
    }

    const peerConnection: PeerConnection = {
      id: peerId,
      connection: newPC,
      videoRef,
    };

    return peerConnection;
  };

  const makeOffer = async (peerId: string) => {
    const peerConnection = await createPeerConnection(peerId);
    peersRef.current.set(peerId, peerConnection);
    setPeers(Array.from(peersRef.current.values()));

    try {
      const offer = await peerConnection.connection.createOffer();
      await peerConnection.connection.setLocalDescription(offer);
      console.log('Sending offer to:', peerId);
      socketRef.current?.emit('offer', offer, roomName, peerId);
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    senderId: string
  ) => {
    console.log('Received offer from:', senderId);

    if (peersRef.current.has(senderId)) {
      console.warn('Already have a connection for this peer');
      return;
    }

    const peerConnection = await createPeerConnection(senderId);
    peersRef.current.set(senderId, peerConnection);
    setPeers(Array.from(peersRef.current.values()));

    try {
      await peerConnection.connection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.connection.createAnswer();
      await peerConnection.connection.setLocalDescription(answer);
      console.log('Sending answer to:', senderId);
      socketRef.current?.emit('answer', answer, roomName, senderId);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    senderId: string
  ) => {
    console.log('Received answer from:', senderId);
    const peerConnection = peersRef.current.get(senderId)?.connection;

    if (!peerConnection) {
      console.error('No peer connection for:', senderId);
      return;
    }

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleCandidate = async (
    candidate: RTCIceCandidateInit,
    senderId: string
  ) => {
    const peerConnection = peersRef.current.get(senderId)?.connection;

    if (!peerConnection) {
      console.error('No peer connection');
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
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

  const cleanupConnections = () => {
    console.log('Cleaning up connections');
    peersRef.current.forEach((peer) => {
      peer.connection.onicecandidate = null; // Remove listener
      peer.connection.close(); // Close connection
      peer.videoRef.current?.remove();
    });
    peersRef.current.clear();
    setPeers([]);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave', roomName);
    cleanupConnections();
    navigate({ to: '/', replace: true });
  };

  return {
    localVideoRef,
    peerVideoRefs: peers.map((peer) => peer.videoRef),
    toggleMic,
    toggleCamera,
    micActive,
    cameraActive,
    leaveRoom,
    peers,
  };
};

export default UseSocketRTC;
