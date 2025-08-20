import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectFilter } from "@/types";

interface Props {
  value: ProjectFilter;
  onChange: (v: ProjectFilter) => void;
}

export default function StatusToggle({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="项目状态切换" className="inline-flex rounded-lg border bg-background p-1 shadow-sm">
      {([
        { key: "all", label: "所有项目" },
        { key: "active", label: "未结束项目" },
        { key: "completed", label: "已结束项目" },
      ] as const).map((opt) => (
        <Button
          key={opt.key}
          role="tab"
          aria-selected={value === opt.key}
          variant={value === opt.key ? "default" : "ghost"}
          onClick={() => onChange(opt.key)}
          className={cn("rounded-md", value === opt.key ? "" : "text-muted-foreground")}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
