import type { NextConfig } from 'next';
const config:NextConfig={transpilePackages:['@amazon-profit/ui','@amazon-profit/utils','@amazon-profit/types'],output:'standalone'};
export default config;
