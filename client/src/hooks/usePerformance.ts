import { useEffect, useRef } from "react";

export function usePerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Performance] ${componentName} rendered ${renderCount.current} times`
      );
      console.log(
        `[Performance] Time since last render: ${timeSinceLastRender.toFixed(
          2
        )}ms`
      );
    }

    lastRenderTime.current = currentTime;
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: performance.now() - lastRenderTime.current,
  };
}
