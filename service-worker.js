let data = [];

chrome.action.onClicked.addListener(async (tab) => {
  const existingContexts = await chrome.runtime.getContexts({});
  let recording = false;

  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
  );

  // If an offscreen document is not already open, create one.
  if (!offscreenDocument) {
    // Create an offscreen document.
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Recording from chrome.tabCapture API",
    });
  } else {
    recording = offscreenDocument.documentUrl.endsWith("#recording");
  }
  console.log("Recording", recording);
  if (recording) {
    chrome.runtime.sendMessage({
      type: "stop-recording",
      target: "offscreen",
    });
    console.log("stop recording");
    chrome.action.setIcon({ path: "icons/not-recording.png" });
    chrome.offscreen.closeDocument();
    return;
  }

  // Get a MediaStream for the active tab.
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tab.id,
  });

  // Send the stream ID to the offscreen document to start recording.
  chrome.runtime.sendMessage({
    type: "start-recording",
    target: "offscreen",
    data: streamId,
  });

  chrome.action.setIcon({ path: "/icons/recording.png" });
});

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === "dowload-audio") {
    console.log("on message from offscreen");
    const url = message.url;
    chrome.downloads.download({
      url: url,
      filename: "recording.webm", // Specify the filename for the download
    });
  }
});