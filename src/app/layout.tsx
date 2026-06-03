import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AgentProvider } from "@/components/providers/agent-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UpdateNotifier } from "@/components/providers/update-notifier";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentHub — AI Agent Manager",
  description: "Manage your CLI agents, their configs, MCPs & flags",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden bg-background text-foreground font-sans text-[13px]" suppressHydrationWarning>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="green"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AgentProvider>
            <TooltipProvider>
              {children}
              <UpdateNotifier />
            </TooltipProvider>
          </AgentProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
