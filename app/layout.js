import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata = {
  title: "InstaBill India — GST Invoicing & UPI Payments",
  description: "Create GST-compliant invoices with UPI QR code in 60 seconds. Free for Indian freelancers and businesses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="instabill-theme"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
