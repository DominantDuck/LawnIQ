import { Analytics } from '@vercel/analytics/next';
import '../index.css';
import '../App.css';

export const metadata = {
  title: 'SwiftQuote.',
  description: 'Manual satellite property area measurement',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
