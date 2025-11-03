import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";
import { Pill, Droplet, Calendar, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [medicineCount, setMedicineCount] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      await fetchDashboardData(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: medicines } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const { data: water } = await supabase
      .from('water_intake')
      .select('amount_ml')
      .eq('user_id', userId)
      .eq('date', today);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('appointment_date', new Date().toISOString());

    setMedicineCount(medicines?.length || 0);
    setWaterIntake(water?.reduce((sum, item) => sum + item.amount_ml, 0) || 0);
    setUpcomingAppointments(appointments?.length || 0);
  };

  const waterGoal = 2000;
  const waterProgress = Math.min((waterIntake / waterGoal) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your health overview at a glance</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <DashboardCard
            title="Active Medicines"
            value={medicineCount}
            icon={Pill}
            description="Medications you're taking"
            iconColor="text-primary"
          />
          <DashboardCard
            title="Water Intake Today"
            value={`${waterIntake}ml`}
            icon={Droplet}
            description={`Goal: ${waterGoal}ml`}
            iconColor="text-blue-500"
          />
          <DashboardCard
            title="Upcoming Appointments"
            value={upcomingAppointments}
            icon={Calendar}
            description="Scheduled check-ups"
            iconColor="text-amber-500"
          />
          <DashboardCard
            title="Health Score"
            value="85%"
            icon={TrendingUp}
            description="Overall wellness"
            iconColor="text-success"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily Water Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(waterProgress)}%</span>
                </div>
                <Progress value={waterProgress} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                You've consumed {waterIntake}ml out of your {waterGoal}ml daily goal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => navigate("/medicines")}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Pill className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Add Medicine</p>
                    <p className="text-xs text-muted-foreground">Manage your medications</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate("/water")}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Droplet className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Log Water Intake</p>
                    <p className="text-xs text-muted-foreground">Track your hydration</p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
