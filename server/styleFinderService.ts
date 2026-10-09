import { GoogleGenAI, Type } from '@google/genai';
import { Product } from '../src/types';

export interface StyleFinderQuizAnswers {
  gender: 'women' | 'men' | 'all';
  occasion: string;
  silhouette: string;
  fabricPreference: string;
  colorMood: string;
  budgetRange?: string;
}

export interface CuratedItemRecommendation {
  productId: string;
  stylingTip: string;
  matchReason: string;
  matchScore: number;
}

export interface StyleFinderResult {
  personaTitle: string;
  personaSubtitle: string;
  personaDescription: string;
  stylingAdvice: string[];
  outfitComboSuggestion: string;
  recommendedProducts: (Product & {
    stylingTip?: string;
    matchReason?: string;
    matchScore?: number;
  })[];
  aiGenerated: boolean;
}

export async function generateStyleFinderRecommendations(params: {
  answers: StyleFinderQuizAnswers;
  products: Product[];
}): Promise<StyleFinderResult> {
  const { answers, products } = params;
  const publishedProducts = products.filter((p) => p.status === 'Published');

  // Filter catalog loosely by gender if specified
  const candidatePool = publishedProducts.filter((p) => {
    if (answers.gender === 'women' && p.gender === 'men') return false;
    if (answers.gender === 'men' && p.gender === 'women') return false;
    return true;
  });

  const activeCandidates = candidatePool.length > 0 ? candidatePool : publishedProducts;

  const catalogDigest = activeCandidates.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    gender: p.gender,
    categories: p.categories,
    fabric: p.fabric,
    price: p.price,
    discountPrice: p.discountPrice,
    colors: p.colors.map((c) => c.name),
    drapeType: p.drapeType,
    keywords: p.searchKeywords,
  }));

  const apiKey = process.env.GEMINI_API_KEY;
  const hasValidKey =
    Boolean(apiKey) &&
    apiKey !== 'MY_GEMINI_API_KEY' &&
    apiKey!.trim().length > 10;

  if (hasValidKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are the lead AI Stylist for AHUZA ("Where Fashion Meets Passion"), a premium artisanal Indian clothing brand where every piece is made of 100% pure breathable fabrics (Jaipur Mulmul, Chanderi, Khadi) and strictly priced under ₹2,000 INR.

A customer has just completed our interactive 'Style Finder' Quiz with the following preferences:
- Target Wardrobe / Gender: ${answers.gender}
- Primary Occasion: ${answers.occasion}
- Preferred Silhouette: ${answers.silhouette}
- Fabric & Comfort Priority: ${answers.fabricPreference}
- Color & Aesthetic Mood: ${answers.colorMood}
- Budget Range: ${answers.budgetRange || 'Under ₹2,000'}

AVAILABLE AHUZA CATALOG (Select ONLY from these IDs):
${JSON.stringify(catalogDigest, null, 2)}

TASK:
1. Define a creative, elegant "Style Persona" title and description for this customer (e.g. "The Effortless Jaipur Minimalist", "Festive Chanderi Royal", "Breezy Contemporary Maven").
2. Select 3 to 5 matching product IDs from the catalog that best match their answers.
3. For each selected product, provide a concise, expert styling tip and reason for match.
4. Suggest a mix-and-match outfit combination.
5. Provide 2-3 practical everyday styling tips (footwear, jewelry, accessories, weather comfort).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              personaTitle: { type: Type.STRING },
              personaSubtitle: { type: Type.STRING },
              personaDescription: { type: Type.STRING },
              stylingAdvice: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              outfitComboSuggestion: { type: Type.STRING },
              recommendedItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productId: { type: Type.STRING },
                    stylingTip: { type: Type.STRING },
                    matchReason: { type: Type.STRING },
                    matchScore: { type: Type.NUMBER },
                  },
                  required: ['productId', 'stylingTip', 'matchReason', 'matchScore'],
                },
              },
            },
            required: [
              'personaTitle',
              'personaSubtitle',
              'personaDescription',
              'stylingAdvice',
              'outfitComboSuggestion',
              'recommendedItems',
            ],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const recommendedProducts: (Product & {
          stylingTip?: string;
          matchReason?: string;
          matchScore?: number;
        })[] = [];

        if (Array.isArray(parsed.recommendedItems)) {
          for (const item of parsed.recommendedItems) {
            const product = activeCandidates.find((p) => p.id === item.productId);
            if (product && !recommendedProducts.some((r) => r.id === product.id)) {
              recommendedProducts.push({
                ...product,
                stylingTip: item.stylingTip,
                matchReason: item.matchReason,
                matchScore: item.matchScore || 95,
              });
            }
          }
        }

        // If less than 2 valid products returned, supplement with fallback matches
        if (recommendedProducts.length < 2) {
          const fallbacks = activeCandidates.slice(0, 3);
          for (const fb of fallbacks) {
            if (!recommendedProducts.some((r) => r.id === fb.id)) {
              recommendedProducts.push({
                ...fb,
                stylingTip: `Pair this ${fb.fabric} silhouette with minimalist silver accents and leather juttis.`,
                matchReason: `Selected for ${answers.occasion} and breathable ${fb.fabric} comfort.`,
                matchScore: 90,
              });
            }
          }
        }

        return {
          personaTitle: parsed.personaTitle || 'The Jaipur Artisanal Connoisseur',
          personaSubtitle: parsed.personaSubtitle || 'Effortless everyday comfort crafted for Indian elegance',
          personaDescription:
            parsed.personaDescription ||
            `Your preferences lean toward timeless, breathable garments that carry royal heritage without synthetic weight.`,
          stylingAdvice:
            Array.isArray(parsed.stylingAdvice) && parsed.stylingAdvice.length > 0
              ? parsed.stylingAdvice
              : [
                  'Layer with a gossamer mulmul dupatta for instant festive elevation.',
                  'Style with hand-hammered oxidized silver jhumkis and kolhapuri flats.',
                  'Machine wash gently in cold water to preserve natural vegetable dyes.',
                ],
          outfitComboSuggestion:
            parsed.outfitComboSuggestion ||
            'Pair your favorite handblock kurti with tonal straight trousers and an unlined mulmul dupatta.',
          recommendedProducts,
          aiGenerated: true,
        };
      }
    } catch (error) {
      console.warn('Gemini style finder API failed, using intelligent rule-based styling:', error);
    }
  }

  // Fallback intelligent styling engine
  const scoredProducts = activeCandidates.map((product) => {
    let score = 70;
    const nameLower = product.name.toLowerCase();
    const fabricLower = product.fabric.toLowerCase();
    const keywordsLower = (product.searchKeywords || []).map((t: string) => t.toLowerCase());
    const categoriesLower = (product.categories || []).map((t: string) => t.toLowerCase());

    if (answers.fabricPreference && fabricLower.includes(answers.fabricPreference.toLowerCase().slice(0, 5))) {
      score += 15;
    }
    if (answers.silhouette && nameLower.includes(answers.silhouette.toLowerCase().slice(0, 5))) {
      score += 12;
    }
    if (
      answers.occasion &&
      (keywordsLower.some((t: string) => t.includes(answers.occasion.toLowerCase().slice(0, 5))) ||
        categoriesLower.some((t: string) => t.includes(answers.occasion.toLowerCase().slice(0, 5))))
    ) {
      score += 10;
    }
    return {
      product,
      score: Math.min(99, score),
    };
  });

  scoredProducts.sort((a, b) => b.score - a.score);
  const topMatches = scoredProducts.slice(0, 4);

  const fallbackRecommendations = topMatches.map((item, idx) => ({
    ...item.product,
    stylingTip:
      idx === 0
        ? 'Wear with subtle oxidized silver stud earrings and comfortable flat juttis for effortless everyday charm.'
        : idx === 1
        ? 'Complement with a contrasting handblock mulmul stole and a brass wrist cuff.'
        : 'Pair with cotton cigarette pants or palazzos for an airy, day-long silhouette.',
    matchReason: `Matches your preference for ${answers.occasion || 'versatile'} wear in breathable ${item.product.fabric}.`,
    matchScore: item.score,
  }));

  return {
    personaTitle:
      answers.silhouette.includes('Anarkali') || answers.occasion.includes('Festive')
        ? 'The Regal Heritage Classic'
        : answers.fabricPreference.includes('Mulmul')
        ? 'The Pure Mulmul Minimalist'
        : 'The Contemporary Loom Enthusiast',
    personaSubtitle: 'Curated silhouettes engineered for 14-hour comfort and timeless drape',
    personaDescription: `Based on your love for ${answers.fabricPreference || 'pure fabrics'} and ${answers.occasion || 'effortless'} dressing, this capsule collection celebrates pure artisan craftsmanship under our strict ₹2,000 price cap.`,
    stylingAdvice: [
      'Pair light pastel mulmuls with oxidized silver or handcrafted wooden jewelry.',
      'Allow the natural drape to breathe—skip restrictive inner slips in tropical heat.',
      'Fold and store in cotton bags to keep Jaipur block prints vibrant for years.',
    ],
    outfitComboSuggestion: `Combine the primary ${fallbackRecommendations[0]?.fabric || 'Jaipur Mulmul'} piece with comfortable mojaris and a minimalist fabric tote.`,
    recommendedProducts: fallbackRecommendations,
    aiGenerated: false,
  };
}
