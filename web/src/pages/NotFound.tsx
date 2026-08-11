import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Button onClick={() => navigate("/")}>Go Home</Button>
    </div>
  );
}
