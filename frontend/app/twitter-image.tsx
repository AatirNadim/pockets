import { createSocialImage } from "./social-card";

export const alt = "Pockets — Meet in a pocket studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return createSocialImage();
}
