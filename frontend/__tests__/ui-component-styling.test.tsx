import React from "react";
(globalThis as unknown as { React: typeof React }).React = React;

import test, { describe, it } from "node:test";
import assert from "node:assert";
import { renderToString } from "react-dom/server";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StudioPreview } from "../components/custom/landing/studioPreview";
import { FeatureBento } from "../components/custom/landing/featureBento";
import { TechnicalFaq } from "../components/custom/landing/technicalFaq";

describe("UI Component Styling & Craft Standards", () => {
  describe("1. Button Component Variants, Sizes & Focus Rings", () => {
    it("renders default primary variant with berry styling and rounded-xl", () => {
      const html = renderToString(React.createElement(Button, null, "Launch"));
      assert.match(html, /bg-primary/);
      assert.match(html, /text-primary-foreground/);
      assert.match(html, /rounded-xl/);
      assert.match(html, /focus-visible:ring-ring\/50/);
    });

    it("renders all visual variants conforming to design tokens", () => {
      // Secondary
      const secondaryHtml = renderToString(
        React.createElement(Button, { variant: "secondary" }, "Secondary Action")
      );
      assert.match(secondaryHtml, /bg-secondary/);
      assert.match(secondaryHtml, /text-secondary-foreground/);

      // Destructive
      const destructiveHtml = renderToString(
        React.createElement(Button, { variant: "destructive" }, "Leave Room")
      );
      assert.match(destructiveHtml, /bg-destructive/);
      assert.match(destructiveHtml, /focus-visible:ring-destructive\/20/);

      // Outline
      const outlineHtml = renderToString(
        React.createElement(Button, { variant: "outline" }, "Outline")
      );
      assert.match(outlineHtml, /border\b/);
      assert.match(outlineHtml, /hover:bg-accent/);

      // Ghost
      const ghostHtml = renderToString(
        React.createElement(Button, { variant: "ghost" }, "Ghost")
      );
      assert.match(ghostHtml, /hover:bg-accent/);

      // Link
      const linkHtml = renderToString(
        React.createElement(Button, { variant: "link" }, "Link")
      );
      assert.match(linkHtml, /underline-offset-4/);
    });

    it("renders button sizing scale with consistent height tokens", () => {
      // Default (h-9)
      const defaultHtml = renderToString(React.createElement(Button, { size: "default" }, "Default"));
      assert.match(defaultHtml, /h-9/);

      // Small (h-9, rounded-lg)
      const smHtml = renderToString(React.createElement(Button, { size: "sm" }, "Small"));
      assert.match(smHtml, /h-9/);
      assert.match(smHtml, /rounded-lg/);

      // Large (h-11, rounded-xl)
      const lgHtml = renderToString(React.createElement(Button, { size: "lg" }, "Large"));
      assert.match(lgHtml, /h-11/);
      assert.match(lgHtml, /rounded-xl/);

      // Icon (size-9)
      const iconHtml = renderToString(React.createElement(Button, { size: "icon" }, "★"));
      assert.match(iconHtml, /size-9/);
    });

    it("renders disabled state styling correctly", () => {
      const disabledHtml = renderToString(
        React.createElement(Button, { disabled: true }, "Disabled")
      );
      assert.match(disabledHtml, /disabled:pointer-events-none/);
      assert.match(disabledHtml, /disabled:opacity-50/);
    });
  });

  describe("2. Input Component Styling & Focus States", () => {
    it("renders input with base styling, h-11 touch target, and rounded-xl", () => {
      const html = renderToString(
        React.createElement(Input, { placeholder: "Enter name", type: "text" })
      );
      assert.match(html, /data-slot="input"/);
      assert.match(html, /flex\s+h-11\s+w-full/);
      assert.match(html, /rounded-xl/);
      assert.match(html, /border-input/);
      assert.match(html, /bg-background/);
      assert.match(html, /placeholder:text-muted-foreground/);
    });

    it("includes focus ring and invalid ring styling", () => {
      const html = renderToString(
        React.createElement(Input, { type: "text" })
      );
      assert.match(html, /focus-visible:border-ring/);
      assert.match(html, /focus-visible:ring-ring\/50/);
      assert.match(html, /focus-visible:ring-\[3px\]/);
      assert.match(html, /aria-invalid:border-destructive/);
    });
  });

  describe("3. StudioPreview Component Visual Craft", () => {
    it("renders studio header with live status dot and mock room id", () => {
      const html = renderToString(React.createElement(StudioPreview));
      // Live pulsing green dot
      assert.match(html, /bg-emerald-400/);
      assert.match(html, /bg-emerald-500/);
      assert.match(html, /pocket-8f1e3c2b/);
      // Copy invite action button
      assert.match(html, /Copy invite/i);
    });

    it("renders participant tiles with audio ripples and identities", () => {
      const html = renderToString(React.createElement(StudioPreview));
      assert.match(html, /Maya/);
      assert.match(html, /Host/);
      assert.match(html, /Alex/);
      assert.match(html, /You/);
      // Audio level meters
      assert.match(html, /bg-emerald-500/);
    });

    it("renders 30 KiB chunk streaming simulation interactive element", () => {
      const html = renderToString(React.createElement(StudioPreview));
      assert.match(html, /brand-assets-v2\.zip/i);
      assert.match(html, /Simulate Download/i);
      assert.match(html, /WebRTC DataChannel \(30 KiB chunks\)/i);
    });
  });

  describe("4. FeatureBento Component 4 Asymmetric Cards", () => {
    it("renders 4 asymmetric cards with exact architectural pillars", () => {
      const html = renderToString(React.createElement(FeatureBento));

      // Card 01: Zero Footprint
      assert.match(html, /01 \/ Zero Footprint/);
      assert.match(html, /Temporary rooms that vanish when you leave/);
      assert.match(html, /Auto-dissolving/);
      assert.match(html, /Database rows/);

      // Card 02: Doorbell Admission
      assert.match(html, /02 \/ Doorbell/);
      assert.match(html, /Host holds the room key/);
      assert.match(html, /Alex is knocking/);
      assert.match(html, /Admit/);
      assert.match(html, /Decline/);

      // Card 03: Drop Circle P2P Transfers
      assert.match(html, /03 \/ Drop Circle/);
      assert.match(html, /Chunked 30 KiB WebRTC slices/);
      assert.match(html, /30 KiB/);
      assert.match(html, /RTCDataChannel/);

      // Card 04: Mesh Network & Honest Boundaries
      assert.match(html, /04 \/ Full Mesh Clarity/);
      assert.match(html, /Up to 6 participants\. No media routers in between\./);
      assert.match(html, /Mesh Topology Matrix/);
      assert.match(html, /Connections = N × \(N - 1\) \/ 2 = 15 channels/);
      assert.match(html, /P1/);
      assert.match(html, /P6/);
    });

    it("enforces asymmetric grid column spans (7 and 5)", () => {
      const html = renderToString(React.createElement(FeatureBento));
      assert.match(html, /md:col-span-7/);
      assert.match(html, /md:col-span-5/);
    });
  });

  describe("5. TechnicalFaq Component Grounded Specifications", () => {
    it("renders accordion with all 5 engineering specifications", () => {
      const html = renderToString(React.createElement(TechnicalFaq));

      // Spec 1: DTLS/SRTP Encryption (Active by default, answer visible)
      assert.match(html, /How does privacy and encryption work in Pockets\?/);
      assert.match(html, /DTLS/);
      assert.match(html, /SRTP/);

      // Spec 2: 6-Person Pure Mesh
      assert.match(html, /Why is room capacity capped at six participants\?/);

      // Spec 3: Drop Circle 30 KiB Memory Streaming
      assert.match(html, /Are files uploaded or stored on Pockets servers\?/);

      // Spec 4: STUN / TURN relays
      assert.match(html, /What happens behind strict corporate firewalls and symmetric NATs\?/);

      // Spec 5: Zero Installation
      assert.match(html, /Do I or my guests need to install an app or create an account\?/);

      // Categories
      assert.match(html, /Security/);
      assert.match(html, /Architecture/);
      assert.match(html, /Drop Circle/);
      assert.match(html, /Networking/);
      assert.match(html, /Platform/);
    });

    it("renders accessible accordion markup (aria-expanded, aria-controls, aria-labelledby)", () => {
      const html = renderToString(React.createElement(TechnicalFaq));
      assert.match(html, /aria-labelledby="faq-title"/);
      assert.match(html, /aria-expanded="true"/);
      assert.match(html, /aria-controls="faq-answer-encryption"/);
      assert.match(html, /id="faq-question-encryption"/);
    });
  });
});
