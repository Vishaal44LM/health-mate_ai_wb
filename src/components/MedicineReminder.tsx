import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";

const MedicineReminder = () => {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .limit(3);

    setMedicines(data || []);
    setLoading(false);
  };

  const sendReminder = async (medicine: any) => {
    setSendingEmail(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.email) {
        throw new Error('No email found');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();

      const EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-medication-reminder`;
      
      const response = await fetch(EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email: profile?.email || session.user.email,
          medicineName: medicine.name,
          dosage: medicine.dosage,
          timeOfDay: medicine.time_of_day || 'As prescribed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      toast({
        title: "Reminder sent!",
        description: `Email reminder sent for ${medicine.name}`,
      });
    } catch (error) {
      console.error('Reminder error:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder. Please check your email settings.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading || medicines.length === 0) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Medication Reminders
        </CardTitle>
        <CardDescription>Send yourself email reminders for your medications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {medicines.map((medicine) => (
          <div
            key={medicine.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium">{medicine.name}</p>
              <p className="text-sm text-muted-foreground">{medicine.dosage}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendReminder(medicine)}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-1" />
                  Send Reminder
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MedicineReminder;
