import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="public-page flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl border-y border-[#d9d6cd] py-16 text-center">
        <p className="homepage-eyebrow justify-center">Error 404</p>
        <h1 className="homepage-title mx-auto mt-5">This route ends here.</h1>
        <p className="homepage-copy mx-auto mt-5">The page may have moved, or the address is incomplete.</p>
        <Link to="/" className="public-button mt-8">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
