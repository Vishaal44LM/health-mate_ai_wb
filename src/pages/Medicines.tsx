import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pill, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string;
  notes: string;
  is_active: boolean;
}

const Medicines = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    time_of_day: "",
    notes: "",
  });

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching medicines",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMedicines(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('medicines').insert([
      {
        user_id: session.user.id,
        ...formData,
      },
    ]);

    if (error) {
      toast({
        title: "Error adding medicine",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Medicine added",
        description: "Your medicine has been added successfully.",
      });
      setFormData({
        name: "",
        dosage: "",
        frequency: "",
        time_of_day: "",
        notes: "",
      });
      setShowForm(false);
      fetchMedicines();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('medicines')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error removing medicine",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Medicine removed",
        description: "The medicine has been removed from your list.",
      });
      fetchMedicines();
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Medicines</h1>
            <p className="text-muted-foreground mt-1">Manage your medications</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medicine
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Medicine</CardTitle>
              <CardDescription>Enter the details of your medication</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Medicine Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Aspirin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input
                      id="dosage"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      placeholder="e.g., Twice daily"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time of Day</Label>
                    <Input
                      id="time"
                      value={formData.time_of_day}
                      onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                      placeholder="e.g., Morning, Evening"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Save Medicine</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medicines.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No medicines added yet</h3>
              <p className="text-muted-foreground">Start by adding your first medication</p>
            </div>
          ) : (
            medicines.map((medicine) => (
              <Card key={medicine.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{medicine.name}</CardTitle>
                      <CardDescription>{medicine.dosage}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(medicine.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Frequency</p>
                    <p className="text-sm text-muted-foreground">{medicine.frequency}</p>
                  </div>
                  {medicine.time_of_day && (
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">{medicine.time_of_day}</p>
                    </div>
                  )}
                  {medicine.notes && (
                    <div>
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm text-muted-foreground">{medicine.notes}</p>
                    </div>
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

export default Medicines;
