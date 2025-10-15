import type { CSSProperties } from "react";
import { colors } from "../styles/colors";

export const navbarStyles: Record<string, CSSProperties> = {
  navbar: {
    backgroundColor: colors.green,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: colors.cream,
    textDecoration: "none",
    fontFamily: "'Figtree', sans-serif",
  },
  navLinks: {
    display: "flex",
    gap: "1.5rem",
    fontSize: "1.2rem",
    fontFamily: "'Source Sans 3', sans-serif",
    color: colors.cream,

  },
  link: {
    color: colors.cream,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1.2rem",
    transition: "color 0.25s ease",
  },
  linkHover: {
    color: colors.red,
  },
  body: {
    minHeight: "100vh",
    backgroundColor: colors.green,
  },
};
