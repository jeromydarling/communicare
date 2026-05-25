// Phone + browser device frames for the screencast scenes. Ported and
// scaled up from components/screenshots.tsx so the video matches what
// visitors already see on the landing page.

import React from "react";
import { palette, fonts } from "../brand/tokens";

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  rotate?: number;
}> = ({ children, width = 480, rotate = 0 }) => {
  return (
    <div
      style={{
        width,
        aspectRatio: "9 / 19.5",
        position: "relative",
        transform: `rotate(${rotate}deg)`,
        filter: "drop-shadow(0 60px 80px rgba(26,20,16,0.35))",
      }}
    >
      {/* Outer chassis */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.soil,
          borderRadius: width * 0.16,
          padding: width * 0.026,
          boxShadow: `inset 0 0 0 ${width * 0.012}px rgba(255,255,255,0.06)`,
        }}
      >
        {/* Screen */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: palette.parchment,
            borderRadius: width * 0.135,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Notch */}
          <div
            style={{
              position: "absolute",
              top: width * 0.022,
              left: "50%",
              transform: "translateX(-50%)",
              width: width * 0.32,
              height: width * 0.06,
              background: palette.soil,
              borderRadius: 999,
              zIndex: 20,
            }}
          />
          {/* Status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `${width * 0.04}px ${width * 0.07}px ${width * 0.015}px`,
              fontFamily: fonts.display,
              fontSize: width * 0.04,
              color: palette.soil,
              zIndex: 10,
            }}
          >
            <span style={{ fontWeight: 500 }}>9:41</span>
            <span style={{ letterSpacing: 2 }}>●●●●</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
        </div>
      </div>
      {/* Side buttons */}
      <div
        style={{
          position: "absolute",
          left: -2,
          top: width * 0.4,
          width: 3,
          height: width * 0.18,
          background: palette.soil,
          borderRadius: "2px 0 0 2px",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -2,
          top: width * 0.55,
          width: 3,
          height: width * 0.28,
          background: palette.soil,
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
};

export const BrowserFrame: React.FC<{
  url: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ url, children, width = 1100, height = 720 }) => {
  return (
    <div
      style={{
        width,
        height,
        background: palette.parchment,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow:
          "0 60px 80px -20px rgba(26,20,16,0.4), 0 0 0 1px rgba(26,20,16,0.06)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: palette.cream,
          borderBottom: `1px solid ${palette.outlineSoft}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: `${palette.brick}80`,
            }}
          />
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: `${palette.wheat}AA`,
            }}
          />
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: 999,
              background: `${palette.moss}90`,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: `${palette.soil}99`,
            marginLeft: 8,
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", color: palette.soil }}>
        {children}
      </div>
    </div>
  );
};

// A finger / tap-indicator that drops onto a UI element at a specific frame.
// Use for "she taps Mark sold out" moments.
export const TapPulse: React.FC<{
  x: number;
  y: number;
  appearAt: number;
  size?: number;
}> = ({ x, y, appearAt, size = 64 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
      data-appear-at={appearAt}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          border: `2px solid ${palette.brick}`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: 999,
          background: palette.brick,
          opacity: 0.18,
        }}
      />
    </div>
  );
};
