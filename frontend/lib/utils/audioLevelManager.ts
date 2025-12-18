import { useVoiceActivityStore } from "../stores/voiceActivityStore";

type AnalyzerEntry = {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  data: Uint8Array;
  rafId: number | null;
  track: MediaStreamTrack;
  handleTrackEnded: () => void;
};

class AudioLevelManager {
  private audioContext: AudioContext | null = null;
  private analyzers = new Map<string, AnalyzerEntry>();

  private getAudioContext() {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      ((window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext ??
        null);
    if (!AudioContextCtor) {
      console.warn("Web Audio API unavailable in this browser.");
      return null;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextCtor();
    }

    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume().catch(() => undefined);
    }

    return this.audioContext;
  }

  startAnalyzing(userId: string, track: MediaStreamTrack) {
    if (!track || track.readyState === "ended") {
      return;
    }

    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    this.stopAnalyzing(userId);

    // creating a MediaStream from the track
    const stream = new MediaStream([track]);
    const source = context.createMediaStreamSource(stream);

    // creating an AnalyserNode for audio analysis
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.5;
    const data = new Uint8Array(analyser.fftSize);

    // connecting the source to the analyser
    source.connect(analyser);

    // function to update audio level, called on each animation frame
    const updateLevel = () => {
      const entry = this.analyzers.get(userId);
      if (!entry) {
        return;
      }

      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const deviation = data[i] - 128;
        sum += deviation * deviation;
      }
      const rms = Math.sqrt(sum / data.length) / 128;
      const normalized = Math.min(Math.max(rms * 1.8, 0), 1);
      useVoiceActivityStore.getState().setLevel(userId, normalized);

      entry.rafId = window.requestAnimationFrame(updateLevel);
    };

    const handleTrackEnded = () => {
      this.stopAnalyzing(userId);
    };

    track.addEventListener("ended", handleTrackEnded);

    const entry: AnalyzerEntry = {
      source,
      analyser,
      data,
      rafId: window.requestAnimationFrame(updateLevel),
      track,
      handleTrackEnded,
    };

    this.analyzers.set(userId, entry);
  }

  stopAnalyzing(userId: string) {
    const entry = this.analyzers.get(userId);
    if (!entry) {
      return;
    }

    if (entry.rafId) {
      cancelAnimationFrame(entry.rafId);
    }

    entry.source.disconnect();
    entry.analyser.disconnect();
    entry.track.removeEventListener("ended", entry.handleTrackEnded);

    this.analyzers.delete(userId);
    useVoiceActivityStore.getState().removeLevel(userId);
  }

  stopAll() {
    Array.from(this.analyzers.keys()).forEach((userId) =>
      this.stopAnalyzing(userId)
    );
    useVoiceActivityStore.getState().clearLevels();
  }
}

export const audioLevelManager = new AudioLevelManager();
