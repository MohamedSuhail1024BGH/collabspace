import { UserAvatar } from "@/components/ui/UserAvatar";

type TeamMemberProps = {
  member: {
    name: string;
    role: string;
    color?: string;
    avatar?: string | null;
  };
};

export function TeamMember({ member }: TeamMemberProps) {
  return (
    <div className="flex items-center justify-between gap-2.5 p-1.5 sm:p-2 rounded-lg hover:bg-surface-container transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        <UserAvatar
          avatar={member.avatar}
          name={member.name}
          size="sm"
          showStatus
          statusColor="bg-secondary"
        />
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
