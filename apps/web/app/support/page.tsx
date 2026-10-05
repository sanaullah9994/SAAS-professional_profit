import type { Metadata } from 'next';
import { SupportPage } from '@/components/support/support-page';

export const metadata: Metadata = {
  title: 'Real Profit Support',
  description:
    'Support for Real Profit: connect your Amazon Seller Central account, manage inventory and orders, and track COGS, Amazon fees, advertising spend, manufacturing costs, and true profit. FAQs and contact options for Amazon sellers.',
};

export default function Page() {
  return <SupportPage />;
}
