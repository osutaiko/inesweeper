import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { getGoogleLoginUrl, getLogoutUrl } from "@/lib/auth";
import { UserCircle2 } from "lucide-react";

type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

type AuthButtonProps = {
  authUser: AuthUser | null;
};

const AuthButton = ({ authUser }: AuthButtonProps) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

if (authUser) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="overflow-hidden rounded-full"
          title={authUser.name}
        >
          {authUser.avatarUrl ? (
            <img src={authUser.avatarUrl} alt={authUser.name} className="h-full w-full object-cover" />
          ) : (
            <UserCircle2 />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <p className="truncate text-sm font-medium leading-none">
            {authUser.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {authUser.email ?? "with Google"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            window.location.assign(getLogoutUrl());
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

  return (
      <Button
        disabled={isLoggingIn}
        onClick={() => {
          setIsLoggingIn(true);
          window.location.assign(getGoogleLoginUrl());
        }}
      >
        {isLoggingIn ? <Spinner /> : "Log In"}
      </Button>
  );
};

export default AuthButton;
