export const baseStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  padding: "20px",
  borderWidth: 2,
  borderRadius: 2,
  borderColor: "#424242",
  borderStyle: "dashed",
  backgroundColor: "rgba(0,0,0,0.3)",
  color: "#f0f0f0",
  outline: "none",
  transition: "border .24s ease-in-out"
};

export const activeStyle = {
  borderColor: "#2196f3"
};

export const acceptStyle = {
  borderColor: "#00e676"
};

export const rejectStyle = {
  borderColor: "#ff1744"
};
