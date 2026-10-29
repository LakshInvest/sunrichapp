import jar20l from "@/assets/products/jar-20l.jpg";
import bottle250Pack from "@/assets/products/bottle-250-pack.jpg";
import bottle500Pack from "@/assets/products/bottle-500-pack.jpg";
import bottle1lPack from "@/assets/products/bottle-1l-pack.jpg";
import bottle2lPack from "@/assets/products/bottle-2l-pack.jpg";
import can5l from "@/assets/products/can-5l.jpg";
import beverageLemonPack from "@/assets/products/beverage-lemon-pack.jpg";
import beverageOrangePack from "@/assets/products/beverage-orange-pack.jpg";

/**
 * Temporary sample catalog shown on the Home screen until the products
 * table exists in the backend. Swapping this file for a database read
 * later is the only change needed.
 */

export type ProductCategory = "jars" | "bottles" | "bulk" | "beverages";

export type LocalizedText = { en: string; hi: string; mr: string };

export type Product = {
  id: string;
  category: ProductCategory;
  price: number;
  image: string;
  name: LocalizedText;
  packSize: LocalizedText;
};

export const sampleProducts: Product[] = [
  {
    id: "jar-20l",
    category: "jars",
    price: 80,
    image: jar20l,
    name: { en: "20 L Water Jar", hi: "20 लीटर पानी का जार", mr: "20 लिटर पाण्याचा जार" },
    packSize: { en: "Single jar", hi: "एक जार", mr: "एक जार" },
  },
  {
    id: "bottle-250",
    category: "bottles",
    price: 120,
    image: bottle250Pack,
    name: { en: "250 ml Bottle", hi: "250 मि.ली. बोतल", mr: "250 मि.ली. बाटल" },
    packSize: { en: "Pack of 24", hi: "24 का पैक", mr: "२४ चा पॅक" },
  },
  {
    id: "bottle-500",
    category: "bottles",
    price: 180,
    image: bottle500Pack,
    name: { en: "500 ml Bottle", hi: "500 मि.ली. बोतल", mr: "500 मि.ली. बाटल" },
    packSize: { en: "Pack of 24", hi: "24 का पैक", mr: "२४ चा पॅक" },
  },
  {
    id: "bottle-1l",
    category: "bottles",
    price: 200,
    image: bottle1lPack,
    name: { en: "1 L Bottle", hi: "1 लीटर बोतल", mr: "1 लिटर बाटल" },
    packSize: { en: "Pack of 12", hi: "12 का पैक", mr: "१२ चा पॅक" },
  },
  {
    id: "bottle-2l",
    category: "bottles",
    price: 270,
    image: bottle2lPack,
    name: { en: "2 L Bottle", hi: "2 लीटर बोतल", mr: "2 लिटर बाटल" },
    packSize: { en: "Pack of 9", hi: "9 का पैक", mr: "९ चा पॅक" },
  },
  {
    id: "can-5l",
    category: "bulk",
    price: 55,
    image: can5l,
    name: { en: "5 L Water Can", hi: "5 लीटर पानी का कैन", mr: "5 लिटर पाण्याचा कॅन" },
    packSize: { en: "Single can", hi: "एक कैन", mr: "एक कॅन" },
  },
  {
    id: "beverage-lemon",
    category: "beverages",
    price: 90,
    image: beverageLemonPack,
    name: {
      en: "Lemon Fizz Sparkling Water",
      hi: "लेमन फ़िज़ स्पार्कलिंग वाटर",
      mr: "लेमन फिझ स्पार्कलिंग वाटर",
    },
    packSize: { en: "Pack of 6", hi: "6 का पैक", mr: "६ चा पॅक" },
  },
  {
    id: "beverage-orange",
    category: "beverages",
    price: 90,
    image: beverageOrangePack,
    name: {
      en: "Orange Fizz Sparkling Water",
      hi: "ऑरेंज फ़िज़ स्पार्कलिंग वाटर",
      mr: "ऑरेंज फिझ स्पार्कलिंग वाटर",
    },
    packSize: { en: "Pack of 6", hi: "6 का पैक", mr: "६ चा पॅक" },
  },
];

export function localizedName(product: Product, lang: string): string {
  if (lang === "hi") return product.name.hi || product.name.en;
  if (lang === "mr") return product.name.mr || product.name.en;
  return product.name.en;
}

export function localizedPackSize(product: Product, lang: string): string {
  if (lang === "hi") return product.packSize.hi || product.packSize.en;
  if (lang === "mr") return product.packSize.mr || product.packSize.en;
  return product.packSize.en;
}
