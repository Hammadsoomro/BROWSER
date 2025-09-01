import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1200px_800px_at_10%_10%,hsl(var(--brand-700)/.45),transparent_60%),radial-gradient(900px_700px_at_90%_20%,hsl(var(--brand-500)/.35),transparent_60%),linear-gradient(to_bottom_right,hsl(var(--background)),hsl(var(--background)))]">
      <div className="text-center rounded-2xl border border-white/10 bg-white/5 px-8 py-10 backdrop-blur-xl ring-1 ring-white/10">
        <h1 className="text-5xl font-extrabold tracking-tight">404</h1>
        <p className="mt-2 text-foreground/70">Page not found</p>
        <a href="/" className="mt-6 inline-block rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-2 text-sm font-medium text-white">
          Go Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
