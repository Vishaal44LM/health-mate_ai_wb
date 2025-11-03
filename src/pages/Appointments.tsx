import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";

interface Appointment {
  id: string;
  title: string;
  description: string;
  appointment_date: string;
  location: string;
  doctor_name: string;
}

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    appointment_date: "",
    location: "",
    doctor_name: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true });

    if (error) {
      toast({
        title: "Error fetching appointments",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('appointments').insert([
      {
        user_id: session.user.id,
        ...formData,
      },
    ]);

    if (error) {
      toast({
        title: "Error adding appointment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Appointment scheduled",
        description: "Your appointment has been added successfully.",
      });
      setFormData({
        title: "",
        description: "",
        appointment_date: "",
        location: "",
        doctor_name: "",
      });
      setShowForm(false);
      fetchAppointments();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error removing appointment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Appointment removed",
        description: "The appointment has been cancelled.",
      });
      fetchAppointments();
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
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage your doctor visits</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle>New Appointment</CardTitle>
              <CardDescription>Schedule your next doctor visit</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Appointment Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Annual Check-up"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date & Time</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor Name</Label>
                    <Input
                      id="doctor"
                      value={formData.doctor_name}
                      onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                      placeholder="Dr. Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City Hospital"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Notes (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Any special notes or preparation needed..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Schedule</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {appointments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No upcoming appointments</h3>
              <p className="text-muted-foreground">Schedule your first appointment to get started</p>
            </div>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id} className="animate-fade-in hover-scale">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{appointment.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(appointment.appointment_date), 'PPp')}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(appointment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {appointment.doctor_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{appointment.doctor_name}</span>
                    </div>
                  )}
                  {appointment.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{appointment.location}</span>
                    </div>
                  )}
                  {appointment.description && (
                    <p className="text-sm text-muted-foreground mt-2">{appointment.description}</p>
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

export default Appointments;
