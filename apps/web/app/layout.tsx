import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';
const geist=Geist({subsets:['latin'],variable:'--font-geist-sans'});
export const metadata:Metadata={title:'RealProfit OS',description:'True Amazon profit and PPC analytics'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body className={`${geist.variable} font-sans`}><Providers>{children}</Providers></body></html>}
