export function measurePerformance(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      console.log(`⚡ ${componentName} rendered in ${(end - start).toFixed(2)}ms`);
    };
  }
  
  return () => {};
}

// Использование в компоненте:
// const stopMeasure = measurePerformance('HomePage');
// // ... логика
// stopMeasure();