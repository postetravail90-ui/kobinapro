import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, ".");
  const env = loadEnv(mode, envDir, "");
  const supabaseUrlResolved = (env.VITE_SUPABASE_URL ?? "").trim();
  const supabaseAnonResolved = (
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  const supabaseOrigin = (() => {
    const u = supabaseUrlResolved;
    if (!u) return "";
    try {
      return new URL(u).origin;
    } catch {
      return "";
    }
  })();

  return {
  /** Chemins relatifs — requis pour que les assets se chargent dans la WebView Capacitor. */
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    supabaseOrigin
      ? {
          name: "preconnect-supabase",
          transformIndexHtml(html: string) {
            return html.replace(
              "</head>",
              `<link rel="preconnect" href="${supabaseOrigin}" crossorigin />\n</head>`
            );
          },
        }
      : false,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrlResolved),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonResolved),
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    cssMinify: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": [
            "framer-motion",
            "sonner",
            "clsx",
            "tailwind-merge",
            "class-variance-authority"
          ],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts": ["recharts"],
          "vendor-dexie": ["dexie"],
          "vendor-virtual": ["@tanstack/react-virtual"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-dropdown-menu"
          ]
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@supabase/supabase-js",
      "@tanstack/react-query",
      "dexie",
      "@tanstack/react-virtual"
    ]
  }
  };
});
