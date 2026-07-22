/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import Link from "next/link";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentAuthProfile } from "@/lib/auth";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Privacy",
  "How PoolPlay collects, uses, and retains account and tournament data.",
  { canonical: "/privacy" }
);

export default async function PrivacyPage() {
  const user = await getCurrentAuthProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-14 sm:py-20">
          <header className="border-b pb-8">
            <h1 className="text-balance text-4xl font-bold tracking-tight">
              Privacy notice
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective July 21, 2026
            </p>
            <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-foreground/90">
              This notice describes the data PoolPlay currently handles. The
              service does not use advertising trackers or sell personal data.
            </p>
          </header>

          <div className="mt-10 space-y-9 text-pretty leading-relaxed text-foreground/90">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Data we collect
              </h2>
              <p>
                Account data includes your email address, name, optional school,
                profile fields, and authentication records. Activity data can
                include school and team memberships, tournament registrations,
                waiver acknowledgments, payment-status submissions, tournament
                emails, chat messages, schedules, scores, and records you create
                while organizing an event.
              </p>
              <p>
                Basic technical logs may include IP address, browser details,
                request timing, and error information needed to secure and
                operate the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                How data is used
              </h2>
              <p>
                PoolPlay uses this data to provide accounts, run tournament
                workflows, publish tournament information, deliver requested
                emails, prevent abuse, troubleshoot failures, and protect the
                service. Public tournament pages can show team names, schedules,
                results, and other information organizers choose to publish.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Service providers
              </h2>
              <p>
                PoolPlay relies on Supabase for authentication, database,
                storage, and realtime updates; Resend for tournament email; and
                the deployment provider for hosting and operational logs. These
                providers process data only as needed to deliver their services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Cookies and local storage
              </h2>
              <p>
                The app uses strictly necessary authentication cookies and local
                browser storage for preferences such as theme. PoolPlay does not
                currently use analytics, advertising, or cross-site tracking
                cookies, so there is no optional-cookie consent banner.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Retention and deletion
              </h2>
              <p>
                Data is kept while your account is active and as needed to
                operate tournament records. You can delete your account from
                Profile settings. This removes your login, profile details,
                memberships, and chat messages. Tournament schedules and results
                you organized are retained with an anonymous organizer so other
                participants do not lose event history.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Your choices
              </h2>
              <p>
                You can edit profile data, control optional public profile
                fields, or delete your account. For a privacy request that cannot
                be completed in the app, contact the PoolPlay operator who
                provided your access. Do not post personal information in a
                public support issue.
              </p>
              <p>
                See the <Link className="underline" href="/terms">terms of use</Link>{" "}
                for service rules and organizer responsibilities.
              </p>
            </section>
          </div>
        </article>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
