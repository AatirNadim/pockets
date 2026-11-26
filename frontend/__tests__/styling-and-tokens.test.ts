import test, { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Design System & Styling Tokens", () => {
  const cssPath = path.resolve(__dirname, "../app/globals.css");
  const designMdPath = path.resolve(__dirname, "../../DESIGN.md");
  const globalsCss = fs.readFileSync(cssPath, "utf-8");
  const designDoc = fs.readFileSync(designMdPath, "utf-8");

  describe("1. Visual Contract & 60-30-10 Color System", () => {
    it("DESIGN.md specifies Warm Tactile Studio archetype and 60-30-10 palette", () => {
      assert.match(designDoc, /Warm Tactile Studio \+ Drop Circle/i);
      assert.match(designDoc, /60% Dominant Canvas/i);
      assert.match(designDoc, /30% Structural Hierarchy/i);
      assert.match(designDoc, /10% Intentional Accents/i);
    });

    it("verifies 60% dominant canvas tokens in globals.css", () => {
      // Light mode dominant canvas (#FFF8EC background, #FFFCF6 card)
      assert.match(globalsCss, /--color-stone-50:\s*#FFF8EC;/);
      assert.match(globalsCss, /--color-stone-100:\s*#FFFCF6;/);
      assert.match(globalsCss, /--background:\s*#FFF8EC;/);
      assert.match(globalsCss, /--card:\s*#FFFCF6;/);

      // Dark mode dominant canvas (#001735 background, #001F52 card)
      assert.match(globalsCss, /--color-stone-950:\s*#001735;/);
      assert.match(globalsCss, /--color-stone-900:\s*#001F52;/);
      assert.match(globalsCss, /\.dark\s*\{[\s\S]*?--background:\s*#001735;/);
      assert.match(globalsCss, /\.dark\s*\{[\s\S]*?--card:\s*#001F52;/);
    });

    it("verifies 30% structural text and hairline border tokens", () => {
      // Light mode structural elements
      assert.match(globalsCss, /--color-stone-200:\s*#F2E8D8;/);
      assert.match(globalsCss, /--color-stone-300:\s*#E1D3BD;/);
      assert.match(globalsCss, /--color-stone-600:\s*#555D6C;/);
      assert.match(globalsCss, /--border:\s*#E1D3BD;/);
      assert.match(globalsCss, /--muted-foreground:\s*#555D6C;/);

      // Dark mode structural elements
      assert.match(globalsCss, /--color-stone-700:\s*#30445D;/);
      assert.match(globalsCss, /--color-stone-800:\s*#163254;/);
      assert.match(globalsCss, /\.dark\s*\{[\s\S]*?--border:\s*#30445D;/);
      assert.match(globalsCss, /\.dark\s*\{[\s\S]*?--muted-foreground:\s*#E1D3BD;/);
    });

    it("verifies 10% intentional accent tokens", () => {
      // Interactive berry/magenta in light mode (#A10054)
      assert.match(globalsCss, /--primary:\s*#A10054;/);
      assert.match(globalsCss, /--color-amber-500:\s*#A10054;/);
      assert.match(globalsCss, /--color-amber-600:\s*#A10054;/);

      // Sunset coral in dark mode (#FF8D68)
      assert.match(globalsCss, /--color-amber-400:\s*#FF8D68;/);
      assert.match(globalsCss, /\.dark\s*\{[\s\S]*?--primary:\s*#FF8D68;/);
      assert.match(globalsCss, /\.dark\s*\{[\s\S]*?--ring:\s*#FF8D68;/);

      // Rose accent tokens
      assert.match(globalsCss, /--color-rose-600:\s*#A10054;/);
      assert.match(globalsCss, /--color-rose-400:\s*#D13778;/);
    });
  });

  describe("2. Radius and Scale Tokens", () => {
    it("defines base radius of 0.75rem (12px)", () => {
      assert.match(globalsCss, /--radius:\s*0\.75rem;/);
    });

    it("defines radius derivations matching the design scale", () => {
      assert.match(globalsCss, /--radius-sm:\s*calc\(var\(--radius\)\s*-\s*4px\);/);
      assert.match(globalsCss, /--radius-md:\s*calc\(var\(--radius\)\s*-\s*2px\);/);
      assert.match(globalsCss, /--radius-lg:\s*var\(--radius\);/);
      assert.match(globalsCss, /--radius-xl:\s*calc\(var\(--radius\)\s*\+\s*4px\);/);
    });
  });

  describe("3. Typography & Söhne Font Bindings", () => {
    it("binds --font-sohne to sans, heading, and ui tokens", () => {
      assert.match(globalsCss, /--font-sans:\s*var\(--font-sohne\)/);
      assert.match(globalsCss, /--font-heading:\s*var\(--font-sohne\)/);
      assert.match(globalsCss, /--font-ui:\s*var\(--font-sohne\)/);
    });

    it("applies font-family to body and headings with text-wrap pretty", () => {
      assert.match(globalsCss, /body\s*\{[\s\S]*?font-family:\s*var\(--font-sohne\)/);
      assert.match(globalsCss, /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?font-family:\s*var\(--font-sohne\)/);
      assert.match(globalsCss, /text-wrap:\s*pretty;/);
    });
  });

  describe("4. Dark Mode Variant Configuration", () => {
    it("declares Tailwind v4 @custom-variant dark selector", () => {
      assert.match(globalsCss, /@custom-variant\s+dark\s+\(&:is\(\.dark\s+\*\)\);/);
    });
  });

  describe("5. Anti-AI-Slop Negative Constraints Static Analysis", () => {
    const keyFiles = [
      "app/globals.css",
      "app/home.tsx",
      "app/room/[room]/header.tsx",
      "components/custom/landing/studioPreview.tsx",
      "components/custom/landing/featureBento.tsx",
      "components/custom/landing/technicalFaq.tsx",
      "components/custom/landing/landingFooter.tsx",
    ];

    it("strictly prohibits generic AI purple-to-indigo gradients across all components", () => {
      const purpleGradientRegex = /from-purple-[0-9]{3}|to-indigo-[0-9]{3}|from-indigo-[0-9]{3}|to-purple-[0-9]{3}/i;

      for (const relPath of keyFiles) {
        const fullPath = path.resolve(__dirname, "..", relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          assert.strictEqual(
            purpleGradientRegex.test(content),
            false,
            `Found prohibited generic AI purple/indigo gradient in ${relPath}`
          );
        }
      }
    });

    it("strictly prohibits floating backdrop blur glow orbs (e.g. blur-3xl bg-purple-500)", () => {
      const orbRegex = /blur-3xl\s+bg-purple|bg-purple-500\/[0-9]+|blur-2xl\s+bg-indigo/i;

      for (const relPath of keyFiles) {
        const fullPath = path.resolve(__dirname, "..", relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          assert.strictEqual(
            orbRegex.test(content),
            false,
            `Found prohibited floating blur orb in ${relPath}`
          );
        }
      }
    });

    it("ensures landing page headlines strictly use deliberate negative tracking (tracking-tight or tracking-tighter)", () => {
      const landingFiles = [
        "app/home.tsx",
        "components/custom/landing/studioPreview.tsx",
        "components/custom/landing/featureBento.tsx",
        "components/custom/landing/technicalFaq.tsx",
      ];

      for (const relPath of landingFiles) {
        const fullPath = path.resolve(__dirname, "..", relPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        // Match <h1> and <h2> tags
        const headingMatches = content.match(/<h[1-2][^>]*className="([^"]*)"/g) || [];
        for (const heading of headingMatches) {
          const hasTracking = heading.includes("tracking-tight") || heading.includes("tracking-tighter");
          assert.strictEqual(
            hasTracking,
            true,
            `Heading in ${relPath} must specify tracking-tight or tracking-tighter: ${heading}`
          );
        }
      }
    });

    it("ensures interactive controls on the home screen conform to minimum touch targets (min-h-11 or h-12)", () => {
      const homeContent = fs.readFileSync(path.resolve(__dirname, "../app/home.tsx"), "utf-8");
      
      // Tabs must satisfy min-h-11 touch target
      assert.match(homeContent, /role="tab"[\s\S]*?min-h-11/);
      
      // Inputs must satisfy h-12 touch target
      assert.match(homeContent, /id="display-name"[\s\S]*?h-12/);
      assert.match(homeContent, /id="room-id"[\s\S]*?h-12/);

      // Primary submit button must satisfy min-h-12 touch target
      assert.match(homeContent, /min-h-12\s+w-full\s+items-center\s+justify-center/);
    });
  });
});
