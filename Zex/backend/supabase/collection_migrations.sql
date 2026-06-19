-- SQL Migration for AI NFT Collection Factory

-- 1. Create the Collections Table
CREATE TABLE IF NOT EXISTS public.nft_collections (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    description TEXT,
    max_supply INTEGER NOT NULL,
    mint_price DECIMAL DEFAULT 0.0,
    royalty_bps INTEGER DEFAULT 500,
    cover_url TEXT,
    banner_url TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    contract_address VARCHAR(42),
    base_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Establish RLS (Row Level Security) for collections
ALTER TABLE public.nft_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections" 
ON public.nft_collections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections" 
ON public.nft_collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
ON public.nft_collections FOR UPDATE 
USING (auth.uid() = user_id);


-- 2. Create the Collection Items Table
CREATE TABLE IF NOT EXISTS public.nft_collection_items (
    id UUID PRIMARY KEY,
    collection_id UUID REFERENCES public.nft_collections(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    attributes JSONB DEFAULT '[]'::jsonb,
    rarity_score DECIMAL,
    rarity_tier VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Ensure item index is unique per collection
    UNIQUE(collection_id, item_index)
);

-- Establish RLS for collection items
ALTER TABLE public.nft_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in their collections" 
ON public.nft_collection_items FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.nft_collections 
        WHERE id = nft_collection_items.collection_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert items to their collections" 
ON public.nft_collection_items FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.nft_collections 
        WHERE id = nft_collection_items.collection_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update items in their collections" 
ON public.nft_collection_items FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.nft_collections 
        WHERE id = nft_collection_items.collection_id 
        AND user_id = auth.uid()
    )
);
