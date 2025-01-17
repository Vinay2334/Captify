class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.buffer = [];
      this.sampleRate = sampleRate;
      this.chunkSize = this.sampleRate * 5; // 5 seconds of audio
      this.port.onmessage = this.onMessage.bind(this);
    }
  
    onMessage(event) {
      if (event.data === 'start') {
        this.isRecording = true;
      } else if (event.data === 'stop') {
        this.isRecording = false;
        this.flushBuffer();
      }
    }
  
    flushBuffer() {
      if (this.buffer.length > 0) {
        const int16Buffer = new Int16Array(this.buffer.length);
        for (let i = 0; i < this.buffer.length; i++) {
          int16Buffer[i] = Math.max(-1, Math.min(1, this.buffer[i])) * 0x7FFF;
        }
        this.port.postMessage(int16Buffer);
        this.buffer = [];
      }
    }
  
    process(inputs, outputs, parameters) {
      if (this.isRecording) {
        const input = inputs[0];
        const channelData = input[0];
        this.buffer.push(...channelData);
  
        if (this.buffer.length >= this.chunkSize) {
          this.flushBuffer();
        }
      }
      return true;
    }
  }
  
  registerProcessor('recorder-processor', RecorderProcessor);