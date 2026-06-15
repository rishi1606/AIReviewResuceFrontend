import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "ReviewRescue — Page Not Found";
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        {/* <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
            <ShieldCheck size={22} />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-orange-500">Review</span>
            <span className="text-zinc-800">Rescue</span>
          </span>
        </div> */}

        {/* 404 Number */}
        <h1
          className="text-[120px] font-bold leading-none text-transparent bg-clip-text select-none"
          style={{
            backgroundImage: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)",
          }}
        >
          404
        </h1>

        {/* Message */}
        <h2 className="text-xl font-bold text-zinc-900 mt-2 mb-2">Page not found</h2>
        <p className="text-[14px] text-zinc-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft size={15} />
            Go back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors cursor-pointer shadow-md shadow-orange-500/20"
          >
            <Home size={15} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
