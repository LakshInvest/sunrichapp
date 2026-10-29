import jar20l from "@/assets/products/jar-20l.jpg";
import bottle250Pack from "@/assets/products/bottle-250-pack.jpg";
import bottle500Pack from "@/assets/products/bottle-500-pack.jpg";
import bottle1lPack from "@/assets/products/bottle-1l-pack.jpg";
import bottle2lPack from "@/assets/products/bottle-2l-pack.jpg";
import can5l from "@/assets/products/can-5l.jpg";
import beverageLemonPack from "@/assets/products/beverage-lemon-pack.jpg";
import beverageOrangePack from "@/assets/products/beverage-orange-pack.jpg";

/**
 * Single source of truth for everything the Home screen shows.
 * The shape mirrors the future database tables (hero, banners, categories,
 * products, sections), so this file can later be swapped for Supabase reads
 * without changing the Home design. No database tables are created now.
 */

export type LocalizedText = { en: string; hi: string; mr: string };

export type SectionKey = "hero" | "categories" | "banners" | "popular";

export type HeroContent = {
  backgroundImageUrl: string | null;
  productImageUrl: string;
  greeting: LocalizedText;
  deliveryLine: LocalizedText;
};

export type Banner = {
  id: string;
  imageUrl: string | null;
  title: LocalizedText;
  subtitle: LocalizedText;
  tag: LocalizedText | null;
  sortOrder: number;
  isActive: boolean;
};

export type Category = {
  id: string;
  code: string;
  iconKey: "grid" | "jar" | "bottle" | "box" | "glass";
  name: LocalizedText;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  categoryCode: string;
  imageUrl: string;
  name: LocalizedText;
  packLabel: LocalizedText;
  price: number;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type Section = { key: SectionKey; sortOrder: number; isActive: boolean };

export const homeContent: {
  hero: HeroContent;
  banners: Banner[];
  categories: Category[];
  products: Product[];
  sections: Section[];
} = {
  hero: {
    backgroundImageUrl: null,
    productImageUrl: jar20l,
    greeting: {
      en: "Pure water, at your door",
      hi: "शुद्ध पानी, आपके द्वार पर",
      mr: "शुद्ध पाणी, तुमच्या दारापाशी",
    },
    deliveryLine: {
      en: "Delivery today by 6 PM",
      hi: "आज शाम 6 बजे तक डिलीवरी",
      mr: "आज संध्याकाळी ६ पर्यंत डिलिव्हरी",
    },
  },

  banners: [
    {
      id: "banner-subscribe",
      imageUrl: null,
      title: {
        en: "Daily jar delivery – Subscribe and never run out",
        hi: "रोज़ जार डिलीवरी – सब्सक्राइब करें, कभी खत्म न हों",
        mr: "रोज जार डिलिव्हरी – सबस्क्राइब करा, कधीही संपू नये",
      },
      subtitle: {
        en: "Fresh jars every morning",
        hi: "हर सुबह ताज़े जार",
        mr: "रोज सकाळी ताजे जार",
      },
      tag: { en: "Coming soon", hi: "जल्द आ रहा है", mr: "लवकरच येत आहे" },
      sortOrder: 1,
      isActive: true,
    },
    {
      id: "banner-bulk",
      imageUrl: null,
      title: { en: "Bulk orders for shops", hi: "दुकानों के लिए थोक ऑर्डर", mr: "दुकानांसाठी घस्ता ऑर्डर" },
      subtitle: { en: "Special rates on cases", hi: "केस पर विशेष दरें", mr: "केसवर विशेष दर" },
      tag: null,
      sortOrder: 2,
      isActive: true,
    },
    {
      id: "banner-whatsapp",
      imageUrl: null,
      title: { en: "Order on WhatsApp", hi: "WhatsApp पर ऑर्डर करें", mr: "WhatsApp वर ऑर्डर करा" },
      subtitle: { en: "Quick orders on chat", hi: "चैट पर तुरंत ऑर्डर", mr: "चॅटवर झटपट ऑर्डर" },
      tag: null,
      sortOrder: 3,
      isActive: true,
    },
  ],

  categories: [
    {
      id: "cat-jars",
      code: "jars",
      iconKey: "jar",
      name: { en: "Jars", hi: "जार", mr: "जार" },
      sortOrder: 1,
      isActive: true,
    },
    {
      id: "cat-bottles",
      code: "bottles",
      iconKey: "bottle",
      name: { en: "Bottles", hi: "बोतलें", mr: "बाटल्या" },
      sortOrder: 2,
      isActive: true,
    },
    {
      id: "cat-bulk",
      code: "bulk",
      iconKey: "box",
      name: { en: "Bulk / Cases", hi: "थोक / केस", mr: "घस्ता / केस" },
      sortOrder: 3,
      isActive: true,
    },
    {
      id: "cat-beverages",
      code: "beverages",
      iconKey: "glass",
      name: { en: "Beverages", hi: "पेय पदार्थ", mr: "पेये" },
      sortOrder: 4,
      isActive: true,
    },
  ],

  products: [
    {
      id: "jar-20l",
      categoryCode: "jars",
      imageUrl: jar20l,
      price: 80,
      isPopular: true,
      sortOrder: 1,
      isActive: true,
      name: { en: "20 L Water Jar", hi: "20 लीटर पानी का जार", mr: "20 लिटर पाण्याचा जार" },
      packLabel: { en: "Single jar", hi: "एक जार", mr: "एक जार" },
    },
    {
      id: "bottle-250",
      categoryCode: "bottles",
      imageUrl: bottle250Pack,
      price: 120,
      isPopular: false,
      sortOrder: 2,
      isActive: true,
      name: { en: "250 ml Bottle", hi: "250 मि.ली. बोतल", mr: "250 मि.ली. बाटल" },
      packLabel: { en: "Pack of 24", hi: "24 का पैक", mr: "२४ चा पॅक" },
    },
    {
      id: "bottle-500",
      categoryCode: "bottles",
      imageUrl: bottle500Pack,
      price: 180,
      isPopular: true,
      sortOrder: 3,
      isActive: true,
      name: { en: "500 ml Bottle", hi: "500 मि.ली. बोतल", mr: "500 मि.ली. बाटल" },
      packLabel: { en: "Pack of 24", hi: "24 का पैक", mr: "२४ चा पॅक" },
    },
    {
      id: "bottle-1l",
      categoryCode: "bottles",
      imageUrl: bottle1lPack,
      price: 200,
      isPopular: true,
      sortOrder: 4,
      isActive: true,
      name: { en: "1 L Bottle", hi: "1 लीटर बोतल", mr: "1 लिटर बाटल" },
      packLabel: { en: "Pack of 12", hi: "12 का पैक", mr: "१२ चा पॅक" },
    },
    {
      id: "bottle-2l",
      categoryCode: "bottles",
      imageUrl: bottle2lPack,
      price: 270,
      isPopular: false,
      sortOrder: 5,
      isActive: true,
      name: { en: "2 L Bottle", hi: "2 लीटर बोतल", mr: "2 लिटर बाटल" },
      packLabel: { en: "Pack of 9", hi: "9 का पैक", mr: "९ चा पॅक" },
    },
    {
      id: "can-5l",
      categoryCode: "bulk",
      imageUrl: can5l,
      price: 55,
      isPopular: true,
      sortOrder: 6,
      isActive: true,
      name: { en: "5 L Water Can", hi: "5 लीटर पानी का कैन", mr: "5 लिटर पाण्याचा कॅन" },
      packLabel: { en: "Single can", hi: "एक कैन", mr: "एक कॅन" },
    },
    {
      id: "beverage-lemon",
      categoryCode: "beverages",
      imageUrl: beverageLemonPack,
      price: 90,
      isPopular: false,
      sortOrder: 7,
      isActive: true,
      name: {
        en: "Lemon Fizz Sparkling Water",
        hi: "लेमन फ़िज़ स्पार्कलिंग वाटर",
        mr: "लेमन फिझ स्पार्कलिंग वाटर",
      },
      packLabel: { en: "Pack of 6", hi: "6 का पैक", mr: "६ चा पॅक" },
    },
    {
      id: "beverage-orange",
      categoryCode: "beverages",
      imageUrl: beverageOrangePack,
      price: 90,
      isPopular: false,
      sortOrder: 8,
      isActive: true,
      name: {
        en: "Orange Fizz Sparkling Water",
        hi: "ऑरेंज फ़िज़ स्पार्कलिंग वाटर",
        mr: "ऑरेंज फिझ स्पार्कलिंग वाटर",
      },
      packLabel: { en: "Pack of 6", hi: "6 का पैक", mr: "६ चा पॅक" },
    },
  ],

  sections: [
    { key: "hero", sortOrder: 1, isActive: true },
    { key: "categories", sortOrder: 2, isActive: true },
    { key: "banners", sortOrder: 3, isActive: true },
    { key: "popular", sortOrder: 4, isActive: true },
  ],
};

/** Reads a localized {en, hi, mr} field in the chosen language, falling back to English. */
export function pick(text: LocalizedText, lang: string): string {
  if (lang === "hi") return text.hi || text.en;
  if (lang === "mr") return text.mr || text.en;
  return text.en;
}
