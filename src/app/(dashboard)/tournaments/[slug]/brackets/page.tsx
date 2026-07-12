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

import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Pool play and brackets now live on the main tournament page as tabs. Keep
 * this route around so old links and bookmarks still land somewhere useful.
 */
export default async function BracketsPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/tournaments/${slug}`);
}
