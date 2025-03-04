module.exports = function (api) {
  // Only use Babel for Jest tests
  const isTest = api.env('test');
  
  // Tell Babel to cache the configuration for better performance
  api.cache(true);
  
  const presets = [];
  
  // Only apply Next.js babel preset during tests
  if (isTest) {
    presets.push(['next/babel']);
  }
  
  return {
    presets,
  };
};
