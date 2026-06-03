import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IconStoreState {
  icons: Record<string, string>; // Maps provider name to data URL
  fetchIcon: (provider: string) => Promise<string | null>;
}

export const useIconStore = create<IconStoreState>()(
  persist(
    (set, get) => ({
      icons: {},
      fetchIcon: async (provider: string) => {
        const { icons } = get();
        if (icons[provider]) {
          return icons[provider];
        }

        try {
          // Normalize provider ID for models.dev (case-insensitive)
          let providerId = provider.toLowerCase();
          if (providerId === 'google-generative-ai' || providerId === 'google') providerId = 'google';
          if (providerId === 'anthropic') providerId = 'anthropic';
          if (providerId === 'openai') providerId = 'openai';
          if (providerId === 'cerebras') providerId = 'cerebras';
          if (providerId === 'groq') providerId = 'groq';
          
          const url = `https://models.dev/logos/${providerId}.svg`;
          let svgText: string;

          if (window.electronAPI?.fetchUrl) {
            // Use backend fetch to bypass CORS
            svgText = await window.electronAPI.fetchUrl(url);
          } else {
            // Fallback to client-side fetch (might fail due to CORS)
            const res = await fetch(url);
            if (!res.ok) return null;
            svgText = await res.text();
          }
          
          if (!svgText || !svgText.includes('<svg')) return null;

          // Basic sanitization and conversion to data URL
          const base64 = btoa(unescape(encodeURIComponent(svgText)));
          const dataUrl = `data:image/svg+xml;base64,${base64}`;
          
          set((state) => ({
            icons: { ...state.icons, [provider]: dataUrl }
          }));
          
          return dataUrl;
        } catch (err) {
          console.warn(`Failed to fetch icon for ${provider}:`, err);
          return null;
        }
      }
    }),
    {
      name: 'brane-icon-storage',
    }
  )
);
