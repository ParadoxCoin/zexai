import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader2, Volume2, Music, Mic, Wand2, Download, 
  Clock, CheckCircle, Terminal, Eye, EyeOff 
} from "lucide-react";

const AudioPageAdvanced = () => {
  const [activeTab, setActiveTab] = useState("tts");
  const [text, setText] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState("1.0");
  const [pitch, setPitch] = useState("0");
  const queryClient = useQueryClient();

  const { data: ttsModels, isLoading: isLoadingTTS } = useQuery({
    queryKey: ["audioModels", "tts"],
    queryFn: () => apiService.get("/audio/models/tts")
  });

  const { data: userAudio, isLoading: isLoadingAudio } = useQuery({
    queryKey: ["userAudio"],
    queryFn: () => apiService.get("/audio/my-audio"),
    refetchInterval: 10000
  });

  const { mutate: generateTTS, isPending: isGeneratingTTS } = useMutation({
    mutationFn: (data: any) => apiService.post("/audio/tts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAudio"] });
      setText("");
    },
  });

  const { mutate: toggleShowcase } = useMutation({
    mutationFn: ({ id, isShowcase }: { id: string; isShowcase: boolean }) =>
      apiService.post(`/audio/my-audio/${id}/showcase`, { is_showcase: isShowcase }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userAudio"] });
    },
  });

  const handleTTSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedModel) return;
    
    generateTTS({
      text: text.trim(),
      model_id: selectedModel,
      voice: voice || "default",
      speed: parseFloat(speed),
      pitch: parseInt(pitch)
    });
  };

  const getQualityBadge = (quality: number) => {
    if (quality >= 9) return <Badge className="bg-purple-100 text-purple-800">Premium</Badge>;
    if (quality >= 7) return <Badge className="bg-blue-100 text-blue-800">High</Badge>;
    if (quality >= 5) return <Badge className="bg-green-100 text-green-800">Good</Badge>;
    return <Badge variant="secondary">Standard</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Volume2 className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Audio Generation</h1>
      </div>
      <p className="text-gray-600">Create high-quality audio content with AI-powered text-to-speech, music generation, and voice tools.</p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tts" className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4" />
            <span>Text-to-Speech</span>
          </TabsTrigger>
          <TabsTrigger value="music" className="flex items-center space-x-2">
            <Music className="h-4 w-4" />
            <span>Music</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center space-x-2">
            <Mic className="h-4 w-4" />
            <span>Voice Clone</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center space-x-2">
            <Wand2 className="h-4 w-4" />
            <span>My Audio</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Text-to-Speech Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTTSSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text to Convert
                  </label>
                  <Textarea
                    placeholder="Enter the text you want to convert to speech..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    disabled={isGeneratingTTS}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    {isLoadingTTS ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select onValueChange={setSelectedModel} value={selectedModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {ttsModels?.data?.map((model: any) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{model.name}</span>
                                <span className="text-xs text-gray-500 ml-2">{model.credits}c</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voice
                    </label>
                    <Select onValueChange={setVoice} value={voice}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Speed
                    </label>
                    <Select onValueChange={setSpeed} value={speed}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x (Slow)</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x (Fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pitch
                    </label>
                    <Select onValueChange={setPitch} value={pitch}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-2">-2 (Lower)</SelectItem>
                        <SelectItem value="-1">-1</SelectItem>
                        <SelectItem value="0">0 (Normal)</SelectItem>
                        <SelectItem value="1">+1</SelectItem>
                        <SelectItem value="2">+2 (Higher)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isGeneratingTTS || !text.trim() || !selectedModel}>
                  {isGeneratingTTS && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isGeneratingTTS ? "Generating..." : "Generate Speech"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available TTS Models</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTTS ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ttsModels?.data?.map((model: any) => (
                    <div key={model.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        {getQualityBadge(model.quality)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{model.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{model.provider}</span>
                        <span>{model.credits} credits</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="music" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Music Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Music Description
                  </label>
                  <Textarea
                    placeholder="Describe the music you want to create... (e.g., upbeat electronic dance music with heavy bass)"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Genre
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronic">Electronic</SelectItem>
                        <SelectItem value="pop">Pop</SelectItem>
                        <SelectItem value="rock">Rock</SelectItem>
                        <SelectItem value="jazz">Jazz</SelectItem>
                        <SelectItem value="classical">Classical</SelectItem>
                        <SelectItem value="ambient">Ambient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="musicgen">MusicGen (5 credits)</SelectItem>
                        <SelectItem value="stable_audio">Stable Audio (8 credits)</SelectItem>
                        <SelectItem value="riffusion">Riffusion (4 credits)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button type="submit">
                  <Music className="mr-2 h-4 w-4" />
                  Generate Music
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice Cloning</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice Sample Upload
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Mic className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload a voice sample (MP3, WAV)</p>
                    <p className="text-xs text-gray-500">Minimum 30 seconds for best results</p>
                    <Button variant="outline" className="mt-2">
                      Choose File
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice Name
                  </label>
                  <input
                    type="text"
                    placeholder="Give your cloned voice a name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Text
                  </label>
                  <Textarea
                    placeholder="Enter text to test your cloned voice..."
                    rows={3}
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Voice Cloning Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use clear, high-quality audio</li>
                    <li>• Minimum 30 seconds, maximum 5 minutes</li>
                    <li>• Avoid background noise</li>
                    <li>• Cost: 100 credits per voice clone</li>
                  </ul>
                </div>
                
                <Button type="submit">
                  <Mic className="mr-2 h-4 w-4" />
                  Clone Voice (100 credits)
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Audio Library</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAudio ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {userAudio?.data?.outputs?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userAudio.data.outputs.map((audio: any) => (
                        <div key={audio.id} className="border rounded-lg overflow-hidden">
                          <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <Volume2 className="h-12 w-12 text-blue-500" />
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(audio.status)}
                                <span className="text-sm font-medium capitalize">{audio.status}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(audio.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                              {audio.prompt || "Audio generation"}
                            </p>
                            {audio.status === 'completed' && audio.file_url && (
                              <div className="space-y-2">
                                <audio controls className="w-full">
                                  <source src={audio.file_url} type="audio/mpeg" />
                                  Your browser does not support the audio element.
                                </audio>
                                <div className="flex items-center justify-between">
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={audio.file_url} download>
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleShowcase({ 
                                      id: audio.id, 
                                      isShowcase: !audio.is_showcase 
                                    })}
                                  >
                                    {audio.is_showcase ? (
                                      <Eye className="h-3 w-3" />
                                    ) : (
                                      <EyeOff className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Volume2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No audio files generated yet.</p>
                      <p className="text-sm text-gray-400">Create your first audio using the tools above.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AudioPageAdvanced;