async function generateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target === "offscreen") {
    switch (message.type) {
      case "start-recording":
        startRecording(message.data);
        break;
      case "stop-recording":
        stopRecording();
        break;
      default:
        throw new Error("Unrecognized message:", message.type);
    }
  }
});

let recorder;
let data = [];

let audioContext;
let recorderNode;
let mediaStreamSource;

async function startRecording(streamId) {
  if (recorderNode) {
    throw new Error("Called startRecording while recording is in progress.");
  }
 
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  });

  audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule('recorder-processor.js');

  mediaStreamSource = audioContext.createMediaStreamSource(stream);
  recorderNode = new AudioWorkletNode(audioContext, 'recorder-processor');

  recorderNode.port.onmessage = (event) => {
    const audioData = event.data;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(audioData.buffer);
    } else {
      console.error("WebSocket is not open. Ready state: " + socket.readyState);
    }
  };

  mediaStreamSource.connect(recorderNode)
  mediaStreamSource.connect(audioContext.destination);
  recorderNode.port.postMessage('start');

  socket = new WebSocket("ws://127.0.0.1:8000/ws/audio");
  socket.onopen = function(event) {
    console.log("WebSocket is open now.");
  };
  socket.onclose = function(event) {
    console.log("WebSocket is closed now.");
  };
  socket.onerror = function(error) {
    console.error("WebSocket error observed:", error);
  };

  window.location.hash = "recording";
  console.log("Windowlocation", window.location);
}

async function stopRecording() {
  if (recorderNode) {
    recorderNode.port.postMessage('stop');
    recorderNode.disconnect();
    mediaStreamSource.disconnect();
    audioContext.close();
    recorderNode = null;
    mediaStreamSource = null;
    audioContext = null;
  }

  // // Update current state in URL
  window.location.hash = "";

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
    console.log("WebSocket connection closed on stop-recording.");
  }
}