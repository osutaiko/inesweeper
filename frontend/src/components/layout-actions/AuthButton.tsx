import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  checkNicknameAvailability,
  NICKNAME_PATTERN,
  updateNickname,
  type AuthUser,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { UserCircle2 } from "lucide-react";

type AuthButtonProps = {
  authUser: AuthUser | null;
};

const AuthButton = ({ authUser }: AuthButtonProps) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [nickname, setNickname] = useState(authUser?.name ?? "");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [isNicknameDialogOpen, setIsNicknameDialogOpen] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(authUser?.name ?? "");
  }, [authUser?.name]);

  if (authUser) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="overflow-hidden rounded-full"
              title={nickname}
            >
              {authUser.avatarUrl ? (
                <img
                  src={authUser.avatarUrl}
                  alt={nickname}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle2 />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <p className="truncate text-sm font-medium leading-none">
                {nickname}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {authUser.email ?? "with Google"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setNicknameDraft(nickname);
                setIsNicknameDialogOpen(true);
              }}
            >
              Edit nickname
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          open={isNicknameDialogOpen}
          onOpenChange={setIsNicknameDialogOpen}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit nickname</DialogTitle>
              <DialogDescription>
                This nickname will be shown public.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setIsSavingNickname(true);
                setNicknameError(null);

                void checkNicknameAvailability(nicknameDraft)
                  .then(({ available }) => {
                    if (!available) {
                      throw new Error("Nickname is already taken.");
                    }

                    return updateNickname(nicknameDraft);
                  })
                  .then(({ nickname: updatedNickname }) => {
                    setNickname(updatedNickname);
                    setIsNicknameDialogOpen(false);
                  })
                  .catch((error: unknown) => {
                    setNicknameError(
                      error instanceof Error
                        ? error.message
                        : "Unable to update nickname",
                    );
                  })
                  .finally(() => {
                    setIsSavingNickname(false);
                  });
              }}
            >
              <div className="grid gap-2">
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  maxLength={32}
                  onChange={(event) => {
                    setNicknameDraft(event.target.value);
                    setNicknameError(null);
                  }}
                  spellCheck={false}
                  value={nicknameDraft}
                />
                <p className="min-h-4 text-xs text-destructive">
                  {nicknameError
                    ? nicknameError
                    : !NICKNAME_PATTERN.test(nicknameDraft)
                      ? "Nickname must be of length 3-32 and use lowercase letters, numbers, or underscores (_)."
                      : null}
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={
                    isSavingNickname ||
                    !NICKNAME_PATTERN.test(nicknameDraft) ||
                    nicknameDraft === nickname
                  }
                  type="submit"
                >
                  {isSavingNickname ? <Spinner /> : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      disabled={isLoggingIn}
      onClick={async () => {
        setIsLoggingIn(true);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error || !data.url) {
          setIsLoggingIn(false);
          return;
        }

        window.location.assign(data.url);
      }}
    >
      {isLoggingIn ? <Spinner /> : "Log In"}
    </Button>
  );
};

export default AuthButton;
