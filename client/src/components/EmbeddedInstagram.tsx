import { useEffect, useRef, memo } from 'react';

interface EmbeddedInstagramProps {
  url: string;
  embedId: string;
}

const getInstagramPostId = (url: string): string | null => {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
};

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
    instagramScriptLoading?: boolean;
  }
}

const loadInstagramScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.instgrm?.Embeds) {
      resolve();
      return;
    }

    if (window.instagramScriptLoading) {
      const checkInterval = setInterval(() => {
        if (window.instgrm?.Embeds) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    window.instagramScriptLoading = true;
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    script.onload = () => {
      window.instagramScriptLoading = false;
      resolve();
    };
    script.onerror = () => {
      window.instagramScriptLoading = false;
      resolve();
    };
    document.body.appendChild(script);
  });
};

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const EmbeddedInstagram = memo(function EmbeddedInstagram({ url, embedId }: EmbeddedInstagramProps) {
  const postId = getInstagramPostId(url);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postId || !containerRef.current) return;

    const embedInstagram = async () => {
      await loadInstagramScript();
      
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process();
      }
    };

    embedInstagram();
  }, [postId]);

  if (!postId) {
    return (
      <div className="rounded-2xl bg-black/20 backdrop-blur-xl p-4 text-white/60 text-sm">
        Invalid Instagram URL
      </div>
    );
  }

  const escapedUrl = escapeHtml(url);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-md mx-auto instagram-embed-container"
      data-testid={`embedded-instagram-${embedId}`}
      dangerouslySetInnerHTML={{
        __html: `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${escapedUrl}" data-instgrm-version="14" style="background:#1a1a1a; border:0; border-radius:16px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"></div></blockquote>`
      }}
    />
  );
});
