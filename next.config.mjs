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
      // Mover panel moved from /mover to /movers (links already sent keep working).
      { source: '/mover', destination: '/movers', permanent: true },
      { source: '/mover/:path*', destination: '/movers/:path*', permanent: true },
    ];
  },
};
