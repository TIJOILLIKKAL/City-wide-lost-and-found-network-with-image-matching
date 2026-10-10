interface MatchScoreBadgeProps {
  score: number; // 0–1
  size?: "sm" | "lg";
}

function scoreStyle(score: number) {
  if (score >= 0.8) return { ring: "border-green-400 bg-green-50", text: "text-green-700", label: "Excellent" };
  if (score >= 0.6) return { ring: "border-amber-400 bg-amber-50", text: "text-amber-700", label: "Good" };
  if (score >= 0.4) return { ring: "border-orange-400 bg-orange-50", text: "text-orange-700", label: "Possible" };
  return { ring: "border-muted bg-muted", text: "text-muted-foreground", label: "Weak" };
}

export function MatchScoreBadge({ score, size = "sm" }: MatchScoreBadgeProps) {
  const pct = Math.round(score * 100);
  const { ring, text, label } = scoreStyle(score);

  if (size === "lg") {
    return (
      <div className={`flex flex-col items-center rounded-xl border-2 px-4 py-2 ${ring}`}>
        <span className={`text-3xl font-bold leading-none ${text}`}>{pct}%</span>
        <span className={`text-xs font-medium mt-0.5 ${text}`}>{label} match</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center rounded-lg border px-2 py-1 ${ring}`}>
      <span className={`text-base font-bold leading-none ${text}`}>{pct}%</span>
      <span className={`text-[10px] font-medium ${text}`}>match</span>
    </div>
  );
}
