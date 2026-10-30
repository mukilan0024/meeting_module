/**
 * CMS Commander Design System Tokens
 * Source of truth for brand, neutrals, semantic colors, typography, elevations & layout metrics.
 */

export const colors = {
  brand: {
    50: "#E8F7F0",
    100: "#CFF0E0",
    200: "#9DDBC0",
    300: "#6BC59E",
    400: "#42B27D",
    500: "#249E5E", // Brand Primary
    600: "#1E8A51", // Hover Primary
    700: "#177042", // Accessible Text on Brand-50
    800: "#115733",
    900: "#0C3E24",
  },
  gray: {
    25: "#FCFCFD",
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  semantic: {
    success: {
      bg: "#DCFCE7",
      border: "#86EFAC",
      text: "#14532D",
      solid: "#16A34A",
    },
    warning: {
      bg: "#FEF3C7",
      border: "#FDE68A",
      text: "#92400E",
      solid: "#D97706",
    },
    danger: {
      bg: "#FEE2E2",
      border: "#FCA5A5",
      text: "#991B1B",
      solid: "#DC2626",
    },
    info: {
      bg: "#DBEAFE",
      border: "#93C5FD",
      text: "#1E40AF",
      solid: "#2563EB",
    },
  },
  surface: {
    white: "#FFFFFF",
    pageBg: "#F9FAFB",
    cardBg: "#FFFFFF",
    cardHoverBg: "#F8FDF9",
    border: "#E5E7EB",
    borderSubtle: "#F3F4F6",
    borderStrong: "#D1D5DB",
    borderFocus: "#249E5E",
  },
} as const;

export const shadows = {
  xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
  sm: "0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
  brand: "0 4px 14px rgba(36, 158, 94, 0.28)",
  brandHover: "0 8px 24px rgba(36, 158, 94, 0.16)",
  danger: "0 4px 14px rgba(220, 38, 38, 0.24)",
} as const;

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  default: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  smooth: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;
