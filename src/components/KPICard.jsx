import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const KPICard = ({ title, value, icon: Icon, trend, color = "indigo", onClick }) => {
  const iconThemeClass = `sh-kpi-icon-${color}`;

  return (
    <div
      onClick={onClick}
      className={`sh-kpi-card ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="sh-kpi-card-header">
        <div className={`sh-kpi-icon-wrapper ${iconThemeClass}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`sh-kpi-trend ${trend > 0 ? "sh-kpi-trend-up" : "sh-kpi-trend-down"}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <span className="sh-kpi-title">{title}</span>
        <h3 className="sh-kpi-value">{value}</h3>
      </div>
    </div>
  );
};

export default KPICard;
