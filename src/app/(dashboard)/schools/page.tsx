/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Plus } from "lucide-react";
import { getUserSchoolSummary } from "@/lib/schools/navigation";
import { countSchools } from "@/lib/schools/search";
import { pageMetadata } from "@/lib/metadata";
import { SchoolSearchGrid } from "./school-search-grid";

export const metadata = pageMetadata("Find schools");

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [mySchool, schoolCount] = await Promise.all([
    getUserSchoolSummary(user.id),
    countSchools(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find schools"
        description={
          mySchool
            ? "Browse other collegiate club programs on PoolPlay."
            : "Find your program below. A school president or officer must add you to their roster using your signup email — or create a new school if you're starting a program."
        }
        actions={
          mySchool ? (
            <Link
              href={`/schools/${mySchool.slug}`}
              className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
            >
              Your school · {mySchool.name}
            </Link>
          ) : (
            <Link
              href="/schools/new"
              className={buttonVariants({ className: "w-full sm:w-auto" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              New school
            </Link>
          )
        }
      />

      <SchoolSearchGrid hasSchools={schoolCount > 0} />
    </div>
  );
}
