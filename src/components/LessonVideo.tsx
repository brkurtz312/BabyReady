import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

/**
 * A lesson video with the device's own play, pause, and fullscreen controls.
 * It never starts by itself; `onPlay` lets the class player stop the narration
 * so the two don't talk over each other.
 */
export function LessonVideo({
  source,
  label,
  onPlay,
}: {
  source: number;
  label: string;
  onPlay: () => void;
}) {
  const player = useVideoPlayer(source);

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) onPlay();
  });

  // The fixed 16:9 frame keeps the video inside the slide on every platform. The
  // video fills it by width and height, because on web its style goes straight onto
  // a <video> element, which ignores left/right stretching.
  return (
    <View style={styles.frame}>
      <VideoView
        accessibilityLabel={label}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls
        player={player}
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'stretch', width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1D2940' },
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});
