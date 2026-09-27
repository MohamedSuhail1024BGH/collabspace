type TeamMemberProps = {
  member: {
    name: string;
    role: string;
    color: string;
  };
};

export function TeamMember({ member }: TeamMemberProps) {
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex items-center justify-between gap-2.5 p-1.5 sm:p-2 rounded-lg hover:bg-surface-container transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              member.color || "bg-primary"
            } text-[10px] font-bold text-white shadow-xs ring-1 ring-surface-container-lowest`}
          >
            {initials}
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-secondary ring-1.5 ring-surface-container-low" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-on-surface truncate group-hover:text-primary transition-colors">
            {member.name}
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant truncate">
            {member.role === "owner" ? "Workspace Owner" : member.role === "admin" ? "Administrator" : "Team Member"}
          </span>
        </div>
      </div>

      <span className="shrink-0 px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-on-surface-variant/80 border border-outline-variant/15 capitalize">
        {member.role}
      </span>
    </div>
  );
}
