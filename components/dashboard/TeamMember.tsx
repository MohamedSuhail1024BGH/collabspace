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
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${member.color} text-xs font-semibold text-white`}
      >
        {initials}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{member.name}</p>
        <p className="text-xs text-slate-400">{member.role}</p>
      </div>
    </div>
  );
}
