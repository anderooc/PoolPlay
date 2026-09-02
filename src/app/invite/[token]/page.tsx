/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentAuthProfile } from "@/lib/auth";
import { loadMemberInviteByToken } from "@/lib/invites/member-invites";
import { AcceptInviteButton } from "./accept-invite-button";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await loadMemberInviteByToken(token);
  if (!invite) notFound();

  const authProfile = await getCurrentAuthProfile();
  const targetName = invite.schoolName ?? invite.teamName ?? "brackt";
  const targetKind = invite.schoolId ? "school" : "team";
  const expired =
    invite.status !== "pending" || invite.expiresAt.getTime() < Date.now();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={authProfile} />
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join {targetName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expired ? (
              <p className="text-sm text-muted-foreground">
                This invite is no longer active. Ask the {targetKind} officer to
                send a new one.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You were invited to join{" "}
                  <span className="font-medium text-foreground">{targetName}</span>{" "}
                  as <span className="font-medium text-foreground">{invite.email}</span>.
                </p>
                {authProfile ? (
                  <AcceptInviteButton token={token} />
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                      className={buttonVariants({ className: "flex-1" })}
                    >
                      Sign in
                    </Link>
                    <Link
                      href={`/signup?email=${encodeURIComponent(invite.email)}&invite=${encodeURIComponent(token)}`}
                      className={buttonVariants({
                        variant: "outline",
                        className: "flex-1",
                      })}
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
