import { useCallback, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, GestureResponderEvent, PanResponder, PanResponderGestureState } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface UseSwipeDrawerOptions {
  /**
   * Width of the drawer as a percentage of screen width (0-1) or absolute pixels
   * @default 0.8 (80% of screen width)
   */
  drawerWidth?: number
  /**
   * Edge threshold in pixels - how close to the edge the touch must start
   * @default 20
   */
  edgeThreshold?: number
  /**
   * Swipe threshold in pixels - minimum distance to trigger open/close
   * @default 50
   */
  swipeThreshold?: number
  /**
   * Animation duration in milliseconds
   * @default 250
   */
  animationDuration?: number
  /**
   * Direction from which the drawer opens
   * @default 'left'
   */
  direction?: 'left' | 'right'
  /**
   * Callback when drawer opens
   */
  onOpen?: () => void
  /**
   * Callback when drawer closes
   */
  onClose?: () => void
}

interface UseSwipeDrawerReturn {
  /**
   * Whether the drawer is currently open
   */
  isOpen: boolean
  /**
   * Animated value for the drawer position
   */
  drawerAnim: Animated.Value
  /**
   * Pan handlers to spread onto a View component
   */
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers']
  /**
   * Function to programmatically open the drawer
   */
  openDrawer: () => void
  /**
   * Function to programmatically close the drawer
   */
  closeDrawer: () => void
  /**
   * Function to toggle the drawer
   */
  toggleDrawer: () => void
  /**
   * Calculated drawer width in pixels
   */
  drawerWidthPx: number
}

export const useSwipeDrawer = (options: UseSwipeDrawerOptions = {}): UseSwipeDrawerReturn => {
  const {
    drawerWidth = 0.8,
    edgeThreshold = 20,
    swipeThreshold = 50,
    animationDuration = 250,
    direction = 'left',
    onOpen,
    onClose,
  } = options

  // Calculate drawer width in pixels
  const drawerWidthPx = drawerWidth <= 1 ? SCREEN_WIDTH * drawerWidth : drawerWidth

  const [isOpen, setIsOpen] = useState(false)
  const drawerAnim = useRef(new Animated.Value(-drawerWidthPx)).current

  const openDrawer = useCallback(() => {
    setIsOpen(true)
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: animationDuration,
      useNativeDriver: true,
    }).start(() => {
      onOpen?.()
    })
  }, [drawerAnim, animationDuration, onOpen])

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: -drawerWidthPx,
      duration: animationDuration,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false)
      onClose?.()
    })
  }, [drawerAnim, drawerWidthPx, animationDuration, onClose])

  const toggleDrawer = useCallback(() => {
    if (isOpen) {
      closeDrawer()
    } else {
      openDrawer()
    }
  }, [isOpen, openDrawer, closeDrawer])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt: GestureResponderEvent) => {
        // Only respond to touches starting from the edge
        if (direction === 'left') {
          return evt.nativeEvent.pageX < edgeThreshold
        } else {
          return evt.nativeEvent.pageX > SCREEN_WIDTH - edgeThreshold
        }
      },
      onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        // Respond to horizontal swipes from the edge
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2
        
        if (direction === 'left') {
          const isFromLeftEdge = evt.nativeEvent.pageX < edgeThreshold + 30
          const isSwipingRight = gestureState.dx > 10
          return isFromLeftEdge && isSwipingRight && isHorizontalSwipe
        } else {
          const isFromRightEdge = evt.nativeEvent.pageX > SCREEN_WIDTH - edgeThreshold - 30
          const isSwipingLeft = gestureState.dx < -10
          return isFromRightEdge && isSwipingLeft && isHorizontalSwipe
        }
      },
      onPanResponderGrant: () => {
        // Optional: add haptic feedback here if desired
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (direction === 'left') {
          // For left drawer, swipe right opens
          if (gestureState.dx > 0 && gestureState.dx <= drawerWidthPx) {
            drawerAnim.setValue(-drawerWidthPx + gestureState.dx)
          }
        } else {
          // For right drawer, swipe left opens
          if (gestureState.dx < 0 && Math.abs(gestureState.dx) <= drawerWidthPx) {
            drawerAnim.setValue(-drawerWidthPx + Math.abs(gestureState.dx))
          }
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const swipeDistance = direction === 'left' ? gestureState.dx : Math.abs(gestureState.dx)
        
        // If swiped more than threshold, open the drawer
        if (swipeDistance > swipeThreshold) {
          openDrawer()
        } else {
          // Otherwise, close it back
          closeDrawer()
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is interrupted, close drawer
        closeDrawer()
      },
    })
  ).current

  return useMemo(() => ({
    isOpen,
    drawerAnim,
    panHandlers: panResponder.panHandlers,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    drawerWidthPx,
  }), [isOpen, drawerAnim, panResponder.panHandlers, openDrawer, closeDrawer, toggleDrawer, drawerWidthPx])
}

export default useSwipeDrawer
