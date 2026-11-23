/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  // Logos are resized in the browser; this is headroom so an unresized upload still reaches the friendly size check.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  async redirects() {
    // Old test URLs → the new funnels (query strings / UTMs are kept).
    return [
      { source: '/wizard', destination: '/b/photo', permanent: false },
      { source: '/form', destination: '/c/photo', permanent: false },
      // Each funnel lives at /<funnel>/photo and /<funnel>/art (see PAGES.md). The bare letters forward to the photo version.
      { source: '/a', destination: '/a/photo', permanent: false },
      { source: '/b', destination: '/b/photo', permanent: false },
      { source: '/c', destination: '/c/photo', permanent: false },
      { source: '/d', destination: '/d/photo', permanent: false },
      { source: '/e', destination: '/e/photo', permanent: false },
      // English site (/en): D and E exist in the photo design only.
      { source: '/en/:funnel(d|e)', destination: '/en/:funnel/photo', permanent: false },
      { source: '/en/:funnel(d|e)/art', destination: '/en/:funnel/photo', permanent: false },
      // Test area (see PAGES.md): /qa/<funnel> opens its photo version. Capital /QA is handled in middleware.ts.
      { source: '/qa/:funnel(a|b|c|d|e)', destination: '/qa/:funnel/photo', permanent: false },
      // Mover panel moved from /mover to /movers (links already sent keep working).
      { source: '/mover', destination: '/movers', permanent: true },
      { source: '/mover/:path*', destination: '/movers/:path*', permanent: true },
    ];
  },
};
