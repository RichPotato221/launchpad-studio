import { Link } from "@tanstack/react-router";

interface Props {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  departmentName?: string | null;
  size?: "sm" | "md";
}

export function MemberAvatarLink({ userId, fullName, avatarUrl, departmentName, size = "sm" }: Props) {
  const dimension = size === "md" ? "h-12 w-12" : "h-8 w-8";
  const initial = (fullName || "?").trim().charAt(0).toUpperCase();

  return (
    <Link to="/members/$id" params={{ id: userId }} className="flex items-center gap-2 group">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={fullName}
          className={`${dimension} rounded-full object-cover border border-border`}
        />
      ) : (
        <div className={`${dimension} rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border`}>
          {initial}
        </div>
      )}
      <div className="leading-tight">
        <p className="text-sm font-medium group-hover:underline">{fullName}</p>
        {departmentName && (
          <p className="text-xs text-muted-foreground">{departmentName}</p>
        )}
      </div>
    </Link>
  );
}
