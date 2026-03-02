import { useEffect, useRef, memo } from 'react';

interface EmbeddedTweetProps {
  url: string;
  embedId: string;
}

const getTweetId = (url: string): string | null => {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
};

declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: {
            theme?: 'light' | 'dark';
            cards?: 'visible' | 'hidden';
            conversation?: 'none' | 'all';
            align?: 'left' | 'center' | 'right';
            dnt?: boolean;
          }
        ) => Promise<HTMLElement | undefined>;
        load: (element?: HTMLElement) => void;
      };
      ready?: (callback: (twttr: any) => void) => void;
    };
    twitterWidgetScriptLoading?: boolean;
  }
}

// Centralized script loading to avoid duplicates
const loadTwitterWidgets = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.twttr?.widgets) {
      resolve();
      return;
    }

    if (window.twitterWidgetScriptLoading) {
      const checkInterval = setInterval(() => {
        if (window.twttr?.widgets) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    window.twitterWidgetScriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.onload = () => {
      window.twitterWidgetScriptLoading = false;
      if (window.twttr?.ready) {
        window.twttr.ready(() => resolve());
      } else {
        resolve();
      }
    };
    script.onerror = () => {
      window.twitterWidgetScriptLoading = false;
      resolve();
    };
    document.body.appendChild(script);
  });
};

export const EmbeddedTweet = memo(function EmbeddedTweet({ url, embedId }: EmbeddedTweetProps) {
  const tweetId = getTweetId(url);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tweetId || !containerRef.current) return;

    const container = containerRef.current;
    
    const embedTweet = async () => {
      await loadTwitterWidgets();
      
      if (!container) return;
      
      container.innerHTML = '';

      if (window.twttr?.widgets) {
        await window.twttr.widgets.createTweet(tweetId, container, {
          theme: 'dark',
          cards: 'visible',
          conversation: 'none',
          dnt: true,
        });
      }
    };

    embedTweet();
  }, [tweetId]);

  if (!tweetId) {
    return (
      <div className="rounded-2xl bg-black/20 backdrop-blur-xl p-4 text-white/60 text-sm">
        Invalid tweet URL
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full"
      data-testid={`embedded-tweet-${embedId}`}
    />
  );
});
