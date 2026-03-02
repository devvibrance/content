import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/api/twitter/oembed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url } = body;
      
      if (!url) {
        return new Response(JSON.stringify({ error: "URL parameter required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark&dnt=true&omit_script=true`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `Twitter API error: ${response.statusText}` }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to fetch tweet embed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

http.route({
  path: "/api/library/fetch-metadata",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url } = body;

      if (!url || typeof url !== "string") {
        return new Response(
          JSON.stringify({ error: "Valid URL required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      let metadata = null;
      let embedType = null;

      const tweetMatch = url.match(/twitter\.com\/[\w]+\/status\/(\d+)|x\.com\/[\w]+\/status\/(\d+)/);
      if (tweetMatch) {
        embedType = "tweet";
        const embedId = tweetMatch[1] || tweetMatch[2];
        
        try {
          const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
          const response = await fetch(oembedUrl);
          
          if (response.ok) {
            const data = await response.json();
            const htmlText = data.html?.replace(/<[^>]*>/g, '') || "";
            
            metadata = {
              author_name: data.author_name || "Twitter User",
              author_username: data.author_name || "user",
              text: htmlText.trim() || "Tweet content",
              embedId,
              verified: false,
            };
          }
        } catch {
        }
      }

      const igMatch = url.match(/instagram\.com\/(p|reel)\/([\w-]+)/);
      if (igMatch) {
        embedType = "instagram";
        const embedId = igMatch[2];
        
        metadata = {
          author_username: "instagramuser",
          embedId,
          verified: false,
        };
      }

      if (!metadata) {
        return new Response(
          JSON.stringify({ error: "Invalid or unsupported URL" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          embedType,
          embedId: metadata.embedId,
          metadata,
          url,
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to fetch metadata" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

http.route({
  path: "/api/twitter/oembed",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

http.route({
  path: "/api/library/fetch-metadata",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
