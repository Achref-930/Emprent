/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // next/image requires quality values to be explicitly whitelisted.
    // 85 is used for product photos, 90 for the hero image.
    qualities: [75, 85, 90],
  },
};

export default nextConfig;
