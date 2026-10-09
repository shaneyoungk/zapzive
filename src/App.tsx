import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import Features from "./pages/Features";
import UseCases from "./pages/UseCases";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";
import Legal from "./pages/Legal";
import DashboardLayout from "@/layouts/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Payroll from "./pages/dashboard/Payroll";
import PayrollBatchDetail from "./pages/dashboard/PayrollBatchDetail";
import WorkerDetail from "./pages/dashboard/WorkerDetail";
import Escrow from "./pages/dashboard/Escrow";
import ContractDetail from "./pages/dashboard/ContractDetail";
import ContractBid from "./pages/public/ContractBid";
import Remittance from "./pages/dashboard/Remittance";
import Treasury from "./pages/dashboard/Treasury";
import TreasuryTransfer from "./pages/dashboard/TreasuryTransfer";
import CryptoPayments from "./pages/dashboard/CryptoPayments";
import Analytics from "./pages/dashboard/Analytics";
import Compliance from "./pages/dashboard/Compliance";
import Agents from "./pages/dashboard/Agents";
import Settings from "./pages/dashboard/Settings";
import DocsLayout from "@/layouts/DocsLayout";
import Introduction from "@/pages/docs/Introduction";
import Quickstart from "@/pages/docs/Quickstart";
import ApiReference from "@/pages/docs/ApiReference";
import Authentication from "@/pages/docs/Authentication";
import Testing from "@/pages/docs/Testing";
import Errors from "@/pages/docs/Errors";
import Webhooks from "@/pages/docs/Webhooks";
import GoLive from "@/pages/docs/GoLive";
import EnterpriseExample from "@/pages/docs/EnterpriseExample";
import NodeSDK from "@/pages/docs/sdks/NodeSDK";
import PythonSDK from "@/pages/docs/sdks/PythonSDK";
import ReactSDK from "@/pages/docs/sdks/ReactSDK";
import RemittanceAPI from "@/pages/docs/api/Remittance";
import PayrollAPI from "@/pages/docs/api/Payroll";
import TreasuryAPI from "@/pages/docs/api/Treasury";
import EscrowAPI from "@/pages/docs/api/Escrow";
import AnalyticsAPI from "@/pages/docs/api/Analytics";
import ComplianceAPI from "@/pages/docs/api/Compliance";
import AgentsAPI from "@/pages/docs/api/Agents";
import SettingsAPI from "@/pages/docs/api/Settings";
import PayoutMethods from "@/pages/docs/api/remittance/PayoutMethods";
import TransactionTracking from "@/pages/docs/api/remittance/Tracking";
import BatchProcessing from "@/pages/docs/api/payroll/BatchProcessing";
import WorkerOnboarding from "@/pages/docs/api/payroll/WorkerOnboarding";
import FxSwaps from "@/pages/docs/api/treasury/FxSwaps";
import GasManagement from "@/pages/docs/api/treasury/GasManagement";
import MilestoneLogic from "@/pages/docs/api/escrow/Milestones";
import DisputeArbitration from "@/pages/docs/api/escrow/Disputes";
import CustomReporting from "@/pages/docs/api/analytics/CustomReporting";
import VerificationFlows from "@/pages/docs/api/compliance/VerificationFlows";
import RiskScoring from "@/pages/docs/api/compliance/RiskScoring";
import SettingsWebhooks from "@/pages/docs/api/settings/Webhooks";
import TeamAccess from "@/pages/docs/api/settings/TeamAccess";
import PaymentsConcept from "@/pages/docs/concepts/Payments";
import EscrowConcept from "@/pages/docs/concepts/Escrow";
import Examples from "@/pages/docs/Examples";
import ExampleDetail from "@/pages/docs/ExampleDetail";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { CookieBanner } from "@/components/layout/CookieBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/features" element={<Features />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/privacy" element={<Legal />} />
            <Route path="/risk-disclosure" element={<Legal />} />
            <Route path="/p/contract/:id" element={<ContractBid />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}

            {/* Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="payroll/batches/:id" element={<PayrollBatchDetail />} />
              <Route path="payroll/workers/:id" element={<WorkerDetail />} />
              <Route path="escrow" element={<Escrow />} />
              <Route path="escrow/new" element={<Escrow />} />
              <Route path="escrow/:id" element={<ContractDetail />} />
              <Route path="remittance" element={<Remittance />} />
              <Route path="remittance/send" element={<Remittance />} />
              <Route path="treasury" element={<Treasury />} />
              <Route path="treasury/swap" element={<Treasury />} />
              <Route path="treasury/transfer" element={<TreasuryTransfer />} />
              <Route path="crypto" element={<CryptoPayments />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="compliance" element={<Compliance />} />
              <Route path="agents" element={<Agents />} />
              <Route path="settings" element={<Settings />} />
            </Route>


            {/* Documentation Routes */}
            <Route path="/docs" element={<DocsLayout />}>
              <Route index element={<Introduction />} />
              <Route path="quickstart" element={<Quickstart />} />
              <Route path="authentication" element={<Authentication />} />
              <Route path="testing" element={<Testing />} />
              <Route path="errors" element={<Errors />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="go-live" element={<GoLive />} />
              <Route path="solutions/enterprise" element={<EnterpriseExample />} />
              <Route path="examples" element={<Examples />} />
              <Route path="examples/:slug" element={<ExampleDetail />} />
              <Route path="api" element={<ApiReference />} />

              {/* Deep-Dive API Routes */}
              <Route path="api/remittance" element={<RemittanceAPI />} />
              <Route path="api/payroll" element={<PayrollAPI />} />
              <Route path="api/treasury" element={<TreasuryAPI />} />
              <Route path="api/escrow" element={<EscrowAPI />} />
              <Route path="api/analytics" element={<AnalyticsAPI />} />
              <Route path="api/compliance" element={<ComplianceAPI />} />
              <Route path="api/agents" element={<AgentsAPI />} />
              <Route path="api/settings" element={<SettingsAPI />} />

              {/* Deep-Dive Sub-routes */}
              <Route path="api/remittance/payout-methods" element={<PayoutMethods />} />
              <Route path="api/remittance/tracking" element={<TransactionTracking />} />
              <Route path="api/payroll/batch-processing" element={<BatchProcessing />} />
              <Route path="api/payroll/worker-onboarding" element={<WorkerOnboarding />} />
              <Route path="api/treasury/fx-swaps" element={<FxSwaps />} />
              <Route path="api/treasury/gas-management" element={<GasManagement />} />
              <Route path="api/escrow/milestones" element={<MilestoneLogic />} />
              <Route path="api/escrow/disputes" element={<DisputeArbitration />} />
              <Route path="api/analytics/reporting" element={<CustomReporting />} />
              <Route path="api/compliance/verification-flows" element={<VerificationFlows />} />
              <Route path="api/compliance/risk-scoring" element={<RiskScoring />} />
              <Route path="api/settings/webhooks" element={<SettingsWebhooks />} />
              <Route path="api/settings/team-access" element={<TeamAccess />} />

              {/* Concepts */}
              <Route path="concepts/payments" element={<PaymentsConcept />} />
              <Route path="concepts/payouts" element={<PaymentsConcept />} />
              <Route path="concepts/escrow" element={<EscrowConcept />} />

              {/* SDKs */}
              <Route path="sdks/node" element={<NodeSDK />} />
              <Route path="sdks/python" element={<PythonSDK />} />
              <Route path="sdks/react" element={<ReactSDK />} />

              {/* Catch-all for docs to avoid full 404 if page missing */}
              <Route path="*" element={<Introduction />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
