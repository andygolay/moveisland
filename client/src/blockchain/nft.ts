import { movement } from './wallet';
import { SUPPORTED_COLLECTIONS, COLLECTION_NAMES } from './constants';

export interface NFTData {
  tokenId: string;
  collectionId: string;
  collectionName: string;
  name: string;
  imageUrl: string;
  uri: string;
}

// Convert IPFS URL to HTTP gateway URL
function convertIpfsUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
}

// Check if URL is a direct image link
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

// Fetch NFT metadata from URI - handles both JSON metadata and direct image URLs
async function fetchNFTMetadata(uri: string): Promise<{ name?: string; image?: string }> {
  if (!uri) return {};

  const url = convertIpfsUrl(uri);

  // If URL looks like a direct image, use it as the image URL
  if (isImageUrl(url)) {
    console.log('URI is direct image:', url);
    return { image: url };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch metadata');

    // Check content type FIRST - if it's an image, use the URL directly
    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      console.log('URI returns image content-type:', url);
      return { image: url };
    }

    // Only try JSON if content-type suggests it's JSON or text
    if (contentType.includes('json') || contentType.includes('text')) {
      const data = await response.json();
      return {
        name: data.name || data.title,
        image: data.image || data.image_url || data.imageUrl,
      };
    }

    // For unknown content types, try to read as text first to check if it's JSON
    const text = await response.text();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const data = JSON.parse(text);
        return {
          name: data.name || data.title,
          image: data.image || data.image_url || data.imageUrl,
        };
      } catch {
        // Not valid JSON, treat URL as image
        console.log('Not valid JSON, using URL as image:', url);
        return { image: url };
      }
    }

    // Unknown content, assume it's an image
    console.log('Unknown content type, using URL as image:', url);
    return { image: url };
  } catch (error) {
    // If anything fails, the URI might be a direct image
    console.log('Error fetching metadata, using URL as image:', url, error);
    return { image: url };
  }
}

// Fetch owned NFTs from supported collections
export async function fetchOwnedNFTs(walletAddress: string): Promise<NFTData[]> {
  const nfts: NFTData[] = [];

  try {
    // Fetch all digital assets owned by the wallet
    const ownedTokens = await movement.getOwnedDigitalAssets({
      ownerAddress: walletAddress,
    });

    console.log('Owned tokens:', ownedTokens);

    // Filter to supported collections and fetch metadata
    const supportedCollectionIds = Object.values(SUPPORTED_COLLECTIONS);

    for (const token of ownedTokens) {
      const collectionId = token.current_token_data?.collection_id;

      // Check if this NFT is from a supported collection
      if (collectionId && supportedCollectionIds.includes(collectionId as any)) {
        const tokenData = token.current_token_data;

        if (tokenData) {
          console.log('Token data:', tokenData);

          // Fetch metadata from URI
          const metadata = await fetchNFTMetadata(tokenData.token_uri || '');

          // Use token_uri as fallback if no image found
          const imageUrl = metadata.image || tokenData.token_uri || '';

          nfts.push({
            tokenId: token.token_data_id || '',
            collectionId: collectionId,
            collectionName: COLLECTION_NAMES[collectionId] || 'Unknown',
            name: metadata.name || tokenData.token_name || 'Unnamed NFT',
            imageUrl: convertIpfsUrl(imageUrl),
            uri: tokenData.token_uri || '',
          });
        }
      }
    }

    return nfts;
  } catch (error) {
    console.error('Error fetching owned NFTs:', error);
    return [];
  }
}

// Fetch all NFTs (for testing without wallet)
export async function fetchAllCollectionNFTs(_collectionId: string, _limit: number = 10): Promise<NFTData[]> {
  // This would require indexer queries - for now return empty
  // In production, you'd query the Movement indexer
  return [];
}
