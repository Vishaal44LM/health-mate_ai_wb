import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Home, Pill, Droplet, Calendar, Utensils, MessageSquare, FileText, LogOut, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-foreground">Health Mate</span>
          </Link>
          
          <div className="flex items-center gap-1">
            <Button
              variant={isActive("/") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            
            <Button
              variant={isActive("/medicines") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/medicines">
                <Pill className="h-4 w-4 mr-2" />
                Medicines
              </Link>
            </Button>
            
            <Button
              variant={isActive("/water") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/water">
                <Droplet className="h-4 w-4 mr-2" />
                Water
              </Link>
            </Button>
            
            <Button
              variant={isActive("/appointments") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/appointments">
                <Calendar className="h-4 w-4 mr-2" />
                Appointments
              </Link>
            </Button>
            
            <Button
              variant={isActive("/nutrition") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/nutrition">
                <Utensils className="h-4 w-4 mr-2" />
                Nutrition
              </Link>
            </Button>
            
            <Button
              variant={isActive("/chat") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Chat
              </Link>
            </Button>
            
            <Button
              variant={isActive("/prescription") ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link to="/prescription">
                <FileText className="h-4 w-4 mr-2" />
                Prescription
              </Link>
            </Button>

            <Button
              variant={isActive("/emergency") ? "secondary" : "ghost"}
              size="sm"
              asChild
              className={isActive("/emergency") ? "" : "text-destructive hover:text-destructive"}
            >
              <Link to="/emergency">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
