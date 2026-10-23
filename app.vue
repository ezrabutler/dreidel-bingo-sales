@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

html {
  scroll-behavior: smooth;
}

body {
  @apply bg-[#f2f2f0] text-slate-900 antialiased;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}
