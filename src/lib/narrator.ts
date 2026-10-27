import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { narrationClips, type NarrationClip } from '../content/narration';
import { textFingerprint } from './sentences';

/**
 * Plays the recorded class narration (made by scripts/make-narration.mjs).
 * A clip is found by a fingerprint of its text, so a slide whose wording changed
 * after recording has no clip, and the player falls back to the device voice.
 */

export function findClip(text: string): NarrationClip | undefined {
  return narrationClips[textFingerprint(text)];
}

type ClipCallbacks = {
  /** A new sentence started; `index` matches splitSentences(text). */
  onSentence?: (index: number) => void;
  onDone?: () => void;
  onError?: () => void;
};

let player: AudioPlayer | null = null;
let stopCurrent: (() => void) | null = null;

function sharedPlayer(): AudioPlayer {
  if (!player) {
    // Play narration even with the phone's silent switch on, like the lesson videos.
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    player = createAudioPlayer(null, { updateInterval: 100 });
  }
  return player;
}

/** Stops whatever clip is playing. Its callbacks won't fire afterwards. */
export function stopClip() {
  stopCurrent?.();
  stopCurrent = null;
}

/** Plays a clip from the start of sentence `from`. */
export function playClip(clip: NarrationClip, from: number, callbacks: ClipCallbacks = {}) {
  stopClip();
  let active = true;
  let sentence = from;
  // On iPhone a play() sent before the new clip has loaded can be dropped, which left
  // some slides silent until the learner pressed pause and play. So playback starts
  // once the player reports the clip loaded, and is nudged again if it still hasn't
  // begun shortly after.
  let started = false;
  let finished = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  try {
    const audio = sharedPlayer();
    const begin = () => {
      if (started || !active) return;
      started = true;
      // Nudge: if it still isn't playing a moment later, ask again.
      for (const wait of [700, 1500, 2500]) {
        timers.push(setTimeout(() => active && !finished && !audio.playing && audio.play(), wait));
      }
      const start = (clip.starts[from] ?? 0) / 1000;
      if (start > 0) {
        void audio
          .seekTo(start)
          .catch(() => undefined)
          .finally(() => active && audio.play());
      } else {
        audio.play();
      }
    };
    const subscription = audio.addListener('playbackStatusUpdate', (status) => {
      if (!active) return;
      if (status.didJustFinish) {
        finished = true;
        stopClip();
        callbacks.onDone?.();
        return;
      }
      if (!started) {
        if (status.isLoaded) begin();
        return;
      }
      const ms = status.currentTime * 1000 + 50;
      let index = sentence;
      while (index + 1 < clip.starts.length && clip.starts[index + 1] <= ms) index++;
      if (index !== sentence) {
        sentence = index;
        callbacks.onSentence?.(index);
      }
    });
    stopCurrent = () => {
      active = false;
      timers.forEach(clearTimeout);
      subscription.remove();
      audio.pause();
    };
    audio.replace(clip.source);
    // If no "loaded" update arrives (already loaded, or a quiet player), start anyway.
    timers.push(setTimeout(begin, 400));
  } catch {
    active = false;
    callbacks.onError?.();
  }
}
