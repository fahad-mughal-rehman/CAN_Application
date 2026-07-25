import React from "react";
import { Square } from "lucide-react";

export default function StatusSquare({ color, fill }) {
  return <Square size={14} color={color} fill={fill} />;
}
