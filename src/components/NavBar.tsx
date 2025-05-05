
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const routes = [
  { name: "Dashboard", path: "/" },
  { name: "Templates", path: "/templates" },
  { name: "Jobs", path: "/jobs" },
  { name: "Generate", path: "/generate" },
  { name: "Account", path: "/account" },
];

export function NavBar() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <NavLink to="/" className="flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block text-xl brand-gradient">
              Carousel Gen
            </span>
          </NavLink>

          {isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <MenuIcon className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle className="brand-gradient">Carousel Gen</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                  {routes.map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      className={({ isActive }) =>
                        cn(
                          "text-lg font-medium transition-colors hover:text-primary",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )
                      }
                    >
                      {route.name}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            <NavigationMenu>
              <NavigationMenuList>
                {routes.map((route) => (
                  <NavigationMenuItem key={route.path}>
                    <NavLink to={route.path}>
                      {({ isActive }) => (
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            isActive && "bg-accent text-accent-foreground"
                          )}
                        >
                          {route.name}
                        </NavigationMenuLink>
                      )}
                    </NavLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
