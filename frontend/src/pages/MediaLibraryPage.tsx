import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, Star, Loader2, Terminal } from "lucide-react";

const ITEMS_PER_PAGE = 12;

const MediaLibraryPage = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { 
    data: mediaData, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['mediaLibrary', page],
    queryFn: () => apiService.get(`/media?page=${page}&size=${ITEMS_PER_PAGE}`),
    keepPreviousData: true
  });

  const { mutate: deleteMedia, isPending: isDeleting } = useMutation({
    mutationFn: (mediaId: string) => apiService.delete(`/media/${mediaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    },
  });

  const { mutate: toggleShowcase, isPending: isToggling } = useMutation({
    mutationFn: (params: { mediaId: string; isShowcase: boolean }) => 
      apiService.put(`/media/${params.mediaId}/showcase`, { is_showcase: !params.isShowcase }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    },
  });

  if (isError) {
    return (
      <Alert className="m-4 border-red-200 bg-red-50">
        <Terminal className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Hata!</AlertTitle>
        <AlertDescription className="text-red-700">
          Medya kütüphanesi yüklenirken bir sorun oluştu.
        </AlertDescription>
      </Alert>
    );
  }

  const mediaItems = mediaData?.data?.items ?? [];
  const totalPages = mediaData?.data?.total_pages ?? 1;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Medya Kütüphanesi</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))
          : mediaItems.map((item: any) => (
              <Card key={item.id} className="overflow-hidden group">
                <CardContent className="p-0 relative">
                  <img src={item.thumbnail_url || item.file_url} alt={item.prompt} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                      <p className="text-white text-xs text-center line-clamp-3">{item.prompt}</p>
                  </div>
                </CardContent>
                <CardFooter className="p-2 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleShowcase({ mediaId: item.id, isShowcase: item.is_showcase })}
                    disabled={isToggling}
                  >
                    <Star className={`h-4 w-4 ${item.is_showcase ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMedia(item.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-red-500" />}
                  </Button>
                </CardFooter>
              </Card>
            ))}
      </div>

      {mediaItems.length === 0 && !isLoading && (
        <p className="text-center text-gray-500">Kütüphanenizde henüz medya bulunmuyor.</p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
            Önceki
          </Button>
          <span>Sayfa {page} / {totalPages}</span>
          <Button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
};

export default MediaLibraryPage;