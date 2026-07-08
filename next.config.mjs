/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Images are pre-compressed by hand in Squoosh (90 for the hero, 85
    // for product photos) specifically to keep zoom-in detail sharp.
    // Letting Vercel's Image Optimization API re-encode them on top of
    // that would be a second lossy pass (worse quality) AND burns the
    // Hobby plan's 5,000 transformations/month for no benefit — these
    // files are already small and already optimized. Skipping the
    // optimizer serves the exact bytes we tuned, uses zero transformation
    // quota, and only costs plain bandwidth (100GB/month on Hobby, and
    // our current image weight is nowhere near that).
    unoptimized: true,
  },
};

export default nextConfig;
