import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Image as ImageIcon,
  Terminal,
  Settings,
  Sparkles,
  FolderOpen,
  Upload,
  Star,
  Download,
  Eye,
  Shuffle
} from "lucide-react";
import ModelComparePanel from "@/components/ModelComparePanel";

const ImageGenerationPageAdvanced = () => {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numImages, setNumImages] = useState(1);
  const [modelType, setModelType] = useState("text_to_image");
  const [toolId, setToolId] = useState("");
  const [generatorId, setGeneratorId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const {
    data: modelsData,
    isLoading: isLoadingModels
  } = useQuery({
    queryKey: ["imageModels", modelType],
    queryFn: () => apiService.get(`/image/models?type=${modelType}`)
  });

  const {
    data: toolsData,
    isLoading: isLoadingTools
  } = useQuery({
    queryKey: ["imageTools"],
    queryFn: () => apiService.get("/image/tools")
  });

  const {
    data: generatorsData,
    isLoading: isLoadingGenerators
  } = useQuery({
    queryKey: ["imageGenerators"],
    queryFn: () => apiService.get("/image/generators")
  });

  const {
    data: myImagesData,
    isLoading: isLoadingMyImages
  } = useQuery({
    queryKey: ["myImages"],
    queryFn: () => apiService.get("/image/my-images")
  });

  const {
    mutate: generateImage,
    isPending: isGenerating,
    isError: isGenerateError,
    error: generateError
  } = useMutation({
    mutationFn: (data: any) => apiService.post("/image/generate", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myImages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setPrompt("");
      setNegativePrompt("");
    },
  });

  const {
    mutate: applyTool,
    isPending: isApplyingTool,
    isError: isToolError,
    error: toolError
  } = useMutation({
    mutationFn: (data: any) => apiService.post("/image/tools/apply", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myImages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const {
    mutate: useGenerator,
    isPending: isUsingGenerator,
    isError: isGeneratorError,
    error: generatorError
  } = useMutation({
    mutationFn: (data: any) => apiService.post("/image/generators/create", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myImages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setPrompt("");
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !modelId) {
      alert("Lütfen bir prompt girin ve model seçin.");
      return;
    }
    generateImage({
      prompt: prompt.trim(),
      negative_prompt: negativePrompt.trim(),
      model_id: modelId,
      num_images: numImages,
      aspect_ratio: aspectRatio,
    });
  };

  const handleApplyTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolId || !imageFile) {
      alert("Lütfen bir araç seçin ve görsel yükleyin.");
      return;
    }
    const formData = new FormData();
    formData.append('tool_id', toolId);
    formData.append('image', imageFile);
    applyTool(formData);
  };

  const handleUseGenerator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !generatorId) {
      alert("Lütfen bir açıklama girin ve generator seçin.");
      return;
    }
    useGenerator({
      generator_id: generatorId,
      prompt: prompt.trim(),
    });
  };

  const tabs = [
    { id: "generate", name: "Görsel Üret", icon: ImageIcon },
    { id: "compare", name: "Karşılaştır", icon: Shuffle },
    { id: "tools", name: "Araçlar", icon: Settings },
    { id: "generators", name: "Özel Üreticiler", icon: Sparkles },
    { id: "my-images", name: "Görsellerim", icon: FolderOpen },
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <ImageIcon className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Görsel Üretimi</h1>
      </div>
      <p className="text-gray-600">40+ model, 10 araç ve 6 özel generator ile profesyonel görseller oluşturun.</p>

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
                    ? 'border-blue-500 text-blue-600'
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
            <CardTitle>Görsel Üret</CardTitle>
          </CardHeader>
          <form onSubmit={handleGenerate}>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt (Pozitif)
                  </label>
                  <Textarea
                    placeholder="Hayalinizdeki görseli tanımlayın... (Örn: A futuristic city with flying cars, cinematic lighting)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Prompt (İstemediğiniz özellikler)
                  </label>
                  <Textarea
                    placeholder="İstemediğiniz özellikler... (Örn: blurry, low quality, distorted)"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Türü
                  </label>
                  <Select onValueChange={setModelType} value={modelType} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text_to_image">Text to Image</SelectItem>
                      <SelectItem value="image_to_image">Image to Image</SelectItem>
                      <SelectItem value="controlnet">ControlNet</SelectItem>
                      <SelectItem value="specialized">Özelleşmiş</SelectItem>
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
                        {modelsData?.data?.map((model: any) => (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    En-Boy Oranı
                  </label>
                  <Select onValueChange={setAspectRatio} value={aspectRatio} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1 (Kare)</SelectItem>
                      <SelectItem value="16:9">16:9 (Yatay)</SelectItem>
                      <SelectItem value="9:16">9:16 (Dikey)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standart)</SelectItem>
                      <SelectItem value="3:2">3:2 (Fotoğraf)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Görsel Sayısı
                  </label>
                  <Select onValueChange={(v) => setNumImages(parseInt(v))} value={numImages.toString()} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Görsel</SelectItem>
                      <SelectItem value="2">2 Görsel</SelectItem>
                      <SelectItem value="3">3 Görsel</SelectItem>
                      <SelectItem value="4">4 Görsel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isGenerating || !prompt || !modelId}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? "Üretiliyor..." : "Görsel Üret"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Compare Tab */}
      {activeTab === "compare" && (
        <ModelComparePanel />
      )}

      {/* Tools Tab */}
      {activeTab === "tools" && (
        <Card>
          <CardHeader>
            <CardTitle>Görsel Araçları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingTools ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))
              ) : (
                toolsData?.data?.map((tool: any) => (
                  <Card key={tool.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">{tool.icon}</div>
                        <h3 className="font-medium">{tool.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                        <p className="text-xs text-blue-600 mt-2">{tool.credits} kredi</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generators Tab */}
      {activeTab === "generators" && (
        <Card>
          <CardHeader>
            <CardTitle>Özel Üreticiler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingGenerators ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))
              ) : (
                generatorsData?.data?.map((generator: any) => (
                  <Card key={generator.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">{generator.icon}</div>
                        <h3 className="font-medium">{generator.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{generator.description}</p>
                        <p className="text-xs text-blue-600 mt-2">{generator.credits} kredi</p>
                        {generator.example_url && (
                          <img
                            src={generator.example_url}
                            alt={generator.name}
                            className="w-full h-20 object-cover rounded mt-2"
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

      {/* My Images Tab */}
      {activeTab === "my-images" && (
        <Card>
          <CardHeader>
            <CardTitle>Görsellerim</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMyImages ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myImagesData?.data?.outputs?.map((image: any) => (
                  <div key={image.id} className="border rounded-lg overflow-hidden">
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={image.file_url}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                        {image.prompt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(image.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Star className={`w-4 h-4 ${image.is_showcase ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={image.file_url} download>
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )) || (
                    <p className="text-center text-gray-500 py-8 col-span-full">
                      Henüz görsel üretmediniz. Yukarıdaki sekmelerden görsel oluşturun!
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {(isGenerateError || isToolError || isGeneratorError) && (
        <Alert className="border-red-200 bg-red-50">
          <Terminal className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">İşlem Başarısız</AlertTitle>
          <AlertDescription className="text-red-700">
            {(generateError as any)?.response?.data?.detail ||
              (toolError as any)?.response?.data?.detail ||
              (generatorError as any)?.response?.data?.detail ||
              "İşlem sırasında bir hata oluştu."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImageGenerationPageAdvanced;