@import "tailwindcss";

@layer base {
  :root {
    --bg-system: #f3f4f6;
    --bg-surface: rgba(255, 255, 255, 0.76);
    --bg-elevated: #ffffff;
    --bg-muted: #f5f7fb;
    --bg-soft: #eef3ff;
    --border-soft: rgba(15, 23, 42, 0.08);
    --text-primary: #111827;
    --text-secondary: #5f6b7a;
    --text-tertiary: #8b93a7;
    --brand-blue: #007aff;
    --brand-blue-strong: #005fce;
    --brand-green: #34c759;
    --brand-orange: #ff9500;
    --brand-red: #ff3b30;
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  body {
    background:
      radial-gradient(circle at top, rgba(0, 122, 255, 0.05), transparent 35%),
      linear-gradient(180deg, #f5f6f9 0%, #eef2f7 100%);
    color: var(--text-primary);
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;
    letter-spacing: -0.01em;
  }

  h1, h2, h3, h4, h5, h6 {
    line-height: 1.15;
    letter-spacing: -0.03em;
    margin: 0;
    font-weight: 700;
  }

  p, li {
    line-height: 1.45;
    margin: 0;
  }

  button, input, select, textarea {
    line-height: 1.3;
    font: inherit;
  }
}

.num,
.tabular-nums,
[data-tabular-nums="true"],
input[type="number"] {
  font-variant-numeric: tabular-nums;
  -webkit-font-feature-settings: "tnum" 1;
  font-feature-settings: "tnum" 1;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.pressable {
  transition: transform 90ms cubic-bezier(0.2, 0, 0, 1), filter 90ms ease, box-shadow 150ms ease, background-color 150ms ease;
  touch-action: manipulation;
}

.pressable:active {
  transform: scale(0.98);
  filter: brightness(0.96);
}

.soft-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  border: 1px solid var(--border-soft);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);
}

::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 9999px;
}

html.battery-saver *,
html.battery-saver *::before,
html.battery-saver *::after {
  transition-duration: 0.001ms !important;
}

html.battery-saver .animate-pulse,
html.battery-saver .animate-bounce,
html.battery-saver .animate-fade-in {
  animation: none !important;
}

html.battery-saver .backdrop-blur-xs,
html.battery-saver .backdrop-blur-sm,
html.battery-saver .backdrop-blur-md {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

html.battery-saver .pressable:active {
  transform: none !important;
  filter: brightness(0.92);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
