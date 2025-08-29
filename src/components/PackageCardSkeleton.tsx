export const PackageCardSkeleton = () => (
  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-lg shadow-slate-200/20">
    <div className="flex items-start gap-5">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-2xl animate-pulse"></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-3">
          <div className="h-7 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-32 animate-pulse"></div>
          <div className="w-24 h-10 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-5 bg-slate-200 rounded-lg mb-2 w-full animate-pulse"></div>
        <div className="h-5 bg-slate-200 rounded-lg mb-4 w-3/4 animate-pulse"></div>
        <div className="flex gap-3">
          <div className="h-8 w-20 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-8 w-24 bg-green-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);
