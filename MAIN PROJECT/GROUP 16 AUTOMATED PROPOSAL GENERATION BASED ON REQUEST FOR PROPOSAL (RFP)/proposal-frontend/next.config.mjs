const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*/generate_proposal/',
        destination: 'http://127.0.0.1:8000/api/:path*/generate_proposal/',
      },
      {
        source: '/api/:path*/generate_proposal',
        destination: 'http://127.0.0.1:8000/api/:path*/generate_proposal/',
      },
      {
        source: '/api/:path*/',
        destination: 'http://127.0.0.1:8000/api/:path*/',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*/',
      },
    ];
  },
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    proxyTimeout: 600000, // 10 minutes
  },
};

export default nextConfig;