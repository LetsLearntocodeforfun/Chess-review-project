"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Crown,
  Upload,
  BarChart3,
  BookOpen,
  TrendingUp,
  LogIn,
  LogOut,
  User,
  Compass,
  Zap,
  Search,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/games", label: "Games", icon: Crown },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/explorer", label: "Explorer", icon: Compass },
  { href: "/puzzles", label: "Puzzles", icon: Zap },
  { href: "/repertoire", label: "Repertoire", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/reports", label: "Reports", icon: TrendingUp },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span>ChessLens</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {session.user?.name || "Player"}
              </span>
              <Link
                href="/settings"
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
