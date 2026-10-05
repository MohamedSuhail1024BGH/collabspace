import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";

type TeamMemberProps = {
  member: {
    name: string;
    role: string;
    color?: string;
    avatar?: string | null;
  };
};

export function TeamMember({ member }: TeamMemberProps) {
  const roleDisplay =
    member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Member";

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        <UserAvatar
          avatar={member.avatar}
          name={member.name}
          size="sm"
          showStatus
          statusColor="bg-emerald-500"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {member.name}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {member.role === "owner" ? "Workspace Owner" : member.role === "admin" ? "Administrator" : "Team Member"}
          </span>
        </div>
      </div>

      <Badge variant="outline" className="text-[10px] font-mono capitalize shrink-0">
        {roleDisplay}
      </Badge>
    </div>
  );
}
