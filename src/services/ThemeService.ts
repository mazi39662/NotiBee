import { ref } from 'vue';

const isDarkMode = ref(localStorage.getItem('theme-dark') === 'true');

export const useThemeService = () => {
    const applyTheme = (dark: boolean) => {
        isDarkMode.value = dark;
        localStorage.setItem('theme-dark', dark.toString());
        // If dark is false, add 'light-theme'. If dark is true, remove it.
        document.body.classList.toggle('light-theme', !dark);
    };

    // Initialize theme
    const initTheme = () => {
        const stored = localStorage.getItem('theme-dark');
        if (stored !== null) {
            applyTheme(stored === 'true');
        } else {
            // Default to dark mode for new users
            applyTheme(true);
        }
    };

    return {
        isDarkMode,
        applyTheme,
        initTheme
    };
};
