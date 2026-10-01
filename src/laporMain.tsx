import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderCustomerSelfServiceComplaintView } from "./components/customerSelfServiceComplaintView";
import "./index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  renderCustomerSelfServiceComplaintView(rootEl);
}
