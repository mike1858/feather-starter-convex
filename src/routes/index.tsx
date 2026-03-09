import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "../ui/logo";
import { cn } from "@/utils/misc";
import { buttonVariants } from "@/ui/button-util";
import { Loader2 } from "lucide-react";
import siteConfig from "~/site.config";
import { ThemeSwitcherHome } from "@/ui/theme-switcher";
import ShadowPNG from "/images/shadow.png";
import { useConvexAuth } from "@convex-dev/react-query";
import { Route as AuthLoginRoute } from "@/routes/_app/login/_layout.index";
import { Route as DashboardRoute } from "@/routes/_app/_auth/dashboard/_layout.index";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  return (
    <div className="relative flex h-full w-full flex-col bg-card">
      {/* Navigation */}
      <div className="sticky top-0 z-50 mx-auto flex w-full max-w-screen-lg items-center justify-between p-6 py-3">
        <Link to="/" className="flex h-10 items-center gap-1">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeSwitcherHome />
          <Link
            to={
              isAuthenticated
                ? DashboardRoute.fullPath
                : AuthLoginRoute.fullPath
            }
            className={buttonVariants({ size: "sm" })}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="animate-spin w-16 h-4" />}
            {!isLoading && isAuthenticated && "Dashboard"}
            {!isLoading && !isAuthenticated && "Get Started"}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="z-10 mx-auto flex w-full max-w-screen-lg flex-col gap-4 px-6">
        <div className="z-10 flex h-full w-full flex-col items-center justify-center gap-6 p-12 md:p-24">
          <h1 className="text-center text-6xl font-bold leading-tight text-primary md:text-7xl lg:leading-tight">
            {siteConfig.siteTitle}
          </h1>
          <p className="max-w-screen-md text-center text-lg !leading-normal text-muted-foreground md:text-xl">
            {siteConfig.siteDescription}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Link
              to={AuthLoginRoute.fullPath}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Get Started
            </Link>
            <Link
              to={
                isAuthenticated
                  ? DashboardRoute.fullPath
                  : AuthLoginRoute.fullPath
              }
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "dark:bg-secondary dark:hover:opacity-80",
              )}
            >
              {isAuthenticated ? "Dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative shadow */}
      <div className="base-grid fixed h-screen w-screen opacity-40" />
      <div className="fixed bottom-0 h-screen w-screen bg-gradient-to-t from-[hsl(var(--card))] to-transparent" />
      <img
        src={ShadowPNG}
        alt=""
        className="fixed bottom-0 z-10 h-auto w-full opacity-80"
      />
    </div>
  );
}
