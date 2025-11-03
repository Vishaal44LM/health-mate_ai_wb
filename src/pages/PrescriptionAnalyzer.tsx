import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";

const PrescriptionAnalyzer = () => {
  const [prescription, setPrescription] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePrescription = async () => {
    if (!prescription && !imageFile) {
      toast({
        title: "Input required",
        description: "Please enter prescription text or upload an image.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAnalysis("");

    try {
      const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-prescription`;
      
      const response = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prescription: imagePreview || prescription,
          isImage: !!imageFile,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze prescription');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      
      toast({
        title: "Analysis complete",
        description: "Your prescription has been analyzed.",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Error",
        description: "Failed to analyze prescription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Prescription Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Upload or paste your prescription for AI-powered analysis
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Prescription</CardTitle>
              <CardDescription>Take a photo or upload an image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="prescription-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Label
                  htmlFor="prescription-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                </Label>
              </div>
              
              {imagePreview && (
                <div className="relative animate-fade-in">
                  <img
                    src={imagePreview}
                    alt="Prescription preview"
                    className="w-full rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Or Enter Text</CardTitle>
              <CardDescription>Type or paste prescription details</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="Enter medication names, dosages, and instructions..."
                className="min-h-[200px]"
                disabled={!!imageFile}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            size="lg"
            onClick={analyzePrescription}
            disabled={loading || (!prescription && !imageFile)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Analyze Prescription
              </>
            )}
          </Button>
        </div>

        {analysis && (
          <Card className="mt-6 animate-fade-in">
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>AI-powered prescription analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm">{analysis}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PrescriptionAnalyzer;
