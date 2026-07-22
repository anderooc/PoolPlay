/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { ImageResponse } from "next/og";

export const alt = "ShootSet — collegiate club volleyball tournament hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#f7f9fc",
        color: "#152238",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 76,
          fontWeight: 800,
        }}
      >
        <span style={{ color: "#c92f45" }}>Shoot</span>
        <span style={{ color: "#315ca8" }}>Set</span>
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: "900px",
          marginTop: "34px",
          fontSize: 42,
          lineHeight: 1.25,
          fontWeight: 600,
        }}
      >
        Run collegiate club volleyball tournaments from registration to finals.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "54px",
          fontSize: 24,
          color: "#52627a",
        }}
      >
        Teams · pools · brackets · courts · live scoring
      </div>
    </div>,
    size
  );
}
