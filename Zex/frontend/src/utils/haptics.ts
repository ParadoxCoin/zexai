/**
 * Haptic Feedback and UI Interaction Sounds
 */

export const playHapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    // 1. Vibration (if supported)
    if (window.navigator && window.navigator.vibrate) {
        switch (type) {
            case 'light': window.navigator.vibrate(10); break;
            case 'medium': window.navigator.vibrate(20); break;
            case 'heavy': window.navigator.vibrate(50); break;
            case 'success': window.navigator.vibrate([10, 30, 10]); break;
            case 'warning': window.navigator.vibrate([20, 50]); break;
            case 'error': window.navigator.vibrate([50, 50, 50]); break;
        }
    }

    // 2. Interaction Sounds (Subtle)
    // We can add subtle audio feedback here if desired
};

export const useHaptics = () => {
    return {
        haptic: playHapticFeedback
    };
};

export default playHapticFeedback;
