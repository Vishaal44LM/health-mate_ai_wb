import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Trash2, Send, MapPin, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Emergency() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    relationship: "",
  });
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [location, setLocation] = useState("");
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  // Fetch emergency contacts
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["emergency-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profile for name
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("emergency_contacts")
        .insert([{ ...newContact, user_id: user.id }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
      setNewContact({ name: "", email: "", phone: "", relationship: "" });
      setIsAddingContact(false);
      toast({
        title: "Contact added",
        description: "Emergency contact has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add contact",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", contactId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast({
        title: "Contact removed",
        description: "Emergency contact has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove contact",
        variant: "destructive",
      });
    },
  });

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) {
      toast({
        title: "Missing information",
        description: "Please provide at least a name and email.",
        variant: "destructive",
      });
      return;
    }
    addContactMutation.mutate();
  };

  const handleSendEmergencyAlert = async () => {
    if (!contacts || contacts.length === 0) {
      toast({
        title: "No contacts",
        description: "Please add emergency contacts before sending an alert.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingAlert(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-emergency-alert", {
        body: {
          message: emergencyMessage,
          location: location,
          userName: profile?.full_name || profile?.email || "A Health Mate user",
        },
      });

      if (error) throw error;

      toast({
        title: "Emergency alert sent!",
        description: `Alert sent to ${data.successCount} of ${data.totalContacts} contacts.`,
      });
      
      setEmergencyMessage("");
      setLocation("");
    } catch (error) {
      toast({
        title: "Failed to send alert",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
          toast({
            title: "Location detected",
            description: "Your current location has been added to the alert.",
          });
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Unable to get your location. Please enter it manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold">Emergency Alert</h1>
          <p className="text-muted-foreground">Manage emergency contacts and send alerts</p>
        </div>
      </div>

      {/* Send Emergency Alert Card */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Emergency Alert
          </CardTitle>
          <CardDescription>
            Send an immediate alert to all your emergency contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emergency-message">Message (Optional)</Label>
            <Textarea
              id="emergency-message"
              placeholder="Describe your emergency..."
              value={emergencyMessage}
              onChange={(e) => setEmergencyMessage(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Enter your location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={getCurrentLocation}
                title="Get current location"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                variant="destructive"
                disabled={!contacts || contacts.length === 0}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Send Emergency Alert
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send Emergency Alert?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately send an emergency notification to all {contacts?.length || 0} of your emergency contacts.
                  This action should only be used in genuine emergencies.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSendEmergencyAlert}
                  disabled={isSendingAlert}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isSendingAlert ? "Sending..." : "Send Alert"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Emergency Contacts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Emergency Contacts
          </CardTitle>
          <CardDescription>
            People who will be notified in case of an emergency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading contacts...</p>
          ) : contacts && contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    {contact.phone && (
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    )}
                    {contact.relationship && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.relationship}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteContactMutation.mutate(contact.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No emergency contacts added yet
            </p>
          )}

          {isAddingContact ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact({ ...newContact, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact({ ...newContact, email: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={newContact.relationship}
                  onChange={(e) =>
                    setNewContact({ ...newContact, relationship: e.target.value })
                  }
                  placeholder="e.g., Spouse, Parent, Friend"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddContact}
                  disabled={addContactMutation.isPending}
                  className="flex-1"
                >
                  {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingContact(false);
                    setNewContact({ name: "", email: "", phone: "", relationship: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddingContact(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Emergency Contact
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
