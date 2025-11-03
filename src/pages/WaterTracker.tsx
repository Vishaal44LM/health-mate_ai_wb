import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Droplet, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const WaterTracker = () => {
  const [todayIntake, setTodayIntake] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const dailyGoal = 2000; // 2000ml = 2L

  useEffect(() => {
    fetchTodayIntake();
  }, []);

  const fetchTodayIntake = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('water_intake')
      .select('amount_ml')
      .eq('user_id', session.user.id)
      .eq('date', today);

    if (error) {
      toast({
        title: "Error fetching water intake",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const total = data?.reduce((sum, item) => sum + item.amount_ml, 0) || 0;
      setTodayIntake(total);
    }
    setLoading(false);
  };

  const addWater = async (amount: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('water_intake').insert([
      {
        user_id: session.user.id,
        amount_ml: amount,
        date: new Date().toISOString().split('T')[0],
      },
    ]);

    if (error) {
      toast({
        title: "Error logging water intake",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Water logged!",
        description: `Added ${amount}ml to your daily intake.`,
      });
      fetchTodayIntake();
    }
  };

  const progress = Math.min((todayIntake / dailyGoal) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Water Tracker</h1>
          <p className="text-muted-foreground mt-1">Stay hydrated throughout the day</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Droplet className="h-12 w-12 text-blue-500" />
              </div>
              <CardTitle className="text-4xl font-bold">{todayIntake}ml</CardTitle>
              <CardDescription>of {dailyGoal}ml daily goal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {progress >= 100 && (
                <div className="bg-success/10 text-success border border-success/20 rounded-lg p-4 text-center">
                  <p className="font-medium">🎉 Great job! You've reached your daily water goal!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Add</CardTitle>
              <CardDescription>Log your water intake with a single tap</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => addWater(250)}
                >
                  <Droplet className="h-6 w-6" />
                  <span className="font-semibold">250ml</span>
                  <span className="text-xs text-muted-foreground">Glass</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => addWater(500)}
                >
                  <Droplet className="h-6 w-6" />
                  <span className="font-semibold">500ml</span>
                  <span className="text-xs text-muted-foreground">Bottle</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => addWater(750)}
                >
                  <Droplet className="h-6 w-6" />
                  <span className="font-semibold">750ml</span>
                  <span className="text-xs text-muted-foreground">Large</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => addWater(1000)}
                >
                  <Droplet className="h-6 w-6" />
                  <span className="font-semibold">1000ml</span>
                  <span className="text-xs text-muted-foreground">Liter</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hydration Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Droplet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Start your day right</p>
                  <p className="text-sm text-muted-foreground">Drink a glass of water first thing in the morning</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Droplet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Set reminders</p>
                  <p className="text-sm text-muted-foreground">Schedule regular water breaks throughout the day</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Droplet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Listen to your body</p>
                  <p className="text-sm text-muted-foreground">Drink more when exercising or in hot weather</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WaterTracker;
