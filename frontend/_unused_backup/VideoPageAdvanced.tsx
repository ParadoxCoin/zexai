import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModelCapabilityForm } from "@/components/common/ModelCapabilityForm";
import {
  Loader2,
  Video,
  Terminal,
  Sparkles,
  Package,
  FolderOpen,
  Upload,
  Star,
  Download,
  Share2,
  Play,
  CheckCircle,
  Clock
} from "lucide-react";

const VideoPageAdvanced = () => {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelType, setModelType] = useState("text_to_video");
  const [duration, setDuration] = useState("5");
  const [quality, setQuality] = useState("standard");
  const [effectId, setEffectId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFile2, setImageFile2] = useState<File | null>(null);

  // Dynamic State for Capabilities
  const [dynamicParams, setDynamicParams] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  const {
    data: modelsData,
    isLoading: isLoadingModels
  } = useQuery({
    queryKey: ["videoModels", modelType],
    queryFn: () => apiService.get(`/video/models?type=${modelType}`)
  });

  // Find selected model to access capabilities
  const selectedModel = (modelsData as any[])?.find((m: any) => m.id === modelId);

  // Reset dynamicParams when model changes
  useEffect(() => {
    if (selectedModel?.capabilities?.parameters) {
      const defaults: Record<string, any> = {};
      Object.entries(selectedModel.capabilities.parameters).forEach(([key, config]: [string, any]) => {
        if (config.default !== undefined) {
          defaults[key] = config.default;
        }
      });
      setDynamicParams(defaults);
    } else {
      setDynamicParams({});
    }
  }, [modelId, selectedModel]);

  const {
    data: effectsData,
    isLoading: isLoadingEffects
  } = useQuery({
    queryKey: ["videoEffects"],
    queryFn: () => apiService.get("/video/effects")
  });

  const {
    data: packagesData,
    isLoading: isLoadingPackages
  } = useQuery({
    queryKey: ["videoPackages"],
    queryFn: () => apiService.get("/video/effect-packages")
  });

  const {
    data: myVideosData,
    isLoading: isLoadingMyVideos
  } = useQuery({
    queryKey: ["myVideos"],
    queryFn: () => apiService.get("/video/my-videos"),
    refetchInterval: 10000
  });

  const {
    mutate: generateVideo,
    isPending: isGenerating,
    isError: isGenerateError,
    error: generateError
  } = useMutation({
    mutationFn: (data: any) => apiService.post("/video/generate", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setPrompt("");
    },
  });

  const {
    mutate: applyEffect,
    isPending: isApplyingEffect,
    isError: isEffectError,
    error: effectError
  } = useMutation({
    mutationFn: (data: any) => apiService.post("/video/effects/apply", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVideos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !modelId) {
      alert("Lütfen bir prompt girin ve model seçin.");
      return;
    }

    const payload: any = {
      prompt: prompt.trim(),
      model_id: modelId
    };

    // Use dynamic params if model has capabilities, otherwise use static values
    if (selectedModel?.capabilities?.parameters) {
      Object.assign(payload, dynamicParams);
    } else {
      payload.duration = parseInt(duration);
      payload.quality = quality;
    }

    generateVideo(payload);
  };

  const handleApplyEffect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectId || !imageFile) {
      alert("Lütfen bir efekt seçin ve görsel yükleyin.");
      return;
    }

    const formData = new FormData();
    formData.append('effect_id', effectId);
    formData.append('image', imageFile);
    if (imageFile2) {
      formData.append('image_2', imageFile2);
    }
    applyEffect(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <Terminal className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: "generate", name: "Video Üret", icon: Video },
    { id: "effects", name: "Efektler", icon: Sparkles },
    { id: "packages", name: "Efekt Paketleri", icon: Package },
    { id: "my-videos", name: "Videolarım", icon: FolderOpen },
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Video className="h-8 w-8 text-purple-600" />
        <h1 className="text-3xl font-bold">Video Üretimi</h1>
      </div>
      <p className="text-gray-600">43 model, 21 efekt ve 5 efekt paketi ile profesyonel videolar oluşturun.</p>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle>Video Üret</CardTitle>
          </CardHeader>
          <form onSubmit={handleGenerate}>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Açıklaması
                </label>
                <Textarea
                  placeholder="Oluşturmak istediğiniz videoyu tanımlayın... (Örn: A serene sunset over a calm ocean with gentle waves)"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  disabled={isGenerating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Türü
                  </label>
                  <Select onValueChange={setModelType} value={modelType} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text_to_video">Text to Video</SelectItem>
                      <SelectItem value="image_to_video">Image to Video</SelectItem>
                      <SelectItem value="video_to_video">Video to Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  {isLoadingModels ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select onValueChange={setModelId} value={modelId} disabled={isGenerating}>
                      <SelectTrigger>
                        <SelectValue placeholder="Model seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {(modelsData as any[])?.map((model: any) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{model.name}</span>
                              <div className="flex items-center space-x-1">
                                {model.badge && <span className="text-xs">{model.badge}</span>}
                                <span className="text-xs text-gray-500">{model.credits} kredi</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Dynamic Model Capabilities */}
                {selectedModel?.capabilities?.parameters ? (
                  <div className="col-span-2">
                    <ModelCapabilityForm
                      capabilities={selectedModel.capabilities}
                      values={dynamicParams}
                      onChange={(key, val) => setDynamicParams(prev => ({ ...prev, [key]: val }))}
                      disabled={isGenerating}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Süre (saniye)
                      </label>
                      <Select onValueChange={setDuration} value={duration} disabled={isGenerating}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 saniye</SelectItem>
                          <SelectItem value="5">5 saniye</SelectItem>
                          <SelectItem value="10">10 saniye</SelectItem>
                          <SelectItem value="15">15 saniye</SelectItem>
                          <SelectItem value="30">30 saniye</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kalite
                      </label>
                      <Select onValueChange={setQuality} value={quality} disabled={isGenerating}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standart</SelectItem>
                          <SelectItem value="high">Yüksek</SelectItem>
                          <SelectItem value="ultra">Ultra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isGenerating || !prompt || !modelId}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? "Üretiliyor..." : "Video Üret"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Effects Tab */}
      {activeTab === "effects" && (
        <Card>
          <CardHeader>
            <CardTitle>Video Efektleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingEffects ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))
              ) : (
                (effectsData as any[])?.map((effect: any) => (
                  <Card key={effect.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">{effect.icon}</div>
                        <h3 className="font-medium">{effect.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{effect.description}</p>
                        <p className="text-xs text-purple-600 mt-2">{effect.credits} kredi</p>
                        {effect.requires_two_images && (
                          <p className="text-xs text-orange-600 mt-1">2 görsel gerekli</p>
                        )}
                        {effect.example_url && (
                          <video
                            src={effect.example_url}
                            className="w-full h-20 object-cover rounded mt-2"
                            muted
                            loop
                            autoPlay
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <Card>
          <CardHeader>
            <CardTitle>Efekt Paketleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingPackages ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))
              ) : (
                (packagesData as any[])?.map((pkg: any) => (
                  <Card key={pkg.id} className="cursor-pointer hover:shadow-md transition-shadow border-2 border-purple-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-3xl mb-2">{pkg.icon}</div>
                        <h3 className="font-bold text-lg">{pkg.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                        <div className="mt-3">
                          <span className="text-lg font-bold text-purple-600">{pkg.total_credits} kredi</span>
                          <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            %{pkg.discount_percent} indirim
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {pkg.effects.length} efekt içerir
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Videos Tab */}
      {activeTab === "my-videos" && (
        <Card>
          <CardHeader>
            <CardTitle>Videolarım</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMyVideos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myVideosData?.data?.outputs?.map((video: any) => (
                  <div key={video.id} className="border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {video.status === 'completed' && video.file_url ? (
                        <video
                          controls
                          className="w-full h-full object-cover"
                          poster={video.thumbnail_url}
                        >
                          <source src={video.file_url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div className="text-center">
                          {getStatusIcon(video.status)}
                          <p className="text-sm text-gray-500 mt-2">
                            {video.status === 'processing' ? 'İşleniyor...' :
                              video.status === 'pending' ? 'Sırada...' :
                                video.status === 'failed' ? 'Başarısız' : 'İşleniyor'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                          {video.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(video.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                        {video.prompt}
                      </p>
                      <div className="flex items-center justify-between">
                        {video.credits_used && (
                          <span className="text-xs text-gray-500">
                            {video.credits_used} kredi
                          </span>
                        )}
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Star className={`w-4 h-4 ${video.is_showcase ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
                          </Button>
                          {video.file_url && (
                            <>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={video.file_url} download>
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )) || (
                    <p className="text-center text-gray-500 py-8 col-span-full">
                      Henüz video üretmediniz. Yukarıdaki sekmelerden video oluşturun!
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {(isGenerateError || isEffectError) && (
        <Alert className="border-red-200 bg-red-50">
          <Terminal className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">İşlem Başarısız</AlertTitle>
          <AlertDescription className="text-red-700">
            {(generateError as any)?.response?.data?.detail ||
              (effectError as any)?.response?.data?.detail ||
              "İşlem sırasında bir hata oluştu."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default VideoPageAdvanced;