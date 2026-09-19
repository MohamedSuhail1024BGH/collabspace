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
    <div className="flex items-center gap-3 rounded bg-surface-container-low border border-outline/20 p-2.5 hover:bg-surface-container transition-all">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${member.color} text-xs font-bold text-white shrink-0`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-on-surface truncate">{member.name}</p>
        <p className="text-[11px] text-on-surface-variant truncate">{member.role}</p>
      </div>
    </div>
  );
}
