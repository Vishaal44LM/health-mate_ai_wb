import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Utensils, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";

interface NutritionLog {
  id: string;
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  notes: string;
  meal_time: string;
}

const Nutrition = () => {
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    meal_name: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fats_g: "",
    notes: "",
  });

  const [goalData, setGoalData] = useState({
    goal: "General wellness",
    preferences: "",
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('meal_time', today.toISOString())
      .order('meal_time', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching nutrition logs",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('nutrition_logs').insert([
      {
        user_id: session.user.id,
        meal_name: formData.meal_name,
        calories: parseInt(formData.calories) || null,
        protein_g: parseFloat(formData.protein_g) || null,
        carbs_g: parseFloat(formData.carbs_g) || null,
        fats_g: parseFloat(formData.fats_g) || null,
        notes: formData.notes,
      },
    ]);

    if (error) {
      toast({
        title: "Error logging meal",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Meal logged",
        description: "Your nutrition data has been saved.",
      });
      setFormData({
        meal_name: "",
        calories: "",
        protein_g: "",
        carbs_g: "",
        fats_g: "",
        notes: "",
      });
      setShowForm(false);
      fetchLogs();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('nutrition_logs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error removing log",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Log removed",
        description: "The nutrition log has been deleted.",
      });
      fetchLogs();
    }
  };

  const getAISuggestions = async () => {
    setLoadingSuggestions(true);
    setAiSuggestions("");

    try {
      const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
      const totalProtein = logs.reduce((sum, log) => sum + (log.protein_g || 0), 0);

      const NUTRITION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-suggestions`;
      
      const response = await fetch(NUTRITION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          goal: goalData.goal,
          currentIntake: { calories: totalCalories, protein: totalProtein },
          preferences: goalData.preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      setAiSuggestions(data.suggestions);
      
      toast({
        title: "Suggestions ready",
        description: "AI-powered meal suggestions generated.",
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      toast({
        title: "Error",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const todayTotals = {
    calories: logs.reduce((sum, log) => sum + (log.calories || 0), 0),
    protein: logs.reduce((sum, log) => sum + (log.protein_g || 0), 0),
    carbs: logs.reduce((sum, log) => sum + (log.carbs_g || 0), 0),
    fats: logs.reduce((sum, log) => sum + (log.fats_g || 0), 0),
  };

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nutrition Planner</h1>
            <p className="text-muted-foreground mt-1">Track meals and get AI-powered diet suggestions</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Meal
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{todayTotals.calories}</div>
              <p className="text-xs text-muted-foreground">Calories Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{todayTotals.protein.toFixed(1)}g</div>
              <p className="text-xs text-muted-foreground">Protein</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{todayTotals.carbs.toFixed(1)}g</div>
              <p className="text-xs text-muted-foreground">Carbohydrates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{todayTotals.fats.toFixed(1)}g</div>
              <p className="text-xs text-muted-foreground">Fats</p>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle>Log Your Meal</CardTitle>
              <CardDescription>Track what you've eaten today</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meal">Meal Name</Label>
                    <Input
                      id="meal"
                      value={formData.meal_name}
                      onChange={(e) => setFormData({ ...formData, meal_name: e.target.value })}
                      placeholder="e.g., Grilled Chicken Salad"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={formData.calories}
                      onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      placeholder="450"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      value={formData.protein_g}
                      onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
                      placeholder="35"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbs">Carbs (g)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      value={formData.carbs_g}
                      onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fats">Fats (g)</Label>
                    <Input
                      id="fats"
                      type="number"
                      step="0.1"
                      value={formData.fats_g}
                      onChange={(e) => setFormData({ ...formData, fats_g: e.target.value })}
                      placeholder="12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="How did you feel after this meal?"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Log Meal</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Meal Suggestions</CardTitle>
            <CardDescription>Get personalized diet recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Health Goal</Label>
                <Input
                  id="goal"
                  value={goalData.goal}
                  onChange={(e) => setGoalData({ ...goalData, goal: e.target.value })}
                  placeholder="e.g., Weight loss, Muscle gain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferences">Dietary Preferences</Label>
                <Input
                  id="preferences"
                  value={goalData.preferences}
                  onChange={(e) => setGoalData({ ...goalData, preferences: e.target.value })}
                  placeholder="e.g., Vegetarian, Low-carb"
                />
              </div>
            </div>
            <Button onClick={getAISuggestions} disabled={loadingSuggestions}>
              {loadingSuggestions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>
            
            {aiSuggestions && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
                <div className="whitespace-pre-wrap text-sm">{aiSuggestions}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {logs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No meals logged today</h3>
              <p className="text-muted-foreground">Start tracking your nutrition</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="animate-fade-in hover-scale">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{log.meal_name}</CardTitle>
                      <CardDescription>{log.calories} calories</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Protein</p>
                      <p className="font-medium">{log.protein_g?.toFixed(1)}g</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Carbs</p>
                      <p className="font-medium">{log.carbs_g?.toFixed(1)}g</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fats</p>
                      <p className="font-medium">{log.fats_g?.toFixed(1)}g</p>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Nutrition;
