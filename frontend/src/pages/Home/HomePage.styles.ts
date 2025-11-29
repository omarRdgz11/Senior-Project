// src/pages/Home/homepageStyles.ts
import type { CSSProperties } from "react";
import { colors } from "../../styles/colors";

export const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    backgroundColor: colors.green,
    fontFamily: "'Figtree', sans-serif",
    color: colors.brown,
    textAlign: "left",
    padding: "2rem",
  },

  card: {
    backgroundColor: colors.green,
    borderRadius: "1rem",
    padding: "2rem 1rem",
    width: "70%",
    maxWidth: "500px",
  },

  title: {
    fontSize: "3.5rem",
    fontWeight: 700,
    color: colors.brown,
    marginBottom: "0.5rem",
  },

  subtitle: {
    color: colors.stone,
    marginBottom: "2rem",
    fontSize: "1.5rem",
  },

  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    alignItems: "normal",
    textAlign: "center",
    width: "10rem",
  },

  btnHover: {
    backgroundColor: colors.gold,
  },

  // About Button
  aboutBtn: {
    textDecoration: "none",
    color: colors.cream,
    backgroundColor: colors.forest,
    padding: "0.75rem 2rem",
    borderRadius: "1.5rem",
    borderColor: "transparent",
    fontWeight: 600,
  },

  // Map Button
  mapBtn: {
    textDecoration: "none",
    color: colors.cream,
    backgroundColor: colors.red,
    padding: "0.75rem 2rem",
    borderRadius: "1.5rem",
    borderColor: "transparent",
    fontWeight: 600,
  },

  footer: {
    marginTop: "5rem",
    fontSize: "0.9rem",
    color: colors.stone,
  },

  contentWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    width: "100%",
    maxWidth: "1200px",
    gap: "1rem",
    flexWrap: "wrap", // helps on smaller screens
  },

  imageContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  sideImage: {
    width: "100%",
    maxWidth: "900px",
    borderRadius: "1rem",
    objectFit: "cover",
  },
};
