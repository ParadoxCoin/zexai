import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Video, Sparkles } from "lucide-react";

const VideoPageWithEffects = () => {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [effectId, setEffectId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const queryClient = useQueryClient();

  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["videoModels"],
    queryFn: () => apiService.get("/video/models")
  });

  const { data: effectsData, isLoading: isLoadingEffects } = useQuery({
    queryKey: ["videoEffects"],
    queryFn: () => apiService.get("/video/effects")
  });

  const { mutate: generateVideo, isPending: isGenerating } = useMutation({
    mutationFn: (data: any) => apiService.post("/video/generate", data),
    onSuccess: (response) => {
      alert(`Video üretimi başladı! Task ID: ${response.task_id}`);
      setPrompt("");
    },
    onError: (error: any) => {
      alert(`Hata: ${error?.response?.data?.detail || "Video üretilemedi"}`);
    }
  });

  const { mutate: applyEffect, isPending: isApplyingEffect } = useMutation({
    mutationFn: (data: any) => apiService.post("/video/effects/apply", data),
    onSuccess: (response) => {
      alert(`Efekt uygulanıyor! Task ID: ${response.task_id}`);
      setImageUrl("");
    },
    onError: (error: any) => {
      alert(`Hata: ${error?.response?.data?.detail || "Efekt uygulanamadı"}`);
    }
  });

  const handleGenerateVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !modelId) {
      alert("Lütfen açıklama girin ve model seçin!");
      return;
    }
    generateVideo({ prompt: prompt.trim(), model_id: modelId });
  };

  const handleApplyEffect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectId || !imageUrl.trim()) {
      alert("Lütfen efekt seçin ve görsel URL'si girin!");
      return;
    }
    applyEffect({ effect_id: effectId, image_url: imageUrl.trim() });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Video className="h-8 w-8 text-purple-600" />
        <h1 className="text-3xl font-bold">Video Üretimi</h1>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">
            <Video className="h-4 w-4 mr-2" />
            Video Üret
          </TabsTrigger>
          <TabsTrigger value="effects">
            <Sparkles className="h-4 w-4 mr-2" />
            Efektler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Video Üret</CardTitle>
            </CardHeader>
            <form onSubmit={handleGenerateVideo}>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Video Açıklaması</label>
                  <Textarea
                    placeholder="Oluşturmak istediğiniz videoyu tanımlayın..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <Select onValueChange={setModelId} value={modelId} disabled={isGenerating || isLoadingModels}>
                    <SelectTrigger>
                      <SelectValue placeholder="Model seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelsData?.data?.map((model: any) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.credits} kredi)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isGenerating || !prompt.trim() || !modelId}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isGenerating ? "Üretiliyor..." : "Video Üret"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="effects">
          <Card>
            <CardHeader>
              <CardTitle>Efekt Uygula</CardTitle>
            </CardHeader>
            <form onSubmit={handleApplyEffect}>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Efekt</label>
                  <Select onValueChange={setEffectId} value={effectId} disabled={isApplyingEffect || isLoadingEffects}>
                    <SelectTrigger>
                      <SelectValue placeholder="Efekt seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {effectsData?.data?.map((effect: any) => (
                        <SelectItem key={effect.id} value={effect.id}>
                          {effect.icon} {effect.name} ({effect.credits} kredi)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Görsel URL</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isApplyingEffect}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isApplyingEffect || !effectId || !imageUrl.trim()}>
                  {isApplyingEffect && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isApplyingEffect ? "Uygulanıyor..." : "Efekt Uygula"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VideoPageWithEffects;
