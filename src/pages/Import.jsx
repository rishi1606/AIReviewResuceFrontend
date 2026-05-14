import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { parseCSV, generateCSVTemplate } from "../utils/csvParser";
import {
  importReviews,
  deleteAllReviews,
  scrapeGoogle,
  scrapeBooking,
} from "../api/apiClient";
import { classifyAllPending } from "../utils/aiClassifier";
import { useAuth } from "../context/AuthContext";
import {
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  Trash2,
  ChevronRight,
  ShieldAlert,
  BarChart3,
  PartyPopper,
  Globe,
  RefreshCw,
  Zap,
  CloudUpload,
  Search,
  Cloud
} from "lucide-react";


const Import = () => {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: "" });
  const [summary, setSummary] = useState(null);
  const { state, dispatch } = useAppContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scrape");
  const [urls, setUrls] = useState({
    Google: "",
    TripAdvisor: "",
    "Booking.com": "",
    "Hotels.com": "",
    Yelp: "",
    Expedia: ""
  });
  const [scrapingStatus, setScrapingStatus] = useState({}); // { [platform]: 'idle' | 'loading' | 'done' | 'error' }

  useEffect(() => {
    // Polling disabled as requested
  }, []);

  const handleScrape = async (platform) => {
    if (platform !== "Booking.com" && platform !== "Google") {
      return alert(`${platform} scraping is not implemented yet.`);
    }

    if (!urls[platform]) return alert(`Please provide a URL for ${platform}.`);

    setScrapingStatus(prev => ({ ...prev, [platform]: 'loading' }));

    try {
      if (platform === "Google") {
        const res = await scrapeGoogle(urls[platform]);
        if (res.success && res.reviews) {
          setScrapingStatus(prev => ({ ...prev, [platform]: 'done' }));

          const mappedReviews = res.reviews.map((r, idx) => ({
            review_id: `google_${Date.now()}_${idx}`,
            reviewer_name: r.reviewerName || "Anonymous",
            rating: r.rating || 5,
            review_date: r.reviewDate || "Recent",
            review_text: r.reviewText || "",
            platform: "Google",
            categoryRatings: r.categoryRatings,
            highlights: r.highlights
          }));

          setPreview({
            valid: mappedReviews,
            totalRows: mappedReviews.length,
            validCount: mappedReviews.length,
            duplicateCount: 0,
            errorCount: 0,
            errors: []
          });
        } else if (res.success) {
          // Fallback if success but no reviews (Step 1 only mode)
          setScrapingStatus(prev => ({ ...prev, [platform]: 'done' }));
          // alert("Browser opened! Please follow the steps in the automated window.");
        }
      } else {
        const res = await scrapeBooking(urls[platform]);
        if (res.success && res.reviews) {
          setScrapingStatus(prev => ({ ...prev, [platform]: 'done' }));

          const mappedReviews = res.reviews.map((r, idx) => ({
            review_id: `booking_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            reviewer_name: r.reviewerName || "Anonymous",
            rating: r.rating ? Number((r.rating / 2).toFixed(1)) : 5, // Normalize 10-star to 5-star
            review_date: r.reviewDate || "Recent",
            review_text: r.reviewText || "",
            platform: "Booking.com",
            metadata: {
              original_rating: r.rating,
              country: r.country,
              roomType: r.roomType,
              stayDuration: r.stayDuration,
              stayDate: r.stayDate,
              travelerType: r.travelerType
            }
          }));

          setPreview({
            valid: mappedReviews,
            totalRows: mappedReviews.length,
            validCount: mappedReviews.length,
            duplicateCount: 0,
            errorCount: 0,
            errors: []
          });
        } else if (res.success) {
          setScrapingStatus(prev => ({ ...prev, [platform]: 'done' }));
        }
      }
    } catch (err) {
      console.error(err);
      setScrapingStatus(prev => ({ ...prev, [platform]: 'error' }));
      // alert(`Scraping failed: ${err.message}`);
    }
  };

  const handleScrapeAll = async () => {
    const activePlatforms = Object.keys(urls).filter(p => urls[p] && (p === "Booking.com" || p === "Google"));
    // if (activePlatforms.length === 0) return alert("No supported platforms with URLs found.");

    for (const p of activePlatforms) {
      handleScrape(p);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setLoading(true);
      try {
        // We'll combine all files into one preview
        let allValid = [];
        let totalRows = 0;
        let validCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        let allErrors = [];

        for (const f of selectedFiles) {
          const result = await parseCSV(f, state.reviews);
          allValid = [...allValid, ...result.valid];
          totalRows += result.totalRows;
          validCount += result.validCount;
          duplicateCount += result.duplicateCount;
          errorCount += result.errorCount;
          allErrors = [...allErrors, ...result.errors];
        }

        setPreview({
          valid: allValid,
          totalRows,
          validCount,
          duplicateCount,
          errorCount,
          errors: allErrors
        });
      } catch (err) {
        console.error("Parse error: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) return;

    setLoading(true);
    setProgress({ current: 0, total: preview.valid.length, phase: "Uploading reviews..." });

    try {
      // 1. Upload to backend
      await importReviews(preview.valid);
      dispatch({ type: "IMPORT_REVIEWS", payload: preview.valid });

      // 2. Start AI Classification
      setProgress({ current: 0, total: preview.valid.length, phase: "AI Classification & Ticket Creation..." });

      const results = [];
      await classifyAllPending(
        preview.valid,
        (curr, tot) => setProgress({ current: curr, total: tot, phase: "Analysing reviews..." }),
        (action) => {
          if (action.type === "UPDATE_REVIEW_CLASSIFICATION") {
            results.push(action.payload);
          }
          dispatch(action);
        },
        currentUser,
        state.staff
      );

      // 3. Calculate summary
      const counts = {
        Positive: results.filter(r => r.sentiment === "Positive").length,
        Negative: results.filter(r => r.sentiment === "Negative").length,
        Mixed: results.filter(r => r.sentiment === "Mixed").length,
        Neutral: results.filter(r => r.sentiment === "Neutral").length,
        Tickets: results.filter(r => r.sentiment === "Negative" || r.sentiment === "Mixed" || r.urgency === "High").length
      };
      setSummary(counts);
    } catch (err) {
      console.error("Import failed: " + err.message);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, phase: "" });
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm("CRITICAL: This will delete ALL reviews and tickets for your hotel. This cannot be undone. Proceed?")) return;
    setLoading(true);
    try {
      await deleteAllReviews();
      window.location.reload(); // Refresh to clear state
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (summary) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-10 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper size={48} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900">Analysis Complete!</h1>
          <p className="text-slate-500 mt-2 text-lg">We analyzed {preview.validCount} reviews and found the following insights.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 border-b-4 border-green-500">
            <p className="text-sm font-bold text-slate-400 uppercase">Positive</p>
            <p className="text-3xl font-black text-green-600 mt-2">{summary.Positive}</p>
          </div>
          <div className="glass-card p-6 border-b-4 border-red-500">
            <p className="text-sm font-bold text-slate-400 uppercase">Negative</p>
            <p className="text-3xl font-black text-red-600 mt-2">{summary.Negative}</p>
          </div>
          <div className="glass-card p-6 border-b-4 border-amber-500">
            <p className="text-sm font-bold text-slate-400 uppercase">Mixed</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{summary.Mixed}</p>
          </div>
          <div className="glass-card p-6 border-b-4 border-blue-500">
            <p className="text-sm font-bold text-slate-400 uppercase">Tickets</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{summary.Tickets}</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center pt-8">
          <button onClick={() => navigate("/tickets")} className="btn-primary px-10 py-4 text-lg">View Generated Tickets</button>
          <button onClick={() => setSummary(null) || setPreview(null)} className="btn-secondary px-10 py-4 text-lg">Upload More</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Import reviews</h1>
          <p className="text-slate-500 font-medium">Pull in reviews from your connected platforms or upload a CSV</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClearDatabase}
            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm transition-all"
          >
            <Trash2 size={18} /> Clear Data
          </button>
          <button
            onClick={generateCSVTemplate}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} /> Download Template
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("scrape")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "scrape" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <CloudUpload size={18} /> Scrape platforms
        </button>
        <button
          onClick={() => setActiveTab("csv")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "csv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <FileText size={18} /> Upload CSV
        </button>
      </div>

      {!preview ? (
        activeTab === "scrape" ? (
          <div className="space-y-4">
            {["Google", "Booking.com", "TripAdvisor", "Hotels.com", "Yelp", "Expedia"].map(platform => {
              // Only show if active in settings (default to showing if no config yet for UX)
              const isActive = !state.hotelConfig?.platforms || state.hotelConfig.platforms.includes(platform);
              if (!isActive) return null;

              const platformDataMap = {
                Google: { placeholder: "https://g.page/your-business", help: "Paste your Google Business Profile URL", dot: "bg-blue-500" },
                TripAdvisor: { placeholder: "https://tripadvisor.com/Hotel_Review", help: "Paste your TripAdvisor property page URL", dot: "bg-emerald-500" },
                "Booking.com": { placeholder: "https://booking.com/hotel/...", help: "Paste your Booking.com property page URL", dot: "bg-blue-600" },
                "Hotels.com": { placeholder: "https://hotels.com/ho...", help: "Paste your Hotels.com property page URL", dot: "bg-red-500" },
                Yelp: { placeholder: "https://yelp.com/biz/...", help: "Paste your Yelp business page URL", dot: "bg-red-600" },
                Expedia: { placeholder: "https://expedia.com/...", help: "Paste your Expedia property page URL", dot: "bg-amber-500" }
              };

              const platformData = platformDataMap[platform];

              return (
                <div key={platform} className="glass-card p-6 bg-white border border-slate-100 group hover:border-indigo-200 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${platformData.dot} ${scrapingStatus[platform] === 'loading' ? 'animate-ping' : ''}`} />
                      <span className="font-bold text-slate-900">{platform}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${scrapingStatus[platform] === 'loading' ? 'text-indigo-600' :
                      scrapingStatus[platform] === 'done' ? 'text-green-600' :
                        'text-slate-300'
                      }`}>
                      {scrapingStatus[platform] === 'loading' ? 'Scraping...' : scrapingStatus[platform] === 'done' ? 'Complete' : 'Idle'}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={urls[platform] || ""}
                        onChange={(e) => setUrls({ ...urls, [platform]: e.target.value })}
                        placeholder={platformData.placeholder}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                      />
                      <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight">{platformData.help}</p>
                      <p className="text-[10px] text-slate-300 font-medium mt-1">
                        {scrapingStatus[platform] === 'done' ? 'Last scraped moments ago' : 'Not scraped yet'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleScrape(platform)}
                      disabled={scrapingStatus[platform] === 'loading'}
                      className="h-fit flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                      {scrapingStatus[platform] === 'loading' ? <Loader2 className="animate-spin" size={18} /> : <CloudUpload size={18} />}
                      {scrapingStatus[platform] === 'loading' ? 'Working...' : 'Scrape now'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* <button
              onClick={handleScrapeAll}
              className="w-fit flex items-center gap-2 px-8 py-4 border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all active:scale-95 mt-4"
            >
              <RefreshCw size={18} /> Scrape all platforms
            </button> */}

            {/* Recent Scrapes List */}
            <div className="mt-12 text-center p-12 bg-slate-50/50 rounded-[3rem] border border-slate-100">
              <Globe className="mx-auto mb-4 text-indigo-600/20" size={48} />
              <h3 className="text-xl font-black text-slate-900">Advanced Scraper UI</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">The platform is ready to connect with your chosen review sources. Enter your URLs above to preview how the integration works.</p>
            </div>
          </div>
        ) : (
          <div
            className="glass-card p-24 border-2 border-dashed border-slate-200 text-center hover:border-indigo-500 transition-all cursor-pointer group bg-white shadow-sm"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFiles = Array.from(e.dataTransfer.files);
              if (droppedFiles.length > 0) handleFileChange({ target: { files: droppedFiles } });
            }}
          >
            <input type="file" accept=".csv" multiple className="hidden" id="csv-input" onChange={handleFileChange} />
            <label htmlFor="csv-input" className="cursor-pointer">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
                <Upload size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Click or Drag Multiple CSVs</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Upload multiple review files at once. We'll handle duplicates automatically.</p>
            </label>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-6 text-center border-b-4 border-indigo-500 bg-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Rows</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{preview.totalRows}</p>
            </div>
            <div className="glass-card p-6 text-center border-b-4 border-green-500 bg-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Valid</p>
              <p className="text-3xl font-black text-green-600 mt-1">{preview.validCount}</p>
            </div>
            <div className="glass-card p-6 text-center border-b-4 border-amber-500 bg-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Duplicates</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{preview.duplicateCount}</p>
            </div>
            <div className="glass-card p-6 text-center border-b-4 border-red-500 bg-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Errors</p>
              <p className="text-3xl font-black text-red-600 mt-1">{preview.errorCount}</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden bg-white border border-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><TableIcon size={18} /> Review Preview</h3>
              <button onClick={() => setPreview(null)} className="text-red-500 text-xs font-bold hover:underline">CANCEL IMPORT</button>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-widest">ID</th>
                  <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Guest</th>
                  <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Rating</th>
                  <th className="px-6 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Text Excerpt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.valid.slice(0, 20).map(r => (
                  <tr key={r.review_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-400">{r.review_id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.reviewer_name}</td>
                    <td className="px-6 py-4 text-amber-500 font-bold">{r.rating} ★</td>
                    <td className="px-6 py-4 text-slate-500 italic truncate max-w-md">"{r.review_text}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl text-white shadow-2xl shadow-indigo-500/30">
            <div>
              <p className="font-black text-2xl">Ready to import {preview.validCount} reviews?</p>
              <p className="text-indigo-100 text-sm mt-1">Our AI will automatically categorize these and create tickets for your team.</p>
            </div>
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-10 py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> Start Import Now</>}
            </button>
          </div>
        </div>
      )}

      {loading && progress.total > 0 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-12 max-w-md w-full text-center space-y-8 shadow-2xl">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * (progress.current / progress.total))} className="text-indigo-600 transition-all duration-500" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-3xl text-slate-900">
                {Math.round((progress.current / progress.total) * 100)}%
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{progress.phase}</h3>
              <p className="text-slate-500 mt-2 font-medium">Processed {progress.current} of {progress.total} reviews</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Analyzing sentiments, identifying departments, and generating team tickets...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
