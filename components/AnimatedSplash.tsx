import themes from "@/constants/colors";
import React, { useEffect } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LOGO = require("../assets/images/logo-backgroundless.png");

interface AnimatedSplashProps {
  /** Flip to true once the app has finished its initial loading work. */
  ready: boolean;
  /** Called after the exit animation completes, so the caller can unmount this. */
  onFinish: () => void;
}

function LoadingDot({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + progress.value * 0.7,
    transform: [{ scale: 0.6 + progress.value * 0.5 }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />;
}

export default function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const colorScheme = useColorScheme();
  const theme = themes[colorScheme === "dark" ? "dark" : "light"];

  // Entrance
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  // Idle "breathing" loop while we wait for the app to be ready
  const breathe = useSharedValue(0);
  // Exit
  const containerOpacity = useSharedValue(1);
  const exitScale = useSharedValue(1);

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.back(1.2)) });

    breathe.value = withDelay(
      650,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    [dot1, dot2, dot3].forEach((dot, i) => {
      dot.value = withDelay(
        700 + i * 150,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 260 })
          ),
          -1,
          false
        )
      );
    });

    return () => {
      cancelAnimation(breathe);
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;

    cancelAnimation(breathe);
    exitScale.value = withTiming(1.08, { duration: 380, easing: Easing.out(Easing.cubic) });
    containerOpacity.value = withTiming(
      0,
      { duration: 380, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => {
    const breatheScale = 1 + breathe.value * 0.045;
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value * breatheScale * exitScale.value }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { backgroundColor: theme.background }, containerStyle]}
    >
      <Animated.Image source={LOGO} style={[styles.logo, logoStyle]} resizeMode="contain" />
      <View style={styles.dotsRow}>
        <LoadingDot progress={dot1} color={theme.primary} />
        <LoadingDot progress={dot2} color={theme.primary} />
        <LoadingDot progress={dot3} color={theme.primary} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  logo: {
    width: 180,
    height: 180,
  },
  dotsRow: {
    flexDirection: "row",
    marginTop: 28,
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
});
