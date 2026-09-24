// Production entry for Node hosting (e.g. Render): listen on all interfaces.
process.env.HOST||='0.0.0.0';
await import('./dev.mjs');
