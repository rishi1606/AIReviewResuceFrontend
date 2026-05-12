import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const KPICard = ({ title, value, icon: Icon, trend, color, onClick }) => {
  const colorClasses = {
    indigo: "bg-[#EEF2FF] text-[#4F46E5] border-[#E0E7FF]",
    red: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]",
    green: "bg-[#F0FDF4] text-[#10B981] border-[#DCFCE7]",
    amber: "bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]",
  };

  return (
    <div 
      onClick={onClick}
      className={`glass-card p-6 border cursor-pointer hover:scale-[1.02] transition-all ${colorClasses[color] || colorClasses.indigo}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-white shadow-sm border border-slate-100`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-slate-900">{value}</h3>
      </div>
    </div>
  );
};

export default KPICard;
