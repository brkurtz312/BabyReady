import { useState } from 'react';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * A lesson video with the device's own play, pause, and fullscreen controls.
 * It never starts by itself; `onPlay` lets the class player stop the narration
 * so the two don't talk over each other.
 *
 * Until it first plays, a large play button sits over the picture, because the
 * device's own controls stay hidden until the video is tapped and learners
 * didn't know to tap it.
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
  const [started, setStarted] = useState(false);

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) {
      setStarted(true);
      onPlay();
    }
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
      {started ? null : (
        <Pressable
          accessibilityLabel={`Play video: ${label}`}
          accessibilityRole="button"
          onPress={() => {
            setStarted(true);
            player.play();
          }}
          style={styles.cover}
          testID="button-play-video"
        >
          <View style={styles.playCircle}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'stretch', width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1D2940' },
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  cover: {
    alignItems: 'center',
    backgroundColor: 'rgba(29, 41, 64, 0.25)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  playCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  playIcon: { color: '#23716C', fontSize: 30, marginLeft: 5 },
});
