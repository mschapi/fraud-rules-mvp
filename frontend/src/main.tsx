import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./ui/AppLayout";
import { AssistantPage } from "./pages/AssistantPage";
import { OverviewPage } from "./pages/OverviewPage";
import { RuleBuilderPage } from "./pages/RuleBuilderPage";
import { RuleDetailPage } from "./pages/RuleDetailPage";
import { RulesDashboard } from "./pages/RulesDashboard";
import "./styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/rules" element={<RulesDashboard />} />
            <Route path="/rules/new" element={<RuleBuilderPage />} />
            <Route path="/rules/:id" element={<RuleDetailPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
