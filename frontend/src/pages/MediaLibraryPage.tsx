import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, Loader2, Terminal, BadgeCheck, Coins, X } from "lucide-react";
import SocialButtons from "@/components/SocialButtons";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/components/ui/toast";

const ITEMS_PER_PAGE = 12;

const MediaLibraryPage = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { account, mintNFT } = useWeb3();

  const [mintOpen, setMintOpen] = useState(false);
  const [mintBusy, setMintBusy] = useState(false);
  const [mintItem, setMintItem] = useState<any | null>(null);
  const [mintUri, setMintUri] = useState("ipfs://");
  const [mintAmount, setMintAmount] = useState(1);

  const {
    data: mediaData,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['mediaLibrary', page],
    queryFn: () => apiService.get(`/media?page=${page}&size=${ITEMS_PER_PAGE}`),
    placeholderData: (previousData) => previousData
  });

  const { mutate: deleteMedia, isPending: isDeleting } = useMutation({
    mutationFn: (mediaId: string) => apiService.delete(`/media/${mediaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    },
  });

  const openMint = (item: any) => {
    setMintItem(item);
    const defaultUri =
      item?.metadata_uri ||
      item?.metadata_url ||
      item?.ipfs_uri ||
      item?.file_url ||
      item?.thumbnail_url ||
      "ipfs://";
    setMintUri(String(defaultUri));
    setMintAmount(1);
    setMintOpen(true);
  };

  const closeMint = () => {
    if (mintBusy) return;
    setMintOpen(false);
    setMintItem(null);
  };

  const handleMint = async () => {
    if (!account) {
      toast.info("Cüzdan", "Mint için önce cüzdan bağlamalısın.");
      return;
    }
    const uri = mintUri.trim();
    if (!uri) {
      toast.warning("URI", "Lütfen geçerli bir metadata URI gir.");
      return;
    }
    if (mintAmount < 1) {
      toast.warning("Adet", "Mint adedi en az 1 olmalı.");
      return;
    }

    setMintBusy(true);
    try {
      const ok = await mintNFT(uri, mintAmount);
      if (ok) {
        toast.success("Mint", "NFT mint işlemi başarılı.");
        closeMint();
      } else {
        toast.error("Mint", "Mint başarısız. MetaMask onaylarını ve ZEX bakiyeni kontrol et.");
      }
    } catch (e: any) {
      toast.error("Mint", e?.message || "Mint sırasında hata oluştu.");
    } finally {
      setMintBusy(false);
    }
  };

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

  const mediaItems = (mediaData as any)?.data?.items ?? [];
  const totalPages = (mediaData as any)?.data?.total_pages ?? 1;
  const getContentType = useMemo(() => {
    const allowed = new Set(["image", "video", "audio", "avatar"]);
    return (item: any): "image" | "video" | "audio" | "avatar" => {
      const t = String(item?.service_type || item?.content_type || item?.type || "image").toLowerCase();
      return (allowed.has(t) ? t : "image") as any;
    };
  }, []);

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
                <div className="flex items-center gap-1">
                  <SocialButtons
                    contentType={getContentType(item)}
                    contentId={String(item.id)}
                    contentUrl={item.file_url || item.thumbnail_url}
                    contentTitle="ZexAI ile oluşturdum!"
                    size="sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openMint(item)}
                    title="Bu içeriği NFT olarak mint et"
                  >
                    <Coins className="h-4 w-4 text-emerald-500" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMedia(item.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
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

      {/* Mint Modal */}
      {mintOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">NFT Mint</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Galerideki içeriği mintle (ZEX ile ücret).
                  </p>
                </div>
              </div>
              <button
                onClick={closeMint}
                disabled={mintBusy}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Metadata URI</p>
                <input
                  value={mintUri}
                  onChange={(e) => setMintUri(e.target.value)}
                  placeholder="ipfs://... veya https://..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  İdeal: IPFS’te JSON metadata (image, name, description).
                </p>
              </div>

              <div className="flex gap-3 items-end">
                <div className="w-32 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adet</p>
                  <input
                    type="number"
                    min={1}
                    value={mintAmount}
                    onChange={(e) => setMintAmount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex-1 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={closeMint}
                    disabled={mintBusy}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleMint}
                    disabled={mintBusy || !account}
                    className="flex-1"
                    title={!account ? "Önce cüzdan bağla" : undefined}
                  >
                    {mintBusy ? "Mint ediliyor..." : "Mint Et"}
                  </Button>
                </div>
              </div>

              {mintItem?.prompt && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <span className="font-semibold">Prompt:</span> {mintItem.prompt}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibraryPage;