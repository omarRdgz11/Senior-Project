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
    padding: "2rem",
  },

  card: {
    backgroundColor: colors.cream,
    borderRadius: "1rem",
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  },

  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: colors.brown,
    marginBottom: "0.5rem",
    textAlign: "center",
  },

  description: {
    fontSize: "1rem",
    color: colors.stone,
    marginBottom: "1rem",
    textAlign: "center",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },

  input: {
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: `1px solid ${colors.stone}`,
    fontSize: "1rem",
    outline: "none",
    fontFamily: "'Figtree', sans-serif",
  },

  button: {
    padding: "0.75rem",
    borderRadius: "1.5rem",
    border: "none",
    backgroundColor: colors.red,
    color: colors.cream,
    fontWeight: 600,
    fontSize: "1rem",
    cursor: "pointer",
    transition: "0.2s",
  },

  buttonDisabled: {
    padding: "0.75rem",
    borderRadius: "1.5rem",
    border: "none",
    backgroundColor: colors.stone,
    color: colors.cream,
    fontWeight: 600,
    fontSize: "1rem",
    cursor: "not-allowed",
  },

  successMessage: {
    marginTop: "1rem",
    color: colors.forest,
    fontWeight: 600,
    textAlign: "center",
  },

  errorMessage: {
    marginTop: "1rem",
    color: colors.red,
    fontWeight: 600,
    textAlign: "center",
  },

  toastWrapper: {
    position: "fixed",
    top: "24px",
    right: "24px",
    zIndex: 1000,
    maxWidth: "380px",
    width: "calc(100% - 32px)",
  },

  toastCard: {
    backgroundColor: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
    padding: "16px",
  },

  toastHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  },

  toastTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#9a3412",
  },

  toastCloseButton: {
    border: "none",
    background: "transparent",
    fontSize: "22px",
    lineHeight: 1,
    cursor: "pointer",
    color: "#9a3412",
    padding: 0,
  },

  toastBody: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  toastText: {
    margin: 0,
    fontSize: "14px",
    color: "#7c2d12",
  },

};