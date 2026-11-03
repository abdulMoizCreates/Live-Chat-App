import "./globals.css";

export const metadata = {
  title: "Live Chat",
  description: "Realtime chat app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
