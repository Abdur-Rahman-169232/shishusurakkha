import { Suspense } from "react";
import Providers from "@/app/providers";
import "@/index.css";

export const metadata = {
  title: "ShishuSurakkha — Vaccination Tracker",
  description:
    "Mobile-first EPI child vaccination tracker for rural Health Assistants in Bangladesh.",
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F766E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
