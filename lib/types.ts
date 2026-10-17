export type Variant = { sku: string; size: string; colour: string; stock: number };
export type ProductImage = { id: string; alt: string; url?: string };
export type Product = {
  id: string; slug: string; name: string; description: string;
  category: string; collections: string[];
  price: number; salePrice?: number; // INR, whole rupees
  images: ProductImage[]; variants: Variant[];
  attributes: { fabric?: string; fit?: string; care?: string };
  featured: boolean; newArrival: boolean; bestseller: boolean;
  status: "active" | "inactive"; createdAt: string;
  devData?: boolean; // true = placeholder record, not real inventory
};
