import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';
const manrope=Manrope({subsets:['latin'],weight:['400','500','600','700','800'],variable:'--font-geist-sans'});
export const metadata:Metadata={title:'ProfitPilot',description:'True profit and advertising analytics for Amazon agencies'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body className={`${manrope.variable} font-sans`}><Providers>{children}</Providers></body></html>}
