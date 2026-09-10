import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// JSX page modules keep this application codebase approachable and easy to extend.
// @ts-expect-error The scaffold's TypeScript router imports the JSX page module.
import Landing from "./pages/Landing";
// @ts-expect-error The scaffold's TypeScript router imports the JSX page module.
import Login from "./pages/Login";
// @ts-expect-error The scaffold's TypeScript router imports the JSX page module.
import Workspace from "./pages/Workspace";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider><Toaster /><Router /></TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
